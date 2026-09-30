import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFakeGoogle, startFakeSupabase } from './fakes.js';
import { openSupabaseStore } from './store-supabase.js';
import { openLeadStore } from './store.js';
import { createLead, recordContact } from './lead.js';
import { COLUMNS } from './sheets.js';

const request = {
  name: 'Dana Whitfield', phone: '(312) 555-0188', email: 'dana@example.com',
  service: 'ac_repair', description: 'AC blowing warm air since this morning.',
  urgency: 'soon', preferredDate: '', preferredWindow: 'morning',
};

let google, supa;
before(async () => { google = await startFakeGoogle(); supa = await startFakeSupabase(); });
after(() => { google.close(); supa.close(); });
beforeEach(() => { google.reset(); supa.reset(); });

// ---- Supabase store

test('supabase store: save, look up by id or reference, list newest first', async () => {
  const store = openSupabaseStore({ url: supa.url, key: supa.key });
  const older = createLead(request, { now: new Date('2026-09-30T10:00:00Z') });
  const newer = createLead({ ...request, name: 'Kim Lee' }, { now: new Date('2026-09-30T11:00:00Z') });
  await store.save(older);
  await store.save(newer);

  assert.equal((await store.get(older.id)).customer.name, 'Dana Whitfield');
  assert.equal((await store.findByReference(newer.reference)).customer.name, 'Kim Lee');
  assert.deepEqual((await store.all()).map((l) => l.id), [newer.id, older.id]);
  assert.equal(await store.get('HV-NOTAUUID'), null, 'a reference is never sent as a uuid');
  assert.equal(await store.findByReference('HV-NOSUCH'), null);
});

test('supabase store: saving again updates the same row and marks the sheet out of date', async () => {
  const store = openSupabaseStore({ url: supa.url, key: supa.key });
  let lead = createLead(request);
  await store.save(lead);
  await store.markSynced(lead);
  assert.ok(supa.state.rows.get(lead.id).sheet_synced_at);

  lead = recordContact(lead, { outcome: 'reached' }, new Date(Date.parse(lead.updatedAt) + 60_000));
  await store.save(lead);
  assert.equal(supa.state.rows.size, 1);
  assert.equal(supa.state.rows.get(lead.id).data.leadStatus, 'contacted');
  assert.equal(supa.state.rows.get(lead.id).sheet_synced_at, null);
});

test('supabase store: an older version never marks a newer change as synced', async () => {
  const store = openSupabaseStore({ url: supa.url, key: supa.key });
  const v1 = createLead(request);
  const v2 = recordContact(v1, { outcome: 'reached' }, new Date(Date.parse(v1.updatedAt) + 1000));
  await store.save(v1);
  await store.save(v2);
  await store.markSynced(v1); // a slow write of v1 finishing late
  assert.equal(supa.state.rows.get(v1.id).sheet_synced_at, null);
  await store.markSynced(v2);
  assert.ok(supa.state.rows.get(v1.id).sheet_synced_at);
});

test('supabase store: unsynced lists stale rows only, oldest first', async () => {
  const store = openSupabaseStore({ url: supa.url, key: supa.key });
  const old = createLead(request, { now: new Date(Date.now() - 10 * 60_000) });
  const fresh = createLead({ ...request, name: 'Kim Lee' });
  const done = createLead({ ...request, name: 'Ray Ortiz' }, { now: new Date(Date.now() - 20 * 60_000) });
  for (const l of [old, fresh, done]) await store.save(l);
  await store.markSynced(done);
  assert.deepEqual((await store.unsynced()).map((l) => l.id), [old.id], 'fresh one may still be syncing');
  assert.deepEqual((await store.unsynced(5, 0)).map((l) => l.id).sort(), [old.id, fresh.id].sort());
});

