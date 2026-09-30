import { createSign } from 'node:crypto';
import { TIMEZONE } from './rules.js';

/**
 * Keeps one Google Sheet row per lead, so the owner can see the whole
 * pipeline outside the office screen.
 *
 * - Off unless GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and
 *   GOOGLE_PRIVATE_KEY are all set. The demo runs the same without them.
 * - The local lead store stays the record. The sheet is a copy: syncing runs
 *   after the lead is saved, in the background, one write at a time.
 * - Rows are matched on Lead ID (column A), looked up fresh before every
 *   write, so a lead never gets a second row, even if the owner sorts or
 *   moves rows in the sheet.
 * - If Google is unreachable, the failure is logged and the lead is retried
 *   every few minutes. `npm run sheets:backfill` rewrites every lead's row.
 * - Values are written as plain text (valueInputOption=RAW), so something a
 *   customer types, like "=IMPORTXML(...)", can never run as a formula.
 * - No Google library: the service-account sign-in is ~20 lines of node:crypto.
 */

export const COLUMNS = [
  'Lead ID', 'Received At', 'Customer Name', 'Phone', 'Email', 'Service', 'Problem',
  'Priority', 'Hazard', 'Lead Status', 'Booking Status', 'Follow-up Needed',
  'Callback Deadline', 'Preferred Day', 'Preferred Time', 'AI Summary', 'Last Contact', 'Updated At',
];
const LAST_COLUMN = String.fromCharCode(64 + COLUMNS.length); // "R"

const RETRY_EVERY = 3 * 60_000;
const TIMEOUT = 10_000;

// ---- Lead -> row

