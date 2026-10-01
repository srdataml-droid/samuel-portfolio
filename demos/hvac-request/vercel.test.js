import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { startFakeGoogle } from './fakes.js';
import { COLUMNS } from './sheets.js';

/**
 * The Vercel functions in api/, end to end, with the Google Sheet as the store.
 *
 * A stand-in for Vercel's router sends each URL to the matching api/ file.
 * mode 'rewritten' hands the function the URL the way a rewrite might
 * (/api/leads/[ref]/[action]?ref=..&action=..); 'original' leaves it as sent.
 * Bodies are pre-parsed into req.body, like Vercel's helper, which throws on
 * malformed JSON when read.
 */

const request = {
  name: 'Dana Whitfield', phone: '(312) 555-0188', email: 'dana@example.com',
  service: 'ac_repair', description: 'AC blowing warm air since this morning.',
  urgency: 'soon', preferredDate: '', preferredWindow: 'morning',
};

let google;
before(async () => { google = await startFakeGoogle(); });
after(() => google.close());

test('api/ functions: customer submits, office works the lead, the sheet keeps up', async (t) => {
  Object.assign(process.env, google.env(), { VERCEL: '1', OFFICE_TOKEN: 'office-pw', WEBHOOK_URL: '' });
  const routes = [
    [/^\/api\/requests$/, (await import('./api/requests.js')).default, () => '/api/requests'],
    [/^\/api\/leads$/, (await import('./api/leads/index.js')).default, () => '/api/leads'],
    [/^\/api\/leads\/([^/]+)$/, (await import('./api/leads/[ref].js')).default, (m) => `/api/leads/[ref]?ref=${m[1]}`],
    [/^\/api\/leads\/([^/]+)\/([^/]+)$/, (await import('./api/leads/[ref]/[action].js')).default,
      (m) => `/api/leads/[ref]/[action]?ref=${m[1]}&action=${m[2]}`],
  ];
  const vercel = { mode: 'rewritten' };
  const platform = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const route = routes.find(([re]) => re.test(url.pathname));
    if (!route) { res.writeHead(404); return res.end(); }
    const [re, fn, dest] = route;
    if (vercel.mode === 'rewritten') {
      const to = dest(url.pathname.match(re));
      req.url = url.search ? `${to}${to.includes('?') ? '&' : '?'}${url.search.slice(1)}` : to;
    }
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      Object.defineProperty(req, 'body', { get: () => JSON.parse(raw) });
    }
    return fn(req, res);
  }).listen(0);
  const base = `http://127.0.0.1:${platform.address().port}`;
  const errors = [];
  t.mock.method(console, 'error', (m) => errors.push(String(m)));
  t.mock.method(console, 'log', () => {});
  t.after(() => { platform.close(); delete process.env.VERCEL; });

  const submit = (body) => fetch(`${base}/api/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request, ...body }),
  });
  const office = (path, body) => fetch(`${base}/api/leads${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer office-pw', 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const rowFor = (ref) => google.state.grid.find((r) => r[0] === ref);
  const col = (row, name) => row[COLUMNS.indexOf(name)];

  // 1. Customer submits: the row is in the sheet before they're told it was sent.
  const res = await submit({});
  assert.equal(res.status, 201);
  const { reference } = await res.json();
  assert.equal(col(rowFor(reference), 'Lead Status'), 'New');

  // 2. The office screen reads it from the sheet (URL as sent this time).
  vercel.mode = 'original';
  const board = await (await office('?all=1')).json();
  assert.equal(board.count, 1);
  assert.equal(board.stats.newLeads, 1);
  assert.deepEqual(board.leads[0].actions, ['contact', 'qualify', 'book', 'lost']);
  assert.equal((await (await office(`/${reference}`)).json()).lead.reference, reference);

  // 3. Owner marks it contacted, then qualified (rewritten URLs): the same row updates.
  vercel.mode = 'rewritten';
  assert.equal((await (await office(`/${reference}/contact`, { outcome: 'reached', by: 'Maria' })).json()).lead.leadStatus, 'contacted');
  const qualified = await (await office(`/${reference}/qualify`, {})).json();
  assert.equal(qualified.lead.leadStatus, 'qualified');
  assert.equal(google.state.grid.length, 2, 'header + one row, no duplicate');
  assert.equal(col(rowFor(reference), 'Lead Status'), 'Qualified');
  assert.equal(col(rowFor(reference), 'Follow-up Needed'), 'Yes');

  // 4. A move the rules forbid is refused, and the sheet is untouched.
  const before = JSON.stringify(google.state.grid);
  assert.equal((await office(`/${reference}/complete`, {})).status, 409);
  assert.equal(JSON.stringify(google.state.grid), before);

  // 5. Bad JSON from a client is a 400, not a crash.
  const bad = await fetch(`${base}/api/leads/${reference}/contact`, {
    method: 'POST', headers: { Authorization: 'Bearer office-pw' }, body: '{not json',
  });
  assert.equal(bad.status, 400);

  // 6. Google down: the customer is NOT told it was sent; the page asks them to call.
  google.state.down = true;
  const failed = await submit({ name: 'Ray Ortiz' });
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).error, 'Lead storage is unavailable. Please try again.');
  assert.ok(errors.some((e) => e.startsWith('[sheet] ')), 'the reason is logged');
  assert.equal((await office('?all=1')).status, 503);

  // 7. Google back: everything works again, nothing duplicated.
  google.state.down = false;
  assert.equal((await submit({ name: 'Ray Ortiz' })).status, 201);
  assert.equal(google.state.grid.length, 3);
});
