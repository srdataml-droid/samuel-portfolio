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

Other settings: `PORT` (default 3100) and `LEADS_FILE` (default `data/leads.jsonl`).

## What happens on submit

1. The browser checks every field and points at anything missing, in plain words.
2. It POSTs the form as JSON to `/api/requests`.
3. The server checks everything again with the same rules (`public/validate.js`),
   because a browser can be bypassed. Bad input gets a `422` with a message per field.
4. The server turns the request into an internal lead (`lead.js`) and adds it to
   `data/leads.jsonl` **before** calling the webhook, so the lead is saved even
   when the webhook is down.
5. If `WEBHOOK_URL` is set, it POSTs `{ "event": "service_request.created", "lead": {...} }`.
   A webhook failure is logged and the customer still gets their confirmation.
6. The page shows the thank-you view: the reference (e.g. `HV-7K2Q9M`), what
   they asked for, and three next steps. Step one depends on urgency.

Spam: a hidden `company` field. People never see it; bots fill it in, and their
submissions are dropped with a normal-looking reply.

## The internal lead

The customer never sees this. `mock-lead.json` is a filled-in example; a new
lead starts like this:

| Field | Starts as | Values |
| --- | --- | --- |
| `aiSummary` | `null` | a short note for the office, written later |
| `leadStatus` | `"new"` | `new`, `contacted`, `qualified`, `won`, `lost` |
| `lastContact` | `null` | `{ at, channel, by, note }` |
| `bookingStatus` | `"not_booked"` | `not_booked`, `tentative`, `booked`, `completed`, `cancelled` |
| `followUpNeeded` | `true` | `true` while the office owes the customer a reply |

Nothing in this demo moves a lead from one state to the next. That is the
business logic, and it is the next piece of work.

## Files

| File | What it does |
| --- | --- |
| `public/index.html`, `styles.css` | The page |
| `public/app.js` | Fills the choices, shows errors, sends the form, shows the confirmation. Callback promises per urgency are at the top (`CALLBACK`) |
| `public/validate.js` | The rules and the choice lists, shared by browser and server |
| `server.js` | Serves the page, `POST /api/requests`, saves and forwards leads |
| `lead.js` | Builds the internal lead record |
| `mock-lead.json` | Example of a lead a few minutes after the office called back |

## Before showing it to a real business

- Replace the name, phone number (in `index.html` and the error message in `app.js`),
  hours and the three selling points with ones the business can stand behind.
- Set `CALLBACK` in `app.js` to response times they can actually keep.
- Hosts such as Render and Railway wipe local files on each deploy, so
  `data/leads.jsonl` is only a safety net. The webhook (or a database) is the real record.
- There is no rate limiting. Add it before putting this on a public URL long term.