const PRIORITY = { 1: 'P1 Urgent', 2: 'P2 High', 3: 'P3 Normal', 4: 'P4 Low' };
const HAZARD = { gas: 'Gas', carbon_monoxide: 'Carbon monoxide', fire: 'Fire / electrical' };
const LEAD_STATUS = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', won: 'Won', lost: 'Lost' };
const BOOKING_STATUS = { not_booked: 'Not booked', tentative: 'Pencilled in', booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled' };

const stamp = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
/** "2026-09-30 09:12" in the business's time zone: readable, and sorts correctly as text. */
export function sheetTime(iso) {
  if (!iso) return '';
  const p = Object.fromEntries(stamp.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

export function leadToRow(lead) {
  const c = lead.lastContact;
  const lastContact = c
    ? [sheetTime(c.at), c.channel, c.outcome.replace('_', ' '), c.by, c.note].filter(Boolean).join(' · ')
    : '';
  return [
    lead.reference,
    sheetTime(lead.createdAt),
    lead.customer.name,
    lead.customer.phone,
    lead.customer.email,
    lead.request.serviceLabel,
    lead.request.description,
    PRIORITY[lead.triage.priority] || String(lead.triage.priority),
    HAZARD[lead.triage.hazard] || '',
    LEAD_STATUS[lead.leadStatus] || lead.leadStatus,
    BOOKING_STATUS[lead.bookingStatus] || lead.bookingStatus,
    lead.followUpNeeded ? 'Yes' : 'No',
    lead.followUpNeeded ? sheetTime(lead.followUpDueAt) : '',
    lead.request.preferredDate || '',
    lead.request.preferredWindowLabel,
    lead.aiSummary || '',
    lastContact,
    sheetTime(lead.updatedAt),
  ];
}

// ---- Google sign-in (service account -> short-lived access token)

const base64url = (value) => Buffer.from(value).toString('base64url');

function tokenSource({ email, privateKey, tokenUrl }) {
  let cached = null;
  return async function accessToken() {
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({
      iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: tokenUrl, iat: now, exp: now + 3600,
    }));
    const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(privateKey, 'base64url');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.${signature}`,
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token)
      throw new Error(`Google sign-in failed (${res.status}): ${body.error_description || body.error || 'no token'}`);
    cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 };
    return cached.token;
  };
}

// ---- The few Sheets API calls we need

function sheetsClient({ sheetId, tab, apiUrl, accessToken }) {
  const quotedTab = `'${tab.replace(/'/g, "''")}'`;
  const url = (range, suffix = '') =>
    `${apiUrl}/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(`${quotedTab}!${range}`)}${suffix}`;

  async function call(method, target, body) {
    const res = await fetch(target, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Google Sheets ${method} failed (${res.status}): ${data.error?.message || res.statusText}`);
    return data;
  }

  return {
    readRange: async (range) => (await call('GET', url(range))).values || [],
    writeRow: (rowNumber, values) =>
      call('PUT', url(`A${rowNumber}:${LAST_COLUMN}${rowNumber}`, '?valueInputOption=RAW'), { values: [values] }),
    appendRow: (values) =>
      call('POST', url(`A:${LAST_COLUMN}`, ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'), { values: [values] }),
  };
}

// ---- Sync

/**
 * Settings come from the environment. Returns a sync that does nothing (and
 * says so once at start-up) when Google isn't configured.
 */
export function createSheetsSync(env = process.env, { getLead = () => null, log = console } = {}) {
  const sheetId = env.GOOGLE_SHEET_ID || '';
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  // Hosting dashboards store the key on one line with literal "\n"s; turn them back into newlines.
  const privateKey = (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const tab = env.GOOGLE_SHEET_TAB || 'Leads';

  const configured = [sheetId, email, privateKey].filter(Boolean).length;
  if (configured < 3) {
    const status = configured === 0
      ? 'Google Sheets sync off (set GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to turn it on)'
      : 'Google Sheets sync OFF: GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must all be set';
    return { enabled: false, status, sync() {}, idle: async () => {}, retryFailed: async () => {}, stop() {} };
  }

  const client = sheetsClient({
    sheetId,
    tab,
    apiUrl: env.GOOGLE_SHEETS_API_URL || 'https://sheets.googleapis.com',
    accessToken: tokenSource({ email, privateKey, tokenUrl: env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token' }),
  });

  let headerChecked = false;
  async function ensureHeader() {
    if (headerChecked) return;
    const [first = []] = await client.readRange(`A1:${LAST_COLUMN}1`);
    if (first.length && first[0] !== COLUMNS[0])
      throw new Error(`Row 1 of tab "${tab}" isn't our header (A1 is "${first[0]}"). Use an empty tab.`);
    if (first.join('|') !== COLUMNS.join('|')) await client.writeRow(1, COLUMNS);
    headerChecked = true;
  }

  async function upsert(lead) {
    await ensureHeader();
    const ids = await client.readRange('A:A');
    const index = ids.findIndex((row, i) => i > 0 && row[0] === lead.reference);
    if (index === -1) await client.appendRow(leadToRow(lead));
    else await client.writeRow(index + 1, leadToRow(lead));
  }

  // One write at a time, so two quick changes to a new lead can't both
  // decide "no row yet" and append twice.
  let queue = Promise.resolve();
  const failed = new Set();

  function sync(lead) {
    queue = queue.then(async () => {
      try {
        await upsert(lead);
        failed.delete(lead.id);
      } catch (err) {
        failed.add(lead.id);
        log.error(`[sheets] ${lead.reference} not synced, will retry: ${err.message}`);
      }
    });
    return queue;
  }

  /** Try every lead whose last sync failed again, using its latest saved version. */
  async function retryFailed() {
    for (const id of [...failed]) {
      const lead = getLead(id);
      if (lead) sync(lead);
      else failed.delete(id);
    }
    await queue;
  }

  const timer = setInterval(() => { if (failed.size) retryFailed(); }, RETRY_EVERY);
  timer.unref();

  return {
    enabled: true,
    status: `Google Sheets sync on: tab "${tab}"`,
    sync,
    retryFailed,
    failedCount: () => failed.size,
    /** Resolves once every queued write has finished. */
    idle: () => queue,
    stop: () => clearInterval(timer),
  };
}