test('supabase store: new sb_secret keys go in apikey only; old JWT keys also in Authorization', async () => {
  await openSupabaseStore({ url: supa.url, key: supa.key }).all();
  assert.equal(supa.state.requests.at(-1).headers.authorization, undefined);

  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig';
  const legacy = await startFakeSupabase({ key: jwt });
  try {
    await openSupabaseStore({ url: legacy.url, key: jwt }).all();
    assert.equal(legacy.state.requests.at(-1).headers.authorization, `Bearer ${jwt}`);
  } finally { legacy.close(); }
});

test('supabase store: an outage is a 503 with a plain message, details go to the log', async (t) => {
  const logged = [];
  t.mock.method(console, 'error', (m) => logged.push(m));
  supa.state.down = true;
  const store = openSupabaseStore({ url: supa.url, key: supa.key });
  await assert.rejects(store.save(createLead(request)), (err) => err.status === 503 && /unavailable/.test(err.message));
  assert.match(logged[0], /^\[store\] Supabase POST 503/);
  const wrongKey = openSupabaseStore({ url: supa.url, key: 'sb_secret_wrong' });
  supa.state.down = false;
  await assert.rejects(wrongKey.all(), (err) => err.status === 503);
});

test('store picker: Supabase when set, local file otherwise, and refuses to guess on Vercel', async () => {
  const tmp = await mkdtemp(join(tmpdir(), 'hvac-pick-'));
  try {
    assert.match((await openLeadStore({}, { file: join(tmp, 'l.jsonl') })).status, /l\.jsonl$/);
    assert.match((await openLeadStore(supa.env(), { file: 'unused' })).status, /Supabase/);
    for (const env of [{ VERCEL: '1' }, { SUPABASE_URL: supa.url }, { SUPABASE_SERVICE_ROLE_KEY: 'x' }]) {
      const store = await openLeadStore(env, { file: join(tmp, 'never.jsonl') });
      assert.match(store.status, /NOT set up/);
      await assert.rejects(store.save(createLead(request)), (err) => err.status === 503);
    }
  } finally { await rm(tmp, { recursive: true, force: true }); }
});

// ---- The Vercel functions in api/, end to end

/**
 * A stand-in for Vercel's router: sends each URL to the matching api/ file.
 * mode 'rewritten' hands the function the URL the way a rewrite might
 * (/api/leads/[ref]/[action]?ref=..&action=..); 'original' leaves it as sent.
 * preParse imitates Vercel's body helper: req.body, parsed on first read.
 */
const vercel = { mode: 'rewritten', preParse: true };

