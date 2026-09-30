import { randomBytes, randomUUID } from 'node:crypto';
import { SERVICES, TIME_WINDOWS, URGENCY } from './public/validate.js';

/**
 * The internal record the office works from. The customer never sees it.
 *
 * Every tracking field starts in its "nothing has happened yet" state. The
 * rules that move a lead along (who calls whom, when, what counts as booked)
 * are business logic and are deliberately not decided here.
 *
 *   leadStatus     new | contacted | qualified | won | lost
 *   bookingStatus  not_booked | tentative | booked | completed | cancelled
 *   lastContact    null, or { at, channel: 'phone'|'sms'|'email', by, note }
 *   aiSummary      null until something writes a short summary for the office
 *   followUpNeeded true while the office still owes the customer a reply
 */
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];
export const BOOKING_STATUSES = ['not_booked', 'tentative', 'booked', 'completed', 'cancelled'];

/** Short code the customer can quote on the phone, e.g. "HV-7K2Q9M". */
export function makeReference() {
  // No 0/O or 1/I, so it can be read aloud without confusion.
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `HV-${code}`;
}

/** Builds a lead from a request that has already passed validateRequest. */
export function createLead(data, { now = new Date() } = {}) {
  return {
    id: randomUUID(),
    reference: makeReference(),
    createdAt: now.toISOString(),
    source: 'website_form',

    customer: {
      name: data.name,
      phone: data.phone,
      email: data.email,
    },

    request: {
      service: data.service,
      serviceLabel: SERVICES[data.service],
      description: data.description,
      urgency: data.urgency,
      urgencyLabel: URGENCY[data.urgency],
      preferredDate: data.preferredDate || null,
      preferredWindow: data.preferredWindow,
      preferredWindowLabel: TIME_WINDOWS[data.preferredWindow],
    },

    aiSummary: null,
    leadStatus: 'new',
    lastContact: null,
    bookingStatus: 'not_booked',
    followUpNeeded: true,
  };
}
