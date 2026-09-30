import { createServer } from 'node:http';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRequest } from './public/validate.js';
import { createLead } from './lead.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');
const LEADS_FILE = process.env.LEADS_FILE || join(ROOT, 'data', 'leads.jsonl');

const PORT = Number(process.env.PORT) || 3100;
// Where each new request is sent: Zapier, Make, n8n, a Slack or CRM webhook,
// or your own API. Leave unset and requests are only saved to data/leads.jsonl.
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';
const MAX_BODY_BYTES = 16 * 1024;

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

async function saveLead(lead) {
  await mkdir(dirname(LEADS_FILE), { recursive: true });
  await appendFile(LEADS_FILE, JSON.stringify(lead) + '\n');
}

/** Returns true when the webhook accepted the lead. Never throws. */
async function forwardLead(lead) {
  if (!WEBHOOK_URL) return false;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'service_request.created', lead }),
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

  const lead = createLead(data);
  // Saved before forwarding, so a webhook outage never loses a customer.
  await saveLead(lead);
  const delivered = await forwardLead(lead);
  console.log(`[lead] ${lead.reference} ${lead.request.service} ${lead.request.urgency}${WEBHOOK_URL ? ` webhook=${delivered ? 'ok' : 'FAILED'}` : ''}`);

  return sendJSON(res, 201, {
    ok: true,
    reference: lead.reference,
    urgency: lead.request.urgency,
    firstName: data.name.split(/\s+/)[0],
  });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
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
    if (req.url.split('?')[0] === '/api/requests') {
      if (req.method !== 'POST') return sendJSON(res, 405, { ok: false, error: 'Use POST' });
      return await handleRequest(req, res);
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
  });
}
