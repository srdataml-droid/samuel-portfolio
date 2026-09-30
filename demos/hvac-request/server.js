import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash, timingSafeEqual } from 'node:crypto';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRequest } from './public/validate.js';
import { ACTIONS, createLead, officeStats, officeView, workQueue } from './lead.js';
import { TIMEZONE, customerEmergency, customerNextStep } from './rules.js';
import { openStore } from './store.js';
import { createSheetsSync } from './sheets.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const LEADS_FILE = process.env.LEADS_FILE || join(ROOT, 'data', 'leads.jsonl');

const PORT = Number(process.env.PORT) || 3100;
// Where each new request is sent: Zapier, Make, n8n, a Slack or CRM webhook,
// or your own API. Leave unset and requests are only saved to data/leads.jsonl.
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
// Password for the office endpoints (/api/leads). Unset = those endpoints are off,
// so customer details can never be read without it.
const OFFICE_TOKEN = process.env.OFFICE_TOKEN || '';
const MAX_BODY_BYTES = 16 * 1024;

const store = await openStore(LEADS_FILE);
// Copies every lead to a Google Sheet when GOOGLE_* settings are present (see sheets.js).
export const sheets = createSheetsSync(process.env, { getLead: (id) => store.get(id) });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJSON(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJSON(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

/**
 * Tells the outside world (Zapier, CRM, Slack) what happened.
 * Returns true when the webhook accepted it. Never throws.
 */
async function notify(event, lead, extra = {}) {
  if (!WEBHOOK_URL) return false;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...extra, lead }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[webhook] ${res.status} ${res.statusText} for ${lead.reference}`);
    return res.ok;
  } catch (err) {
    console.error(`[webhook] failed for ${lead.reference}: ${err.message}`);
    return false;
  }
}

async function handleRequest(req, res) {
  const body = await readJSON(req);

  // Hidden "company" field: people never see it, spam bots fill it in.
  // Answer as if it worked so the bot learns nothing.
  if (body && body.company) return sendJSON(res, 200, { ok: true, reference: 'HV-RECEIVED' });

  const { data, errors } = validateRequest(body || {});
  if (Object.keys(errors).length) return sendJSON(res, 422, { ok: false, errors });

  const now = new Date();
  const lead = createLead(data, { now });
  // Saved before forwarding, so a webhook outage never loses a customer.
  await store.save(lead);
  sheets.sync(lead); // in the background: a slow or failing Google never delays the customer
  const delivered = await notify('service_request.created', lead);
  console.log(`[lead] ${lead.reference} P${lead.triage.priority} ${lead.request.service} due ${lead.followUpDueAt}${WEBHOOK_URL ? ` webhook=${delivered ? 'ok' : 'FAILED'}` : ''}`);

  // A possible gas leak, carbon monoxide or fire gets its own alert, so a
  // webhook can text the owner or on-call tech straight away.
  const emergency = customerEmergency(lead);
  if (emergency) {
    console.log(`[SAFETY] ${lead.reference} ${lead.triage.hazard}: "${lead.triage.safetyConcern}" ${lead.customer.phone}`);
    await notify('safety_alert', lead, { hazard: lead.triage.hazard });
  }

  return sendJSON(res, 201, {
    ok: true,
    reference: lead.reference,
    firstName: data.name.split(/\s+/)[0],
    nextStep: customerNextStep(lead, now),
    emergency,
  });
}

// ---- Office endpoints

function isOffice(req) {
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  // Compare hashes so the check takes the same time whatever was sent.
  const hash = (v) => createHash('sha256').update(v).digest();
  return timingSafeEqual(hash(given), hash(OFFICE_TOKEN));
}

async function handleOffice(req, res, parts) {
  if (!OFFICE_TOKEN) return sendJSON(res, 503, { ok: false, error: 'Office access is off. Set OFFICE_TOKEN to turn it on.' });
  if (!isOffice(req)) return sendJSON(res, 401, { ok: false, error: 'Wrong or missing office token.' });

  const [idOrRef, action] = parts;
  const now = new Date();

  // GET /api/leads            the call list: who to contact, most urgent first
  // GET /api/leads?all=1      every lead, in office-screen order, with the
  //                           summary numbers and the buttons each lead allows
  if (!idOrRef) {
    if (req.method !== 'GET') return sendJSON(res, 405, { ok: false, error: 'Use GET' });
    const all = new URL(req.url, 'http://localhost').searchParams.has('all');
    if (!all) {
      const leads = workQueue(store.all(), now);
      return sendJSON(res, 200, { ok: true, count: leads.length, leads });
    }
    const leads = officeView(store.all(), now);
    return sendJSON(res, 200, {
      ok: true, count: leads.length, timezone: TIMEZONE, stats: officeStats(leads), leads,
    });
  }

  const lead = store.get(idOrRef) || store.findByReference(idOrRef.toUpperCase());
  if (!lead) return sendJSON(res, 404, { ok: false, error: 'No lead with that id or reference.' });

  // GET /api/leads/HV-7K2Q9M
  if (!action) {
    if (req.method !== 'GET') return sendJSON(res, 405, { ok: false, error: 'Use GET' });
    return sendJSON(res, 200, { ok: true, lead });
  }

  // POST /api/leads/HV-7K2Q9M/contact | qualify | book | complete | cancel | lost
  if (req.method !== 'POST') return sendJSON(res, 405, { ok: false, error: 'Use POST' });
  if (!Object.hasOwn(ACTIONS, action)) return sendJSON(res, 404, { ok: false, error: `Unknown action. Use one of: ${Object.keys(ACTIONS).join(', ')}.` });

  const updated = ACTIONS[action](lead, await readJSON(req), now);
  await store.save(updated);
  sheets.sync(updated);
  await notify('lead.updated', updated, { action });
  console.log(`[lead] ${updated.reference} ${action} -> ${updated.leadStatus}/${updated.bookingStatus}`);
  return sendJSON(res, 200, { ok: true, lead: updated });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pages = { '/': '/index.html', '/office': '/office.html' };
  const path = pages[url.pathname] || decodeURIComponent(url.pathname);
  const file = normalize(join(PUBLIC_DIR, path));
  if (!file.startsWith(PUBLIC_DIR + sep)) return sendJSON(res, 404, { ok: false });
  try {
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

export const server = createServer(async (req, res) => {
  try {
    const path = req.url.split('?')[0];
    if (path === '/api/requests') {
      if (req.method !== 'POST') return sendJSON(res, 405, { ok: false, error: 'Use POST' });
      return await handleRequest(req, res);
    }
    if (path === '/api/leads' || path.startsWith('/api/leads/')) {
      return await handleOffice(req, res, path.split('/').slice(3).filter(Boolean).map(decodeURIComponent));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJSON(res, 405, { ok: false });
    return await serveStatic(req, res);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    return sendJSON(res, status, { ok: false, error: status === 500 ? 'Something went wrong' : err.message });
  }
});

// Start listening only when run directly (`node server.js`), not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    console.log(`HVAC request page: http://localhost:${PORT}`);
    console.log(WEBHOOK_URL ? `Forwarding requests to ${new URL(WEBHOOK_URL).host}` : 'No WEBHOOK_URL set: requests are saved to data/leads.jsonl only');
    console.log(sheets.status);
    console.log(OFFICE_TOKEN ? 'Office endpoints on: /api/leads' : 'Office endpoints off (set OFFICE_TOKEN to turn them on)');
  });
}
