/**
 * Leads in a Supabase (Postgres) table, for hosts like Vercel where the
 * server can't keep files: every request may run on a fresh machine, so the
 * database is the only place that remembers.
 *
 * One row per lead: the whole lead as JSON in `data`, plus a few columns to
 * look it up and sort by. `sheet_synced_at` is cleared on every save and set
 * once the Google Sheet row matches, so a missed sheet write can be found and
 * retried later (see server.js). Table definition: db/hvac_demo_leads.sql.
 *
 * Talks to Supabase's REST API with fetch; no client library needed. The key
 * is the project's secret (service role) key, so this file runs on the server
 * only. The table has row-level security on and no policies, so the public
 * key can't read or write it.
 */

const TABLE = 'hvac_demo_leads';
const TIMEOUT = 8000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function openSupabaseStore({ url, key }) {
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/${TABLE}`;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  // Older "service_role" keys are JWTs and also go in Authorization. Newer
  // sb_secret_ keys are not JWTs and belong in the apikey header only.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  async function call(method, query, { body, prefer } = {}) {
    const res = await fetch(`${endpoint}?${query}`, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const text = await res.text();
    if (!res.ok) {
      // 503 to the caller: our storage is down, not their request.
      const err = new Error('Lead storage is unavailable. Please try again.');
      console.error(`[store] Supabase ${method} ${res.status}: ${text.slice(0, 300)}`);
      err.status = 503;
      throw err;
    }
    return text ? JSON.parse(text) : null;
  }

  const leadsFrom = (rows) => rows.map((row) => row.data);
  const at = (msAgo) => encodeURIComponent(new Date(Date.now() - msAgo).toISOString());

  return {
    status: `Leads stored in Supabase table ${TABLE}`,

    async get(id) {
      if (!UUID.test(id)) return null;
      return leadsFrom(await call('GET', `select=data&id=eq.${id}`))[0] || null;
    },

    async findByReference(reference) {
      return leadsFrom(await call('GET', `select=data&reference=eq.${encodeURIComponent(reference)}`))[0] || null;
    },

    async all() {
      return leadsFrom(await call('GET', 'select=data&order=created_at.desc&limit=1000'));
    },

    /** Insert or replace, keyed on id. Marks the sheet row as out of date. */
    save(lead) {
      return call('POST', 'on_conflict=id', {
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: {
          id: lead.id,
          reference: lead.reference,
          data: lead,
          created_at: lead.createdAt,
          updated_at: lead.updatedAt,
          sheet_synced_at: null,
        },
      });
    },

    /**
     * The sheet now matches this version of the lead. Only marks it if the
     * lead hasn't changed since, so a newer, unsynced change isn't hidden.
     */
    markSynced(lead) {
      return call('PATCH', `id=eq.${lead.id}&updated_at=eq.${encodeURIComponent(lead.updatedAt)}`, {
        prefer: 'return=minimal',
        body: { sheet_synced_at: new Date().toISOString() },
      });
    },

    /**
     * Leads whose sheet row is missing or out of date. Skips changes from the
     * last minute, whose own sheet write may still be on its way.
     */
    async unsynced(limit = 5, graceMs = 60_000) {
      return leadsFrom(await call('GET',
        `select=data&sheet_synced_at=is.null&updated_at=lt.${at(graceMs)}&order=updated_at.asc&limit=${limit}`));
    },
  };
}
