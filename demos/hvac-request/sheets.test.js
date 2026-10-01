import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, leadToRow, openSheetStore } from './sheets.js';
import { openLeadStore } from './store.js';
import { createLead, recordContact, book } from './lead.js';
import { startFakeGoogle } from './fakes.js';

// A stand-in for Google (fakes.js): checks the signed sign-in and RAW writes.
let google;
before(async () => { google = await startFakeGoogle(); });
after(() => google.close());
beforeEach(() => google.reset());

const quietLog = () => {
  const lines = [];
  return { lines, error: (m) => lines.push(m) };
};
const request = {
  name: 'Dana Whitfield', phone: '(312) 555-0188', email: 'dana@example.com',
  service: 'ac_repair', description: 'AC blowing warm air since this morning.',
  urgency: 'soon', preferredDate: '2026-10-02', preferredWindow: 'morning',
};
const grid = () => google.state.grid;
const dataRows = () => grid().slice(1);
const col = (row, name) => row[COLUMNS.indexOf(name)];
const sheetStore = (log = quietLog()) => openSheetStore(google.env(), { log });

// ---- Choosing the store

test('store picker: the Sheet with all three Google settings, a local file with none', async () => {
  assert.match((await openLeadStore(google.env(), { file: 'unused' })).status, /Google Sheet, tab "Leads"/);
  assert.match((await openLeadStore({}, { file: '/tmp/x.jsonl' })).status, /x\.jsonl$/);
});

test('store picker: some Google settings, or Vercel with none, refuses rather than guessing', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const env of [{ GOOGLE_SHEET_ID: 'sheet-123' }, { VERCEL: '1' }]) {
    const store = await openLeadStore(env, { file: '/tmp/never.jsonl' });
    assert.match(store.status, /NOT set up: missing/);
    await assert.rejects(store.save(createLead(request)), (err) => err.status === 503 && !/GOOGLE/.test(err.message));
  }
});

// ---- The four behaviours

