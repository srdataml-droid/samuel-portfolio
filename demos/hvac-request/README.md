# HVAC service request page

A single page where a homeowner asks a heating and cooling company for service.
The form checks what they typed, sends it to the business, and shows a
confirmation with a reference number and what happens next.

The business, "Brightside Heating & Air", is made up. Its name, phone number,
hours and promises are placeholders to swap for a real client's.

## Run it

Needs Node 18 or newer. There is nothing to install.

```bash
cd demos/hvac-request
npm start                 # http://localhost:3100
npm test                  # checks the rules, the API and the webhook hand-off
```

Send each request to a webhook (Zapier, Make, n8n, a CRM, Slack, your own API):

```bash
WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxx/yyy npm start
```

Other settings: `PORT` (default 3100), `LEADS_FILE` (default `data/leads.jsonl`)
and `OFFICE_TOKEN` (turns on the office API, below).

## What happens on submit

1. The browser checks every field and points at anything missing, in plain words.
2. It POSTs the form as JSON to `/api/requests`.
3. The server checks everything again with the same rules (`public/validate.js`),
   because a browser can be bypassed. Bad input gets a `422` with a message per field.
4. The server triages the request (`rules.js`), turns it into an internal lead (`lead.js`) and adds it to
   `data/leads.jsonl` **before** calling the webhook, so the lead is saved even
   when the webhook is down.
5. If `WEBHOOK_URL` is set, it POSTs `{ "event": "service_request.created", "lead": {...} }`.
   A webhook failure is logged and the customer still gets their confirmation.
6. The page shows the thank-you view: the reference (e.g. `HV-7K2Q9M`), what
   they asked for, and three next steps. Step one is the real callback deadline.

Spam: a hidden `company` field. People never see it; bots fill it in, and their
submissions are dropped with a normal-looking reply.

## The business rules

All of them live in `rules.js`, as settings at the top. Change a number there
and the deadlines, the customer's confirmation and the call list all follow.
Every value is a default for a real owner to confirm.

**1. Triage: how urgent is this?** Priority 1 (drop everything) to 4.

| The customer picked | Priority | First call due |
| --- | --- | --- |
| Emergency | 1 | 30 minutes, day or night |
| Soon | 2 | 2 office hours |
| This week | 3 | 4 office hours |
| Flexible | 4 | 8 office hours |

- Mentions **gas, smoke, a burning smell, sparks or carbon monoxide** anywhere →
  priority 1, whatever they picked. Their confirmation also tells them to leave
  the house and call 911 if they smell gas or smoke.
- Mentions **a baby, an elderly or sick person, someone pregnant, or medical
  equipment** → one level more urgent.

"Office hours" means Mon to Fri 7am to 7pm, Sat 8am to 4pm, Chicago time. A
"soon" request at 10pm Friday is due at 10am Saturday, not at midnight.

**2. The promise matches the deadline.** The confirmation page doesn't hard-code
"we'll call within X". The server works out the real deadline and says it in
plain words: "by 4:15pm today", "by 10:00am Saturday".

**3. The lead's life.** Only these moves are allowed (`LEAD_FLOW` and `BOOKING_FLOW` in `lead.js`):

```
leadStatus     new → contacted → qualified → won
                 └──────────┴───────────┴→ lost → contacted (they called back)
bookingStatus  not_booked → tentative → booked → completed
                                 └────────┴→ cancelled → tentative / booked
```

| What the office does | What changes | Follow-up |
| --- | --- | --- |
| Calls, **no answer** | attempt counted | retry in 15 min (P1) or 2 office hours |
| 4th unanswered call in a row, nothing booked | lead → `lost`, reason `unreachable` | none |
| Calls, **reached** | `new`/`lost` → `contacted` | book within 4 office hours |
| Books, not confirmed | `qualified`, `tentative` | confirm within 4 office hours, and at least 1 hour before the visit starts |
| Books, confirmed | `qualified`, `booked` | none until the visit |
| Visit done | `won`, `completed` | none |
| Visit cancelled | `cancelled` | offer to rebook within 8 office hours |
| No job (any reason) | `lost`, reason required | none |

