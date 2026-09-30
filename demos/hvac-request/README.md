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

Other settings: `PORT` (default 3100), `LEADS_FILE` (default `data/leads.jsonl`),
`OFFICE_TOKEN` (turns on the office screen and API, below) and the `GOOGLE_*`
settings (copy every lead to a Google Sheet, below). Without any of them the
demo runs as is.

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

- Mentions **gas (or rotten eggs), carbon monoxide, smoke, a burning smell or
  sparks** anywhere → priority 1, whatever they picked. See "Safety" below.
- Mentions **a baby, an elderly or sick person, someone pregnant, or medical
  equipment** → one level more urgent.

"Office hours" means Mon to Fri 7am to 7pm, Sat 8am to 4pm, Chicago time. A
"soon" request at 10pm Friday is due at 10am Saturday, not at midnight.

**Safety.** A request that mentions a hazard never tells the customer to wait
for a callback. Their confirmation opens with a red emergency box whose steps
fit the hazard (`EMERGENCY_STEPS` in `rules.js`):

| Hazard | The customer is told to |
| --- | --- |
| Gas | leave the house, not touch switches or use the phone inside, call 911 or the gas company from outside |
| Carbon monoxide | get everyone to fresh air, call 911, not go back in until told it's safe |
| Fire / electrical | get out and call 911 if there's smoke or flames; otherwise switch the system off if safe |

The request is still saved and the office still gets it at priority 1 with a
30-minute callback. The server logs a `[SAFETY]` line and, with `WEBHOOK_URL`
set, sends a separate `{ "event": "safety_alert", "hazard": "gas", "lead": {...} }`
so Zapier or similar can text the owner straight away.

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
| Qualifies it (a real job) | `new`/`contacted` → `qualified` | book within 4 office hours |
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

## Office screen

`http://localhost:3100/office`, for the owner or whoever answers the phone.
Start the server with `OFFICE_TOKEN=some-long-secret npm start` and sign in
with that password. The password is kept for the browser tab only. The page
itself contains no customer data; everything comes from the office API, which
refuses anyone without the password.

- **Five numbers at the top:**
  - New leads: nobody has spoken to them yet.
  - Need follow-up: the office owes them something.
  - Urgent: open, priority 1, not yet booked. The box turns red when it's above zero.
  - Booked: a confirmed visit is in place.
  - Won: job done.
- **One row per request:** priority (with a SAFETY badge for hazards), customer
  and phone (tap to call), service and summary, when it came in, the callback
  deadline (red "Overdue" once passed), lead status, booking status, follow-up.
- **Order:** overdue first, then other follow-ups by priority and deadline,
  then booked visits, then won and lost.
- **Buttons:** Mark Contacted, Mark Qualified, Mark Booked (asks for day and
  window), Mark Completed, Mark Cancelled (asks to confirm), Mark Lost (asks
  for a reason). A lead shows only the buttons its current status allows. The
  server works these out with the same rules that enforce the moves
  (`availableActions` in `lead.js`), so the screen can't offer a move the rules
  refuse.
- Refreshes every 30 seconds, so new requests appear without reloading.
- On phones each request becomes a card.

## Office API

Customer details are private, so these endpoints are off until you set a
password: `OFFICE_TOKEN=some-long-secret npm start`. Send it as
`Authorization: Bearer some-long-secret`.

| Request | Does |
| --- | --- |
| `GET /api/leads` | the call list |
| `GET /api/leads?all=1` | every lead in office-screen order, each with its allowed `actions`, plus `stats` and `timezone` |
| `GET /api/leads/HV-7K2Q9M` | one lead, by reference or id |
| `POST /api/leads/HV-7K2Q9M/contact` | `{ "outcome": "reached" \| "no_answer" \| "left_message", "channel": "phone", "by": "Maria", "note": "..." }` |
| `POST /api/leads/HV-7K2Q9M/qualify` | `{ "note": "..." }` |
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

## Google Sheets sync

Optional. When it's on, every lead has exactly one row in a Google Sheet, so
the owner can see the whole pipeline outside the office screen.

- **New request:** a row is added.
- **Status change:** that same row is updated, found by Lead ID (column A).
  The ID is looked up fresh every time, so sorting, filtering or moving rows in
  the sheet is safe and never causes a duplicate.
- **Google unavailable:** the lead is saved locally and the customer gets their
  confirmation as normal. The failure is logged as
  `[sheets] HV-XXXXXX not synced, will retry: ...`, and the lead is retried every
  3 minutes with its latest version.
- **Not configured:** sync is simply off. The server says so on start-up.

