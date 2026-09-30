import { randomBytes, randomUUID } from 'node:crypto';
import { SERVICES, TIME_WINDOWS, URGENCY } from './public/validate.js';
import {
  CONFIRM_TENTATIVE_WITHIN, MAX_CALL_ATTEMPTS, REBOOK_AFTER_CANCEL_WITHIN,
  addOfficeMinutes, confirmDeadline, responseDeadline, retryDeadline, summarize, triage,
} from './rules.js';

/**
 * The internal record the office works from. The customer never sees it.
 *
 *   leadStatus     new -> contacted -> qualified -> won, or lost at any point
 *   bookingStatus  not_booked -> tentative -> booked -> completed, or cancelled
 *   lastContact    null, or { at, channel, by, outcome, note }
 *   aiSummary      a short brief for whoever calls the customer
 *   followUpNeeded true while the office owes the customer something;
 *                  followUpDueAt says by when
 *
 * Each action below takes a lead and returns an updated copy, or throws a
 * LeadError when the move is not allowed. Nothing is changed in place.
 */

// Which status may follow which. Staying put (e.g. rescheduling a booking) is always allowed.
export const LEAD_FLOW = {
  new: ['contacted', 'qualified', 'lost'],
  contacted: ['qualified', 'lost'],
  qualified: ['won', 'lost'],
  won: [],
  lost: ['contacted'], // they called back
};
export const BOOKING_FLOW = {
  not_booked: ['tentative', 'booked', 'cancelled'],
  tentative: ['booked', 'cancelled'],
  booked: ['completed', 'cancelled'],
  cancelled: ['tentative', 'booked'],
  completed: [],
};
export const LEAD_STATUSES = Object.keys(LEAD_FLOW);
export const BOOKING_STATUSES = Object.keys(BOOKING_FLOW);
export const CONTACT_OUTCOMES = ['reached', 'no_answer', 'left_message'];
export const CONTACT_CHANNELS = ['phone', 'sms', 'email'];

export class LeadError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

/** Short code the customer can quote on the phone, e.g. "HV-7K2Q9M". */
export function makeReference() {
  // No 0/O or 1/I, so it can be read aloud without confusion.
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `HV-${code}`;
}

// ---- Helpers

function move(lead, field, to) {
  const flow = field === 'leadStatus' ? LEAD_FLOW : BOOKING_FLOW;
  const from = lead[field];
  if (from !== to && !flow[from].includes(to))
    throw new LeadError(`Can't change ${field} from "${from}" to "${to}".`);
  lead[field] = to;
}

function followUp(lead, dueAt) {
  lead.followUpNeeded = Boolean(dueAt);
  lead.followUpDueAt = dueAt ? new Date(dueAt).toISOString() : null;
}

function logEvent(lead, now, action, details = {}) {
  lead.history.push({ at: now.toISOString(), action, ...details });
  lead.updatedAt = now.toISOString();
}

const text = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const pick = (value, allowed, field) => {
  if (!allowed.includes(value)) throw new LeadError(`${field} must be one of: ${allowed.join(', ')}.`, 422);
  return value;
};

// ---- Create

