import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { openSheetStore } from './sheets.js';

const GOOGLE = ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY'];

/**
 * Picks where leads are kept:
 * - all three GOOGLE_* settings -> the Google Sheet (use this on Vercel)
 * - none of them -> a file on this machine (local runs)
 * With only some of them, or on Vercel without them, every request fails
 * with a 503 rather than saving somewhere the owner won't look, or into a
 * folder Vercel wipes.
 */
export async function openLeadStore(env, { file }) {
  const set = GOOGLE.filter((name) => env[name]);
  if (set.length === GOOGLE.length) return openSheetStore(env);
  if (set.length || env.VERCEL) return unconfiguredStore(GOOGLE.filter((name) => !env[name]));
  return openStore(file);
}

function unconfiguredStore(missing) {
  // The reason goes to the server log; the caller only hears "unavailable".
  const refuse = async () => {
    console.error(`[store] Lead storage is not set up: missing ${missing.join(', ')}`);
    const err = new Error('Lead storage is unavailable. Please try again.');
    err.status = 503;
    throw err;
  };
  return {
    status: `Lead storage NOT set up: missing ${missing.join(', ')}`,
    get: refuse, all: refuse, findByReference: refuse, save: refuse,
  };
}

/**
 * Leads live in one append-only file: every save adds the lead's latest
 * version as a new line, and on start-up the last line for each id wins.
 * Nothing is ever overwritten, so a crash mid-write can't damage an older
 * record, and the file doubles as a full history. Used when no Google
 * Sheet is set up, e.g. trying the demo on your own machine.
 */
export async function openStore(file) {
  const leads = new Map();
  try {
    for (const line of (await readFile(file, 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      try {
        const lead = JSON.parse(line);
        leads.set(lead.id, lead);
      } catch {
        console.error('[store] skipped an unreadable line');
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  // One write at a time, in order. A failed write rejects for its own caller
  // but doesn't block the writes queued behind it.
  let queue = Promise.resolve();

  return {
    status: `Leads stored in ${file}`,
    get: (id) => leads.get(id) || null,
    all: () => [...leads.values()],
    findByReference: (ref) => [...leads.values()].find((l) => l.reference === ref) || null,
    save(lead) {
      // Memory is updated straight away so two quick actions on the same
      // lead see each other's changes.
      leads.set(lead.id, lead);
      const write = queue.then(async () => {
        await mkdir(dirname(file), { recursive: true });
        await appendFile(file, JSON.stringify(lead) + '\n');
      });
      queue = write.catch(() => {});
      return write;
    },
  };
}