The local file stays the record; the sheet is a copy. Writes happen in the
background after the lead is saved, so a slow Google never slows the form.
Everything is written as plain text, so a customer typing `=SOMETHING(...)`
can't create a formula in the owner's sheet.

Columns (created in row 1 automatically): Lead ID, Received At, Customer Name,
Phone, Email, Service, Problem, Priority, Hazard, Lead Status, Booking Status,
Follow-up Needed, Callback Deadline, Preferred Day, Preferred Time, AI Summary,
Last Contact, Updated At. Times are the business's time zone (`TIMEZONE` in
`rules.js`), written as `2026-09-30 14:07` so they sort correctly.

### Settings

| Variable | Required | What it is |
| --- | --- | --- |
| `GOOGLE_SHEET_ID` | yes | The long ID in the sheet's URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | yes | The service account's email, e.g. `hvac-sync@my-project.iam.gserviceaccount.com` (`client_email` in its key file) |
| `GOOGLE_PRIVATE_KEY` | yes | The service account's private key (`private_key` in its key file), the whole `-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----` text. Real line breaks or `\n` both work |
| `GOOGLE_SHEET_TAB` | no | The tab to write to. Default `Leads` |

All three required ones must be set, or sync stays off (the start-up log says
which is missing). Never commit these values; `.env*` files are already
ignored by git.

### Setup (about 10 minutes, free)

1. **Create the sheet.** In Google Sheets, make a new spreadsheet and rename
   its first tab to `Leads` (or set `GOOGLE_SHEET_TAB` to the tab's name). Leave
   the tab empty; the header row is written for you. Copy the ID from the URL.
2. **Create a Google Cloud project** at console.cloud.google.com (or use an
   existing one).
3. **Turn on the Sheets API:** APIs & Services → Library → "Google Sheets API"
   → Enable.
4. **Create a service account:** IAM & Admin → Service Accounts → Create. Give
   it a name like `hvac-sync`. It needs no roles in the project.
5. **Make a key:** open the service account → Keys → Add key → Create new key
   → JSON. A file downloads. Keep it private; it's a password.
6. **Share the sheet with the service account:** in the sheet, Share → paste
   the service account's email → Editor. (Without this, Google answers 403.)
7. **Set the variables** from the key file: `client_email` →
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `private_key` → `GOOGLE_PRIVATE_KEY`, plus
   `GOOGLE_SHEET_ID`. Locally:

   ```bash
   export GOOGLE_SHEET_ID='1AbC...xyz'
   export GOOGLE_SERVICE_ACCOUNT_EMAIL='hvac-sync@my-project.iam.gserviceaccount.com'
   export GOOGLE_PRIVATE_KEY="$(node -p "require('./path/to/key.json').private_key")"
   npm start
   ```

   On Render, Railway or similar, paste the same three values into the
   service's environment variables. The private key can be pasted as one line
   with `\n` in it, exactly as it appears in the JSON file.
8. **Check it:** the start-up log should say `Google Sheets sync on: tab "Leads"`.
   Submit a request on the page; its row appears within a few seconds.
9. **Bring in older leads** (optional): `npm run sheets:backfill` writes a row
   for every lead already saved locally. It's safe to run again; it updates
   rather than duplicates. Also run it if the server restarted while Google
   was unreachable, since the automatic retry list is kept in memory.

**If rows don't appear**, the server log has a `[sheets]` line with Google's
reason: 403 means the sheet isn't shared with the service account, 404 means a
wrong `GOOGLE_SHEET_ID`, "Unable to parse range" means the tab name doesn't
match, and "isn't our header" means the tab already had other data in row 1
(use an empty tab).

## Files

| File | What it does |
| --- | --- |
| `public/index.html`, `styles.css` | The page |
| `public/app.js` | Fills the choices, shows errors, sends the form, shows the confirmation |
| `public/validate.js` | The rules and the choice lists, shared by browser and server |
| `public/office.html`, `office.css`, `office.js` | The office screen at `/office` |
| `rules.js` | **The business rules**: office hours, deadlines, triage words, the summary |
| `lead.js` | The lead record, the office actions (contact, qualify, book, complete, cancel, lost), which actions each lead allows, office order and summary numbers |
| `store.js` | Saves leads to `data/leads.jsonl`, one line per change |
| `server.js` | Serves the page, the customer endpoint and the office endpoints |
| `sheets.js` | Google Sheets sync: one row per lead, updated in place |
| `sheets-backfill.js` | `npm run sheets:backfill`: writes every saved lead to the sheet |
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
