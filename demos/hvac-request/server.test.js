import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRequest, isoDate } from './public/validate.js';

const good = {
  name: 'Dana Whitfield',
  phone: '(312) 555-0188',
  email: 'Dana@Example.com',
  service: 'ac_repair',
  description: 'AC blowing warm air since this morning.',
  urgency: 'emergency',
  preferredDate: isoDate(),
  preferredWindow: 'afternoon',
};

test('a complete request passes and is tidied', () => {
  const { data, errors } = validateRequest({ ...good, name: '  Dana Whitfield ' });
  assert.deepEqual(errors, {});
  assert.equal(data.name, 'Dana Whitfield');
  assert.equal(data.email, 'dana@example.com');
});

test('each bad field gets its own message', () => {
  const { errors } = validateRequest({
    name: 'D', phone: '555', email: 'nope', service: 'plumbing',
    description: 'broken', urgency: 'yesterday', preferredDate: '2000-01-01', preferredWindow: 'midnight',
  });
  assert.deepEqual(Object.keys(errors).sort(),
    ['description', 'email', 'name', 'phone', 'preferredDate', 'preferredWindow', 'service', 'urgency']);
});

test('built-in object keys are not accepted as choices', () => {
  const { errors } = validateRequest({ ...good, service: 'constructor', urgency: 'toString', preferredWindow: '__proto__' });
  assert.deepEqual(Object.keys(errors).sort(), ['preferredWindow', 'service', 'urgency']);
});

test('preferred day is optional, but must be a real date', () => {
  assert.deepEqual(validateRequest({ ...good, preferredDate: '' }).errors, {});
  assert.ok(validateRequest({ ...good, preferredDate: '2099-02-31' }).errors.preferredDate);
});

// ---- API, with a fake webhook receiver standing in for Zapier/CRM.

let app, hook, base, tmp;
const received = [];

before(async () => {
  hook = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => { received.push(JSON.parse(body)); res.end('ok'); });
  }).listen(0);
  // Leads go to a throwaway folder so tests never touch real saved requests.
  tmp = await mkdtemp(join(tmpdir(), 'hvac-test-'));
  process.env.LEADS_FILE = join(tmp, 'leads.jsonl');
  process.env.OFFICE_TOKEN = 'test-office-token';
  process.env.WEBHOOK_URL = `http://127.0.0.1:${hook.address().port}/hook`;
  ({ server: app } = await import('./server.js'));
  app.listen(0);
  base = `http://127.0.0.1:${app.address().port}`;
});

after(async () => {
  app.close();
  hook.close();
  await rm(tmp, { recursive: true, force: true });
});

const post = (body) => fetch(`${base}/api/requests`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('valid request: saved, forwarded, reference returned', async () => {
  const res = await post(good);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.reference, /^HV-[2-9A-HJ-NP-Z]{6}$/);
  assert.equal(body.firstName, 'Dana');
  assert.equal(body.nextStep, "This is marked as an emergency, so we'll call you within 30 minutes.");

  const saved = (await readFile(process.env.LEADS_FILE, 'utf8')).trim().split('\n').map(JSON.parse);
  const lead = saved.at(-1);
  assert.equal(lead.reference, body.reference);
  assert.equal(lead.leadStatus, 'new');
  assert.equal(lead.bookingStatus, 'not_booked');
  assert.equal(lead.followUpNeeded, true);
  assert.equal(lead.triage.priority, 1);
  assert.match(lead.aiSummary, /^P1 air conditioning repair/);
  assert.equal(lead.lastContact, null);

  assert.equal(received.at(-1).event, 'service_request.created');
  assert.equal(received.at(-1).lead.reference, body.reference);
});

test('invalid request: 422 with field errors, nothing forwarded', async () => {
  const before = received.length;
  const res = await post({ ...good, email: 'bad' });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).errors.email);
  assert.equal(received.length, before);
});

