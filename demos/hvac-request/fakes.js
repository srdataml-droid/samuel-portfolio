/**
 * A stand-in for Google, used by the tests only: a small local HTTP server
 * that answers the exact calls the app makes and checks them the way Google
 * would (signed sign-in, access token, plain-text RAW writes).
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
      if (range === 'A1:S1') return send(200, { values: state.grid.length ? [state.grid[0]] : undefined });
      if (range === 'A:A') return send(200, { values: state.grid.map((r) => (r[0] ? [r[0]] : [])) });
      if (range === 'A2:S') return send(200, { values: state.grid.slice(1) });
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