test('api/ functions: customer submits, office works the lead, database and sheet keep up', async (t) => {
  const tmp = await mkdtemp(join(tmpdir(), 'hvac-vercel-'));
  Object.assign(process.env, google.env(), supa.env(), {
    OFFICE_TOKEN: 'office-pw', WEBHOOK_URL: '', LEADS_FILE: join(tmp, 'must-not-be-used.jsonl'),
  });
  const { sheets } = await import('./server.js');
  const routes = [
    [/^\/api\/requests$/, (await import('./api/requests.js')).default, () => '/api/requests'],
    [/^\/api\/leads$/, (await import('./api/leads/index.js')).default, () => '/api/leads'],
    [/^\/api\/leads\/([^/]+)$/, (await import('./api/leads/[ref].js')).default, (m) => `/api/leads/[ref]?ref=${m[1]}`],
    [/^\/api\/leads\/([^/]+)\/([^/]+)$/, (await import('./api/leads/[ref]/[action].js')).default,
      (m) => `/api/leads/[ref]/[action]?ref=${m[1]}&action=${m[2]}`],
  ];
  const platform = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const route = routes.find(([re]) => re.test(url.pathname));
    if (!route) { res.writeHead(404); return res.end(); }
    const [re, fn, dest] = route;
    if (vercel.mode === 'rewritten') {
      const to = dest(url.pathname.match(re));
      req.url = url.search ? `${to}${to.includes('?') ? '&' : '?'}${url.search.slice(1)}` : to;
    }
    if (vercel.preParse && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      Object.defineProperty(req, 'body', { get: () => JSON.parse(raw) }); // throws on bad JSON, like Vercel
    }
    return fn(req, res);
  }).listen(0);
  const base = `http://127.0.0.1:${platform.address().port}`;
  const errors = [];
  t.mock.method(console, 'error', (m) => errors.push(String(m)));
  t.mock.method(console, 'log', () => {});
  t.after(async () => { platform.close(); sheets.stop(); await rm(tmp, { recursive: true, force: true }); });

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
  const dbRow = (ref) => [...supa.state.rows.values()].find((r) => r.reference === ref);
  const until = async (check, ms = 3000) => {
    for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 20))) if (await check()) return true;
    return false;
  };

  // 1. Customer submits: saved in the database, a sheet row appears, marked synced.
  const res = await submit({});
  assert.equal(res.status, 201);
  const { reference } = await res.json();
  await sheets.idle();
  assert.equal(dbRow(reference).data.leadStatus, 'new');
  assert.equal(col(rowFor(reference), 'Lead Status'), 'New');
  assert.ok(await until(() => dbRow(reference).sheet_synced_at), 'marked synced');

  // 2. The office screen lists it (URL as sent this time).
  vercel.mode = 'original';
  const board = await (await office('?all=1')).json();
  assert.equal(board.count, 1);
  assert.equal(board.stats.newLeads, 1);
  assert.equal((await (await office(`/${reference}`)).json()).lead.reference, reference);

  // 3. Owner marks it contacted (rewritten URL, body pre-parsed): database and the same sheet row update.
  vercel.mode = 'rewritten';
  const contacted = await (await office(`/${reference}/contact`, { outcome: 'reached', by: 'Maria' })).json();
  assert.equal(contacted.lead.leadStatus, 'contacted');
  await sheets.idle();
  assert.equal(dbRow(reference).data.leadStatus, 'contacted');
  assert.equal(google.state.grid.length, 2, 'header + one row, no duplicate');
  assert.equal(col(rowFor(reference), 'Lead Status'), 'Contacted');

  // 4. Bad JSON from a client is a 400, not a crash.
  const bad = await fetch(`${base}/api/leads/${reference}/contact`, {
    method: 'POST', headers: { Authorization: 'Bearer office-pw' }, body: '{not json',
  });
  assert.equal(bad.status, 400);

  // 5. Google down: the customer is still confirmed and the lead is in the database, marked unsynced.
  google.state.down = true;
  const ray = await submit({ name: 'Ray Ortiz', description: 'Furnace makes a loud bang when it starts.' });
  assert.equal(ray.status, 201);
  const rayRef = (await ray.json()).reference;
  await sheets.idle();
  assert.equal(dbRow(rayRef).data.customer.name, 'Ray Ortiz');
  assert.equal(dbRow(rayRef).sheet_synced_at, null);
  assert.equal(rowFor(rayRef), undefined);
  assert.ok(errors.some((e) => e.includes(`[sheets] ${rayRef} not synced`)));

  // 6. Google back: the next office-screen load writes the missed row (once it is a minute old).
  google.state.down = false;
  const aged = new Date(Date.now() - 5 * 60_000).toISOString(); // as if saved 5 minutes ago
  dbRow(rayRef).updated_at = aged;
  dbRow(rayRef).data.updatedAt = aged;
  await office('?all=1');
  assert.ok(await until(() => rowFor(rayRef)), 'missed row written on catch-up');
  assert.ok(await until(() => dbRow(rayRef).sheet_synced_at), 'and marked synced');
  assert.equal(google.state.grid.length, 3, 'header + two rows');

  // 7. Database down: nothing is pretended. The customer is told to call; no orphan sheet row.
  supa.state.down = true;
  const lost = await submit({ name: 'Lee Park' });
  assert.equal(lost.status, 503);
  assert.match((await lost.json()).error, /unavailable/);
  await sheets.idle();
  assert.equal(google.state.grid.length, 3);
  supa.state.down = false;
});