test('bot-filled honeypot is quietly dropped', async () => {
  const before = received.length;
  const res = await post({ ...good, company: 'Spam LLC' });
  assert.equal(res.status, 200);
  assert.equal(received.length, before);
});

test('page is served, files outside public are not', async () => {
  assert.equal((await fetch(`${base}/`)).status, 200);
  const officePage = await fetch(`${base}/office`);
  assert.equal(officePage.status, 200);
  assert.doesNotMatch(await officePage.text(), /Dana/, 'the office page itself holds no customer data');
  assert.equal((await fetch(`${base}/..%2Fserver.js`)).status, 404);
});

// ---- Office endpoints

const office = (path, { method = 'GET', body, token = 'test-office-token' } = {}) => fetch(`${base}/api/leads${path}`, {
  method,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: body && JSON.stringify(body),
});

test('office endpoints need the token', async () => {
  assert.equal((await office('', { token: 'guess' })).status, 401);
  assert.equal((await fetch(`${base}/api/leads`)).status, 401);
});

test('office works a lead from call list to finished job', async () => {
  const { reference } = await (await post({ ...good, urgency: 'flexible', description: 'Yearly tune-up for the furnace please.' })).json();

  const queue = await (await office('')).json();
  assert.ok(queue.leads.some((l) => l.reference === reference));

  const step = async (action, body) => {
    const res = await office(`/${reference}/${action}`, { method: 'POST', body });
    return { status: res.status, ...(await res.json()) };
  };
  assert.equal((await step('contact', { outcome: 'reached', by: 'Maria' })).lead.leadStatus, 'contacted');
  assert.equal((await step('book', { date: '2099-10-01', window: 'morning' })).lead.bookingStatus, 'booked');
  const done = await step('complete', {});
  assert.deepEqual([done.lead.leadStatus, done.lead.followUpNeeded], ['won', false]);

  const refused = await step('cancel', {});
  assert.equal(refused.status, 409);
  assert.equal((await step('explode', {})).status, 404);

  assert.equal(received.at(-1).event, 'lead.updated');
  assert.equal(received.at(-1).action, 'complete');
  const after = await (await office('')).json();
  assert.ok(!after.leads.some((l) => l.reference === reference), 'finished jobs leave the call list');
  assert.equal((await (await office(`/${reference.toLowerCase()}`)).json()).lead.history.length, 4);
});

test('office screen data: every lead, summary numbers, allowed buttons', async () => {
  const body = await (await office('?all=1')).json();
  assert.equal(body.timezone, 'America/Chicago');
  assert.deepEqual(Object.keys(body.stats), ['newLeads', 'needFollowUp', 'urgent', 'booked', 'won']);
  assert.equal(body.count, body.leads.length);
  for (const lead of body.leads) assert.ok(Array.isArray(lead.actions));
  assert.equal((await office('?all=1', { token: 'guess' })).status, 401);
});

test('gas leak: customer gets emergency steps, no callback promise; office is alerted', async () => {
  const res = await post({ ...good, urgency: 'flexible', description: 'Want a tune-up, but I can smell gas near the furnace.' });
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.match(body.emergency.title, /gas/i);
  assert.match(body.emergency.steps.join(' '), /911/);
  assert.doesNotMatch(body.nextStep, /within \d|by \d/);

  const [created, alert] = received.slice(-2);
  assert.equal(created.event, 'service_request.created');
  assert.equal(alert.event, 'safety_alert');
  assert.equal(alert.hazard, 'gas');
  assert.equal(alert.lead.reference, body.reference);

  const lead = (await (await office(`/${body.reference}`)).json()).lead;
  assert.deepEqual([lead.triage.priority, lead.followUpNeeded], [1, true]);
});

test('ordinary request: no emergency block', async () => {
  const body = await (await post({ ...good, urgency: 'this_week', description: 'Thermostat screen goes blank.' })).json();
  assert.equal(body.emergency, null);
  assert.match(body.nextStep, /^We'll call you /);
});
