import { createSign } from 'node:crypto';
import { TIMEZONE } from './rules.js';

/**
 * Leads kept in a Google Sheet: one row per lead. The sheet is the store
 * whenever GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and
 * GOOGLE_PRIVATE_KEY are all set (store.js decides), so the owner sees the
 * whole pipeline in the sheet and the office screen reads from it too.
 *
 * - Columns A to R are for people. Column S ("Record") holds the full lead
 *   as JSON for the app: history, appointment, call attempts. The app reads
 *   column S only, so editing A to R by hand changes nothing in the app,
 *   and the app's next change to that lead rewrites the row.
 * - Rows are matched on Lead ID (column A), looked up fresh before every
 *   write, so a lead never gets a second row, even if the owner sorts or
 *   moves rows.
 * - A lead is saved before the customer is told it was sent. If Google is
 *   unreachable, the save fails with a 503 and the page asks them to call.
 * - Values are written as plain text (valueInputOption=RAW), so something a
 *   customer types, like "=IMPORTXML(...)", can never run as a formula.
 * - No Google library: the service-account sign-in is ~20 lines of node:crypto.
 */

export const COLUMNS = [
  'Lead ID', 'Received At', 'Customer Name', 'Phone', 'Email', 'Service', 'Problem',
  'Priority', 'Hazard', 'Lead Status', 'Booking Status', 'Follow-up Needed',
  'Callback Deadline', 'Preferred Day', 'Preferred Time', 'AI Summary', 'Last Contact', 'Updated At',
  'Record',
];
const RECORD = COLUMNS.indexOf('Record');
const LAST_COLUMN = String.fromCharCode(64 + COLUMNS.length); // "S"

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
    JSON.stringify(lead),
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

// ---- The store

/** Settings from the environment. Call only when all three GOOGLE_* values are set. */
export function openSheetStore(env, { log = console } = {}) {
  const tab = env.GOOGLE_SHEET_TAB || 'Leads';
  const client = sheetsClient({
    sheetId: env.GOOGLE_SHEET_ID,
    tab,
    apiUrl: env.GOOGLE_SHEETS_API_URL || 'https://sheets.googleapis.com',
    accessToken: tokenSource({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Hosting dashboards store the key on one line with literal "\n"s; turn them back into newlines.
      privateKey: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      tokenUrl: env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    }),
  });

  // Google's reason goes to the server log; callers only hear "unavailable".
  async function google(work) {
    try {
      return await work();
    } catch (err) {
      log.error(`[sheet] ${err.message}`);
      throw Object.assign(new Error('Lead storage is unavailable. Please try again.'), { status: 503 });
    }
  }

  let headerChecked = false;
  async function ensureHeader() {
    if (headerChecked) return;
    const [first = []] = await client.readRange(`A1:${LAST_COLUMN}1`);
    if (first.length && first[0] !== COLUMNS[0])
      throw new Error(`Row 1 of tab "${tab}" isn't our header (A1 is "${first[0]}"). Use an empty tab.`);
    if (first.join('|') !== COLUMNS.join('|')) await client.writeRow(1, COLUMNS);
    headerChecked = true;
  }

  /** Every lead in the sheet. Rows without a readable record (typed in by hand) are skipped. */
  async function leads() {
    await ensureHeader();
    const rows = await client.readRange(`A2:${LAST_COLUMN}`);
    const found = [];
    for (const row of rows) {
      if (!row[RECORD]) continue;
      try {
        const lead = JSON.parse(row[RECORD]);
        if (lead && lead.reference === row[0]) found.push(lead);
        else log.error(`[sheet] skipped row ${row[0] || '(no Lead ID)'}: its Record doesn't match its Lead ID`);
      } catch {
        log.error(`[sheet] skipped row ${row[0] || '(no Lead ID)'}: unreadable Record`);
      }
    }
    return found;
  }

  // One write at a time, so a new lead and a quick change to it can't both
  // decide "no row yet" and append twice.
  let queue = Promise.resolve();

  return {
    status: `Leads stored in Google Sheet, tab "${tab}"`,

    get: (id) => google(async () => (await leads()).find((l) => l.id === id) || null),
    findByReference: (ref) => google(async () => (await leads()).find((l) => l.reference === ref) || null),
    all: () => google(async () => (await leads()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),

    /** Adds the lead's row, or rewrites it if the Lead ID is already there. */
    save(lead) {
      const write = queue.then(() => google(async () => {
        await ensureHeader();
        const ids = await client.readRange('A:A');
        const index = ids.findIndex((row, i) => i > 0 && row[0] === lead.reference);
        if (index === -1) await client.appendRow(leadToRow(lead));
        else await client.writeRow(index + 1, leadToRow(lead));
      }));
      queue = write.catch(() => {});
      return write;
    },
  };
}