test('a new lead creates one row, under the header, with every column', async () => {
  const store = sheetStore();
  const lead = createLead({ ...request, description: '=IMPORTXML("http://evil","//a") Also I smell gas.' });
  await store.save(lead);

  assert.deepEqual(grid()[0], COLUMNS);
  assert.equal(dataRows().length, 1);
  const row = dataRows()[0];
  assert.equal(row.length, 19);
  assert.equal(col(row, 'Lead ID'), lead.reference);
  assert.equal(col(row, 'Customer Name'), 'Dana Whitfield');
  assert.equal(col(row, 'Service'), 'Air conditioning repair');
  assert.equal(col(row, 'Priority'), 'P1 Urgent');
  assert.equal(col(row, 'Hazard'), 'Gas');
  assert.equal(col(row, 'Lead Status'), 'New');
  assert.equal(col(row, 'Follow-up Needed'), 'Yes');
  assert.match(col(row, 'Received At'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(col(row, 'Preferred Time'), 'Morning (8am to 12pm)');
  assert.deepEqual(JSON.parse(col(row, 'Record')), lead, 'the full lead is kept for the app');
  // Customer text is stored as text, never as a formula.
  assert.ok(col(row, 'Problem').startsWith('=IMPORTXML'));
  assert.ok(google.state.writes.every((w) => w === 'RAW'));
});

test('a status change updates the same row, and reads back exactly', async () => {
  const store = sheetStore();
  let lead = createLead(request);
  await store.save(lead);
  lead = recordContact(lead, { outcome: 'reached', by: 'Maria', note: 'Wants Friday' });
  await store.save(lead);
  lead = book(lead, { date: '2026-10-02', window: 'morning' });
  await store.save(lead);

  assert.equal(dataRows().length, 1);
  const row = dataRows()[0];
  assert.equal(col(row, 'Lead Status'), 'Qualified');
  assert.equal(col(row, 'Booking Status'), 'Booked');
  assert.equal(col(row, 'Follow-up Needed'), 'No');
  assert.equal(col(row, 'Callback Deadline'), '');
  assert.match(col(row, 'Last Contact'), /phone · reached · Maria · Wants Friday$/);

  assert.deepEqual(await store.findByReference(lead.reference), lead);
  assert.deepEqual(await store.get(lead.id), lead);
  assert.equal(await store.findByReference('HV-NOSUCH'), null);
});

test('no duplicate rows: rapid changes, repeats, and rows the owner has moved', async () => {
  const store = sheetStore();
  const a0 = createLead(request);
  const a1 = recordContact(a0, { outcome: 'reached' });
  const a2 = book(a1, { date: '2026-10-02', window: 'morning' });
  // Fired together, before any has finished: the create and its updates race.
  await Promise.all([store.save(a0), store.save(a1), store.save(a2), store.save(a2)]);
  assert.equal(dataRows().length, 1);
  assert.equal(col(dataRows()[0], 'Booking Status'), 'Booked', 'the newest version wins');

  // A second lead, then the owner sorts the sheet so the rows swap places.
  const b0 = createLead({ ...request, name: 'Kim Lee' });
  await store.save(b0);
  google.state.grid = [grid()[0], grid()[2], grid()[1]];
  await store.save(recordContact(b0, { outcome: 'no_answer' }));
  await store.save(a2);

  assert.equal(dataRows().length, 2);
  const all = await store.all();
  assert.deepEqual(all.map((l) => l.reference).sort(), [a0.reference, b0.reference].sort());
  assert.equal(all.find((l) => l.id === b0.id).lastContact.outcome, 'no_answer');
});

test('Google down: the save fails clearly (503), the reason is logged, nothing half-written', async () => {
  const log = quietLog();
  const store = sheetStore(log);
  google.state.down = true;
  await assert.rejects(store.save(createLead(request)),
    (err) => err.status === 503 && err.message === 'Lead storage is unavailable. Please try again.');
  await assert.rejects(store.all(), (err) => err.status === 503);
  assert.match(log.lines[0], /^\[sheet\] .*503/);
  assert.equal(grid().length, 0);

  // Back up: the next save works as normal.
  google.state.down = false;
  await store.save(createLead(request));
  assert.equal(dataRows().length, 1);
});

// ---- Safety around hand edits

test('rows typed in by hand, or with a damaged Record, are skipped, not trusted', async () => {
  const log = quietLog();
  const store = sheetStore(log);
  const real = createLead(request);
  await store.save(real);
  const forged = { ...createLead(request), reference: 'HV-OTHER1' };
  grid().push(['HV-HANDMADE', '2026-10-01 09:00', 'Typed by owner']);           // no Record
  grid().push(['HV-BROKEN1', ...Array(17).fill(''), '{not json']);              // damaged Record
  grid().push(['HV-MISMATCH', ...Array(17).fill(''), JSON.stringify(forged)]);  // Record for another lead
  assert.deepEqual((await store.all()).map((l) => l.reference), [real.reference]);
  assert.equal(log.lines.length, 2);
});

test('refuses to write over a tab that holds something else', async () => {
  google.state.grid = [['Invoice #', 'Amount'], ['1001', '$250']];
  const log = quietLog();
  await assert.rejects(sheetStore(log).save(createLead(request)), (err) => err.status === 503);
  assert.deepEqual(grid(), [['Invoice #', 'Amount'], ['1001', '$250']]);
  assert.match(log.lines[0], /Use an empty tab/);
});

test('an existing 18-column header gets the Record column added', async () => {
  google.state.grid = [COLUMNS.slice(0, 18)];
  await sheetStore().save(createLead(request));
  assert.deepEqual(grid()[0], COLUMNS);
  assert.equal(dataRows().length, 1);
});

test('leadToRow matches the column list', () => {
  assert.equal(leadToRow(createLead(request)).length, COLUMNS.length);
});
