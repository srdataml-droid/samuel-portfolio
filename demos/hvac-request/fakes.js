/**
 * Stand-ins for Google and Supabase, used by the tests only. Each is a small
 * local HTTP server that answers the exact calls the app makes and checks
 * them the way the real service would (signed sign-in, keys, RAW writes).
 */
import { createServer } from 'node:http';
import { createVerify, generateKeyPairSync } from 'node:crypto';

const listen = (handler) => new Promise((resolve) => {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => handler(req, res, body));
  }).listen(0, () => resolve(server));
});

const reply = (res) => (status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(data === undefined ? '' : JSON.stringify(data));
};

// ---- Google: token endpoint + the three Sheets calls, one sheet, tab "Leads"

export async function startFakeGoogle() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const email = 'hvac-demo@example-project.iam.gserviceaccount.com';
  const state = {
    grid: [],     // the sheet: grid[0] is row 1
    down: false,  // answer everything with 503
    writes: [],   // valueInputOption of every write
  };

  const server = await listen((req, res, body) => {
    const send = reply(res);
    if (state.down) return send(503, { error: { message: 'The service is currently unavailable.' } });
    const url = new URL(req.url, 'http://x');

    if (url.pathname === '/token') {
      const assertion = new URLSearchParams(body).get('assertion') || '';
      const [h, c, sig] = assertion.split('.');
      const valid = createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, sig, 'base64url');
      const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
      if (!valid || claims.iss !== email || !claims.scope.includes('spreadsheets'))
        return send(400, { error: 'invalid_grant' });
      return send(200, { access_token: 'good-token', expires_in: 3600 });
    }

    if (req.headers.authorization !== 'Bearer good-token') return send(401, { error: { message: 'unauthenticated' } });
    const m = decodeURIComponent(url.pathname).match(/^\/v4\/spreadsheets\/sheet-123\/values\/'Leads'!([^:]+(?::[A-Z]+\d*)?)(:append)?$/);
    if (!m) return send(400, { error: { message: `Unable to parse range: ${url.pathname}` } });
    const [, range, append] = m;

    if (req.method === 'GET') {
      if (range === 'A1:R1') return send(200, { values: state.grid.length ? [state.grid[0]] : undefined });
      if (range === 'A:A') return send(200, { values: state.grid.map((r) => (r[0] ? [r[0]] : [])) });
    }
    state.writes.push(url.searchParams.get('valueInputOption'));
    if (url.searchParams.get('valueInputOption') !== 'RAW') return send(400, { error: { message: 'expected RAW' } });
    const { values } = JSON.parse(body);
    if (req.method === 'POST' && append) { state.grid.push(values[0]); return send(200, {}); }
    const row = Number(range.match(/^A(\d+)/)?.[1]);
    if (req.method === 'PUT' && row) { state.grid[row - 1] = values[0]; return send(200, {}); }
    return send(400, { error: { message: 'unexpected call' } });
  });

  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    state,
    email,
    pem,
    url,
    /** The GOOGLE_* settings pointing at this fake, key stored with literal "\n"s like a hosting dashboard. */
    env: () => ({
      GOOGLE_SHEET_ID: 'sheet-123',
      GOOGLE_SERVICE_ACCOUNT_EMAIL: email,
      GOOGLE_PRIVATE_KEY: pem.replace(/\n/g, '\\n'),
      GOOGLE_SHEETS_API_URL: url,
      GOOGLE_TOKEN_URL: `${url}/token`,
    }),
    reset() { state.grid = []; state.down = false; state.writes = []; },
    close: () => server.close(),
  };
}

// ---- Supabase: the REST (PostgREST) calls store-supabase.js makes on hvac_demo_leads

export async function startFakeSupabase({ key = 'sb_secret_test-key' } = {}) {
  const state = {
    rows: new Map(),  // id -> { id, reference, data, created_at, updated_at, sheet_synced_at }
    down: false,
    requests: [],
  };

  const server = await listen((req, res, body) => {
    const send = reply(res);
    state.requests.push({ method: req.method, url: req.url, headers: req.headers });
    if (state.down) return send(503, { message: 'upstream unavailable' });
    // New sb_secret_ keys go in apikey only; old JWT keys also in Authorization.
    if (req.headers.apikey !== key) return send(401, { message: 'Invalid API key' });
    const wantAuth = key.startsWith('eyJ') ? `Bearer ${key}` : undefined;
    if (req.headers.authorization !== wantAuth) return send(401, { message: 'Unexpected Authorization header' });

    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/rest/v1/hvac_demo_leads') return send(404, { message: 'relation does not exist' });
    const q = url.searchParams;

    const filters = [];
    for (const [column, value] of q) {
      if (['select', 'order', 'limit', 'on_conflict'].includes(column)) continue;
      const [op, ...rest] = value.split('.');
      const operand = rest.join('.');
      if (op === 'eq') filters.push((row) => String(row[column]) === operand);
      else if (op === 'is' && operand === 'null') filters.push((row) => row[column] == null);
      else if (op === 'lt') filters.push((row) => row[column] != null && new Date(row[column]) < new Date(operand));
      else return send(400, { message: `fake does not support ${column}=${value}` });
    }
    const matches = (row) => filters.every((f) => f(row));

    if (req.method === 'GET') {
      if (q.get('select') !== 'data') return send(400, { message: 'expected select=data' });
      let list = [...state.rows.values()].filter(matches);
      if (q.get('order')) {
        const [column, dir] = q.get('order').split('.');
        list.sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
      }
      if (q.get('limit')) list = list.slice(0, Number(q.get('limit')));
      return send(200, list.map((row) => ({ data: row.data })));
    }

    if (req.method === 'POST') {
      if (q.get('on_conflict') !== 'id' || !/resolution=merge-duplicates/.test(req.headers.prefer || ''))
        return send(400, { message: 'expected an upsert on id' });
      const row = JSON.parse(body);
      for (const other of state.rows.values())
        if (other.reference === row.reference && other.id !== row.id)
          return send(409, { message: 'duplicate key value violates unique constraint "hvac_demo_leads_reference_key"' });
      state.rows.set(row.id, { ...state.rows.get(row.id), ...row });
      return send(201);
    }

    if (req.method === 'PATCH') {
      const patch = JSON.parse(body);
      for (const row of state.rows.values()) if (matches(row)) Object.assign(row, patch);
      return send(204);
    }

    return send(405, { message: 'method not allowed' });
  });

  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    state,
    key,
    url,
    env: () => ({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key }),
    reset() { state.rows.clear(); state.down = false; state.requests = []; },
    close: () => server.close(),
  };
}
