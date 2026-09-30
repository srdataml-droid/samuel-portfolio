-- HVAC lead-recovery demo (demos/hvac-request): one row per lead.
-- Used when the demo runs on Vercel (store-supabase.js).
--
-- Server-only: row-level security is on with no policies and the public
-- roles (anon, authenticated) have no access, so the publishable key can't
-- read or write it. Only the secret (service role) key can, and it gets just
-- what the app uses: no delete.

create table if not exists public.hvac_demo_leads (
  id uuid primary key,
  reference text not null unique,          -- HV-7K2Q9M, what customers quote
  data jsonb not null,                     -- the whole lead, as lead.js builds it
  created_at timestamptz not null,
  updated_at timestamptz not null,
  sheet_synced_at timestamptz              -- null = Google Sheet row missing or out of date
);

alter table public.hvac_demo_leads enable row level security;

revoke all on table public.hvac_demo_leads from anon, authenticated, service_role;
grant select, insert, update on table public.hvac_demo_leads to service_role;

create index if not exists hvac_demo_leads_created_at on public.hvac_demo_leads (created_at desc);
create index if not exists hvac_demo_leads_unsynced on public.hvac_demo_leads (updated_at) where sheet_synced_at is null;

comment on table public.hvac_demo_leads is
  'HVAC lead-recovery demo (samuel-portfolio: demos/hvac-request). Server-only; see db/hvac_demo_leads.sql there.';