Anything else (finishing a job that was never booked, cancelling a finished
job) is refused with a plain explanation. Every action is written to the
lead's `history`.

**4. The call list.** Leads the office owes a reply, with overdue ones first,
then by priority, then by deadline.

## The internal lead

The customer never sees this. `mock-lead.json` is a real example, produced by
the code: an emergency with a newborn in the home, reached, visit pencilled in.

| Field | Meaning |
| --- | --- |
| `triage` | `priority` 1 to 4, plus the words that raised it (`safetyConcern`, `vulnerableOccupant`) |
| `aiSummary` | two-line brief for whoever calls. **Written by rules today, not a language model** (see below) |
| `leadStatus` | `new`, `contacted`, `qualified`, `won`, `lost` |
| `lastContact` | `{ at, channel, by, outcome, note }` of the latest call, text or email |
| `bookingStatus` | `not_booked`, `tentative`, `booked`, `completed`, `cancelled` |
| `followUpNeeded`, `followUpDueAt` | whether the office owes the customer something, and by when |
| `appointment` | `{ date, window, technician }` once something is booked |
| `history` | every action, in order |

About `aiSummary`: `summarize()` in `rules.js` builds it from the triage and
the first sentence of the description. It is the only function to replace
when a language model is added; nothing else changes. The field keeps its name
so that swap needs no data migration.

## Office API

Customer details are private, so these endpoints are off until you set a
password: `OFFICE_TOKEN=some-long-secret npm start`. Send it as
`Authorization: Bearer some-long-secret`.

| Request | Does |
| --- | --- |
| `GET /api/leads` | the call list |
| `GET /api/leads?all=1` | every lead, newest first |
| `GET /api/leads/HV-7K2Q9M` | one lead, by reference or id |
| `POST /api/leads/HV-7K2Q9M/contact` | `{ "outcome": "reached" \| "no_answer" \| "left_message", "channel": "phone", "by": "Maria", "note": "..." }` |
| `POST /api/leads/HV-7K2Q9M/book` | `{ "date": "2026-10-02", "window": "morning", "confirmed": true, "technician": "Luis" }` |
| `POST /api/leads/HV-7K2Q9M/complete` | `{ "note": "..." }` |
| `POST /api/leads/HV-7K2Q9M/cancel` | `{ "reason": "..." }` |
| `POST /api/leads/HV-7K2Q9M/lost` | `{ "reason": "went with another company" }` |

Try it:

```bash
T='Authorization: Bearer some-long-secret'
curl -s localhost:3100/api/leads -H "$T"
curl -s -X POST localhost:3100/api/leads/HV-7K2Q9M/contact -H "$T" \
  -H 'Content-Type: application/json' -d '{"outcome":"reached","by":"Maria"}'
```

With `WEBHOOK_URL` set, every change is also sent there as
`{ "event": "lead.updated", "action": "book", "lead": {...} }`, so a CRM,
spreadsheet or Slack channel can stay in step.

## Files

| File | What it does |
| --- | --- |
| `public/index.html`, `styles.css` | The page |
| `public/app.js` | Fills the choices, shows errors, sends the form, shows the confirmation |
| `public/validate.js` | The rules and the choice lists, shared by browser and server |
| `rules.js` | **The business rules**: office hours, deadlines, triage words, the summary |
| `lead.js` | The lead record and the office actions (contact, book, complete, cancel, lost) |
| `store.js` | Saves leads to `data/leads.jsonl`, one line per change |
| `server.js` | Serves the page, the customer endpoint and the office endpoints |
| `mock-lead.json` | A real lead, produced by the code |
| `*.test.js` | `npm test` |

## Before showing it to a real business

- Replace the name, phone number (in `index.html` and the error message in `app.js`),
  hours and the three selling points with ones the business can stand behind.
- Go through the settings at the top of `rules.js` with the owner: time zone,
  hours, response times, retry limits. The confirmation page promises exactly those.
- Hosts such as Render and Railway wipe local files on each deploy, so
  `data/leads.jsonl` is only a safety net. The webhook (or a database) is the real record.
- There is no rate limiting. Add it before putting this on a public URL long term.
