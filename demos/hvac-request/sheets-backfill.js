/**
 * Writes every saved lead to the Google Sheet: adds missing rows, refreshes
 * existing ones, never duplicates. Run it once after turning sync on (to
 * bring in older leads), or after a Google outage that outlasted a restart.
 *
 *   npm run sheets:backfill
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openLeadStore } from './store.js';
import { createSheetsSync } from './sheets.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
// The same store the server uses: Supabase if SUPABASE_* is set, else the local file.
const store = await openLeadStore(process.env, { file: process.env.LEADS_FILE || join(ROOT, 'data', 'leads.jsonl') });
const sheets = createSheetsSync(process.env, {
  getLead: (id) => store.get(id),
  onSynced: store.markSynced ? (lead) => store.markSynced(lead) : null,
  retryInMemory: false,
});

if (!sheets.enabled) {
  console.error(sheets.status);
  process.exit(1);
}

const leads = (await store.all()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
for (const lead of leads) sheets.sync(lead);
await sheets.idle();
sheets.stop();

const failed = sheets.failedCount();
console.log(`${leads.length - failed} of ${leads.length} leads written to the sheet.`);
process.exit(failed ? 1 : 0);
