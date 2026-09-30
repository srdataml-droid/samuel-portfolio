import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { openSupabaseStore } from './store-supabase.js';

/**
 * Picks where leads are kept:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set -> a Supabase table (use this on Vercel)
 * - otherwise -> a file on this machine (local runs, Render, Railway)
 * On Vercel without a database, every request fails loudly with a 503
 * rather than pretending to save into a folder that is wiped.
 */
export async function openLeadStore(env, { file }) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
    return openSupabaseStore({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY });
  if (env.SUPABASE_URL || env.SUPABASE_SERVICE_ROLE_KEY || env.VERCEL) return unconfiguredStore();
  return openStore(file);
}

function unconfiguredStore() {
  const refuse = async () => {
    const err = new Error('Lead storage is not set up. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    err.status = 503;
    throw err;
  };
  return {
    status: 'Lead storage NOT set up: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set',
    get: refuse, all: refuse, findByReference: refuse, save: refuse,
  };
}

/**
 * Leads live in one append-only file: every save adds the lead's latest
 * version as a new line, and on start-up the last line for each id wins.
 * Nothing is ever overwritten, so a crash mid-write can't damage an older
 * record, and the file doubles as a full history. Fine for one office; swap
 * for Postgres (Supabase) when there are several.
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