/** Builds a lead from a request that has already passed validateRequest. */
export function createLead(data, { now = new Date() } = {}) {
  const request = {
    service: data.service,
    serviceLabel: SERVICES[data.service],
    description: data.description,
    urgency: data.urgency,
    urgencyLabel: URGENCY[data.urgency],
    preferredDate: data.preferredDate || null,
    preferredWindow: data.preferredWindow,
    preferredWindowLabel: TIME_WINDOWS[data.preferredWindow],
  };
  const t = triage(request);

  const lead = {
    id: randomUUID(),
    reference: makeReference(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: 'website_form',
    customer: { name: data.name, phone: data.phone, email: data.email },
    request,
    triage: t,

    aiSummary: null,
    leadStatus: 'new',
    lastContact: null,
    bookingStatus: 'not_booked',
    followUpNeeded: true,
    followUpDueAt: responseDeadline(t.priority, now).toISOString(),

    callAttempts: 0,
    unansweredInARow: 0,
    appointment: null,
    closedReason: null,
    history: [],
  };
  lead.aiSummary = summarize(lead);
  logEvent(lead, now, 'created', { priority: t.priority });
  return lead;
}

// ---- Office actions

/** The office called, texted or emailed the customer. */
export function recordContact(current, input = {}, now = new Date()) {
  const lead = structuredClone(current);
  if (lead.leadStatus === 'won') throw new LeadError('This job is finished. Start a new request instead.');

  const contact = {
    at: now.toISOString(),
    channel: pick(input.channel || 'phone', CONTACT_CHANNELS, 'channel'),
    by: text(input.by, 80) || 'Office',
    outcome: pick(input.outcome, CONTACT_OUTCOMES, 'outcome'),
    note: text(input.note),
  };
  lead.lastContact = contact;
  lead.callAttempts += 1;

  if (contact.outcome === 'reached') {
    lead.unansweredInARow = 0;
    if (lead.leadStatus === 'new' || lead.leadStatus === 'lost') move(lead, 'leadStatus', 'contacted');
    lead.closedReason = null;
    // Talked to them but nothing is confirmed yet: chase within the confirm
    // window, sooner if a pencilled-in visit is close.
    if (lead.bookingStatus === 'booked') followUp(lead, null);
    else if (lead.bookingStatus === 'tentative') followUp(lead, confirmDeadline(now, lead.appointment));
    else followUp(lead, addOfficeMinutes(now, CONFIRM_TENTATIVE_WITHIN));
  } else {
    lead.unansweredInARow += 1;
    const unbooked = lead.bookingStatus === 'not_booked' || lead.bookingStatus === 'cancelled';
    if (unbooked && lead.leadStatus !== 'lost' && lead.unansweredInARow >= MAX_CALL_ATTEMPTS) {
      move(lead, 'leadStatus', 'lost');
      lead.closedReason = 'unreachable';
      followUp(lead, null);
    } else if (lead.bookingStatus !== 'booked' && lead.leadStatus !== 'lost') {
      followUp(lead, retryDeadline(lead.triage.priority, now));
    }
  }

  logEvent(lead, now, 'contact', { outcome: contact.outcome, channel: contact.channel, by: contact.by });
  return lead;
}

/** Put a visit on the calendar. confirmed: false means "pencilled in". */
export function book(current, input = {}, now = new Date()) {
  const lead = structuredClone(current);
  if (lead.leadStatus === 'won' || lead.leadStatus === 'lost')
    throw new LeadError(`This lead is ${lead.leadStatus}. Record a contact to reopen it first.`);

  const date = text(input.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new LeadError('date must look like 2026-10-02.', 422);
  const window = pick(input.window, Object.keys(TIME_WINDOWS), 'window');
  const confirmed = input.confirmed !== false;

  move(lead, 'bookingStatus', confirmed ? 'booked' : 'tentative');
  move(lead, 'leadStatus', 'qualified');
  lead.appointment = { date, window, windowLabel: TIME_WINDOWS[window], technician: text(input.technician, 80) || null };
  followUp(lead, confirmed ? null : confirmDeadline(now, lead.appointment));

  logEvent(lead, now, confirmed ? 'booked' : 'tentative', { date, window });
  return lead;
}

/** Spoke to them: it's a real job the business can and wants to do. */
export function qualify(current, input = {}, now = new Date()) {
  const lead = structuredClone(current);
  if (lead.leadStatus !== 'new' && lead.leadStatus !== 'contacted')
    throw new LeadError(`This lead is already ${lead.leadStatus}.`);
  move(lead, 'leadStatus', 'qualified');
  // Still owed a booking, unless one is already in place.
  if (lead.bookingStatus === 'booked') followUp(lead, null);
  else if (lead.bookingStatus === 'tentative') followUp(lead, confirmDeadline(now, lead.appointment));
  else followUp(lead, addOfficeMinutes(now, CONFIRM_TENTATIVE_WITHIN));
  logEvent(lead, now, 'qualified', { note: text(input.note) });
  return lead;
}

/** The visit happened. */
export function complete(current, input = {}, now = new Date()) {
  const lead = structuredClone(current);
  move(lead, 'bookingStatus', 'completed');
  move(lead, 'leadStatus', 'won');
  followUp(lead, null);
  logEvent(lead, now, 'completed', { note: text(input.note) });
  return lead;
}

/** The visit is off, but the customer may still want one. */
export function cancel(current, input = {}, now = new Date()) {
  const lead = structuredClone(current);
  if (lead.bookingStatus !== 'tentative' && lead.bookingStatus !== 'booked')
    throw new LeadError('There is no visit to cancel.');
  move(lead, 'bookingStatus', 'cancelled');
  followUp(lead, addOfficeMinutes(now, REBOOK_AFTER_CANCEL_WITHIN));
  logEvent(lead, now, 'cancelled', { reason: text(input.reason) });
  return lead;
}

/** No job: went elsewhere, out of area, price, spam, unreachable. */
export function markLost(current, input = {}, now = new Date()) {
  const lead = structuredClone(current);
  const reason = text(input.reason, 200);
  if (!reason) throw new LeadError('Please give a reason, e.g. "went with another company".', 422);
  move(lead, 'leadStatus', 'lost');
  if (lead.bookingStatus === 'tentative' || lead.bookingStatus === 'booked') move(lead, 'bookingStatus', 'cancelled');
  lead.closedReason = reason;
  followUp(lead, null);
  logEvent(lead, now, 'lost', { reason });
  return lead;
}

export const ACTIONS = { contact: recordContact, qualify, book, complete, cancel, lost: markLost };

// A valid example input per action, used only to test whether a move is allowed.
const TRIAL_INPUT = {
  contact: { outcome: 'reached' },
  book: { date: '2000-01-01', window: 'any' },
  lost: { reason: 'trial' },
};

/**
 * Which office buttons make sense for this lead right now. Each action is
 * tried on a copy; if the rules refuse it, or it would change neither
 * status, the button is hidden. So the dashboard can never offer a move
 * the flow tables don't allow, and those rules live in one place only.
 */
export function availableActions(lead, now = new Date()) {
  return Object.keys(ACTIONS).filter((name) => {
    try {
      const after = ACTIONS[name](lead, TRIAL_INPUT[name], now);
      // Logging another call is always useful; other actions must change something.
      return name === 'contact'
        || after.leadStatus !== lead.leadStatus
        || after.bookingStatus !== lead.bookingStatus;
    } catch (err) {
      if (err instanceof LeadError) return false;
      throw err;
    }
  });
}

/** True when the office owes this customer something and the time has passed. */
export function isOverdue(lead, now = new Date()) {
  return lead.followUpNeeded && Boolean(lead.followUpDueAt) && new Date(lead.followUpDueAt) < now;
}

const isOpen = (lead) => lead.leadStatus !== 'won' && lead.leadStatus !== 'lost';

/**
 * Every lead, in the order an owner should look at them:
 *   1. overdue follow-ups, most urgent first
 *   2. other follow-ups, most urgent first, then soonest deadline
 *   3. open leads nothing is owed on (booked), by visit date
 *   4. closed leads (won, lost), most recently changed first
 */
export function officeView(leads, now = new Date()) {
  const tier = (l) => (l.overdue ? 0 : l.followUpNeeded ? 1 : isOpen(l) ? 2 : 3);
  return leads
    .map((l) => ({ ...l, overdue: isOverdue(l, now), actions: availableActions(l, now) }))
    .sort((a, b) => {
      const byTier = tier(a) - tier(b);
      if (byTier) return byTier;
      if (tier(a) <= 1)
        return (a.triage.priority - b.triage.priority)
          || (new Date(a.followUpDueAt) - new Date(b.followUpDueAt));
      if (tier(a) === 2) return (a.appointment?.date || '').localeCompare(b.appointment?.date || '');
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

/** The five numbers at the top of the office screen. */
export function officeStats(leads) {
  const count = (test) => leads.filter(test).length;
  return {
    newLeads: count((l) => l.leadStatus === 'new'),
    needFollowUp: count((l) => l.followUpNeeded),
    urgent: count((l) => isOpen(l) && l.triage.priority === 1 && l.bookingStatus !== 'booked'),
    booked: count((l) => l.bookingStatus === 'booked'),
    won: count((l) => l.leadStatus === 'won'),
  };
}

/** The office's call list: overdue first, then by priority, then by deadline. */
export function workQueue(leads, now = new Date()) {
  return leads
    .filter((l) => l.followUpNeeded)
    .map((l) => ({ ...l, overdue: isOverdue(l, now) }))
    .sort((a, b) =>
      (b.overdue - a.overdue)
      || (a.triage.priority - b.triage.priority)
      || (new Date(a.followUpDueAt) - new Date(b.followUpDueAt)));
}
