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

  const saved = (await readFile(process.env.LEADS_FILE, 'utf8')).trim().split('\n').map(JSON.parse);
  const lead = saved.at(-1);
  assert.equal(lead.reference, body.reference);
  assert.equal(lead.leadStatus, 'new');
  assert.equal(lead.bookingStatus, 'not_booked');
  assert.equal(lead.followUpNeeded, true);
  assert.equal(lead.aiSummary, null);
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
  assert.equal((await fetch(`${base}/..%2Fserver.js`)).status, 404);
});
