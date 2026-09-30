import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addOfficeMinutes, businessTime, confirmDeadline, describeDeadline, triage, customerEmergency, customerNextStep } from './rules.js';
import { createLead, recordContact, qualify, book, complete, cancel, markLost, workQueue, availableActions, officeView, officeStats } from './lead.js';

// Office: Mon-Fri 7am-7pm, Sat 8am-4pm, Chicago time (UTC-5 until Nov 1, then UTC-6).

test('office minutes skip nights and Sundays', () => {
  // Fri 10pm + 2h -> Sat 10am
  assert.equal(addOfficeMinutes('2026-10-03T03:00:00Z', 120).toISOString(), '2026-10-03T15:00:00.000Z');
  // Sat 3:30pm + 2h -> 30 min Saturday, closed Sunday, Mon 8:30am
  assert.equal(addOfficeMinutes('2026-10-03T20:30:00Z', 120).toISOString(), '2026-10-05T13:30:00.000Z');
  // Mon 6am (before opening) + 30 min -> 7:30am
  assert.equal(addOfficeMinutes('2026-10-05T11:00:00Z', 30).toISOString(), '2026-10-05T12:30:00.000Z');
});

test('office minutes survive the daylight-saving change', () => {
  // Sat Oct 31 3pm CDT + 2h -> 1h Saturday, clocks go back Sunday, Mon Nov 2 8am CST
  assert.equal(addOfficeMinutes('2026-10-31T20:00:00Z', 120).toISOString(), '2026-11-02T14:00:00.000Z');
});

test('a pencilled-in visit is confirmed an hour before it starts, not after', () => {
  assert.equal(businessTime('2026-09-30', 12 * 60).toISOString(), '2026-09-30T17:00:00.000Z'); // noon CDT
  assert.equal(businessTime('2026-12-01', 8 * 60).toISOString(), '2026-12-01T14:00:00.000Z'); // 8am CST
  const wed922am = new Date('2026-09-30T14:22:00Z');
  // Same-day afternoon visit: confirm by 11am, not 1:22pm
  assert.equal(confirmDeadline(wed922am, { date: '2026-09-30', window: 'afternoon' }).toISOString(), '2026-09-30T16:00:00.000Z');
  // Visit next week: the usual 4 office hours
  assert.equal(confirmDeadline(wed922am, { date: '2026-10-07', window: 'morning' }).toISOString(), '2026-09-30T18:22:00.000Z');
  // Visit about to start: due now, never in the past
  assert.equal(confirmDeadline(wed922am, { date: '2026-09-30', window: 'morning' }).toISOString(), wed922am.toISOString());
});

test('deadlines read like a person wrote them', () => {
  const now = new Date('2026-09-30T19:07:00Z'); // Wed 2:07pm
  assert.equal(describeDeadline('2026-09-30T19:37:00Z', now), 'within 30 minutes');
  assert.equal(describeDeadline('2026-09-30T21:07:00Z', now), 'by 4:15pm today');
  assert.equal(describeDeadline('2026-10-01T12:30:00Z', now), 'by 7:30am tomorrow');
  assert.equal(describeDeadline('2026-10-03T15:00:00Z', now), 'by 10:00am Saturday');
});

test('triage: urgency sets priority, danger and vulnerable people raise it', () => {
  const t = (urgency, description) => triage({ urgency, description });
  assert.equal(t('emergency', 'No cooling at all').priority, 1);
  assert.equal(t('this_week', 'Furnace is noisy').priority, 3);
  assert.equal(t('soon', 'No heat and we have a newborn').priority, 1);
  assert.equal(t('flexible', 'My elderly mother lives here').priority, 3);

  const gas = t('flexible', 'Tune-up please, also I smell gas near the furnace');
  assert.equal(gas.priority, 1);
  assert.equal(gas.safetyConcern, 'smell gas');
  assert.equal(t('flexible', 'Thermostat screen is blank').safetyConcern, null);
});

// ---- Lead lifecycle

const request = {
  name: 'Dana Whitfield', phone: '(312) 555-0188', email: 'dana@example.com',
  service: 'heating_repair', description: 'Furnace blows cold air. We have a baby at home.',
  urgency: 'soon', preferredDate: '', preferredWindow: 'morning',
};
const wed2pm = new Date('2026-09-30T19:00:00Z');
const later = (lead, minutes) => new Date(new Date(lead.updatedAt).getTime() + minutes * 60_000);

test('a new lead is triaged, summarised and due for a call', () => {
  const lead = createLead(request, { now: wed2pm });
  assert.equal(lead.triage.priority, 1); // "soon" + baby
  assert.equal(lead.followUpDueAt, '2026-09-30T19:30:00.000Z');
  assert.match(lead.aiSummary, /^P1 heating or furnace repair\. "Furnace blows cold air\." Mentions baby/);
  assert.equal(customerNextStep(lead, wed2pm), "We'll call you within 30 minutes to book a visit.");
  assert.equal(lead.history[0].action, 'created');
});

test('unanswered calls are retried, then the lead is closed as unreachable', () => {
  let lead = createLead(request, { now: wed2pm });
  for (let i = 1; i <= 3; i++) {
    lead = recordContact(lead, { outcome: 'no_answer' }, later(lead, 20));
    assert.equal(lead.leadStatus, 'new');
    assert.equal(lead.followUpNeeded, true);
  }
  // P1 retries every 15 minutes on the clock
  assert.equal(new Date(lead.followUpDueAt) - new Date(lead.updatedAt), 15 * 60_000);

  lead = recordContact(lead, { outcome: 'no_answer' }, later(lead, 20));
  assert.equal(lead.leadStatus, 'lost');
  assert.equal(lead.closedReason, 'unreachable');
  assert.equal(lead.followUpNeeded, false);

  // They call back: the lead reopens.
  lead = recordContact(lead, { outcome: 'reached', note: 'Customer rang us' }, later(lead, 60));
  assert.equal(lead.leadStatus, 'contacted');
  assert.equal(lead.closedReason, null);
  assert.equal(lead.followUpNeeded, true);
});

test('happy path: reached, pencilled in, confirmed, done', () => {
  let lead = createLead(request, { now: wed2pm });
  lead = recordContact(lead, { outcome: 'reached', by: 'Maria' }, later(lead, 10));
  assert.equal(lead.leadStatus, 'contacted');
  assert.equal(lead.lastContact.by, 'Maria');

  lead = book(lead, { date: '2026-10-01', window: 'morning', confirmed: false }, later(lead, 1));
  assert.deepEqual([lead.leadStatus, lead.bookingStatus, lead.followUpNeeded], ['qualified', 'tentative', true]);

  lead = book(lead, { date: '2026-10-01', window: 'morning', technician: 'Luis' }, later(lead, 30));
  assert.deepEqual([lead.bookingStatus, lead.followUpNeeded, lead.followUpDueAt], ['booked', false, null]);
  assert.equal(lead.appointment.technician, 'Luis');

  lead = complete(lead, {}, later(lead, 1440));
  assert.deepEqual([lead.leadStatus, lead.bookingStatus, lead.followUpNeeded], ['won', 'completed', false]);
  assert.deepEqual(lead.history.map((h) => h.action), ['created', 'contact', 'tentative', 'booked', 'completed']);
});

test('moves that make no sense are refused', () => {
  const fresh = createLead(request, { now: wed2pm });
  assert.throws(() => complete(fresh), /bookingStatus from "not_booked" to "completed"/);
  assert.throws(() => cancel(fresh), /no visit to cancel/);
  assert.throws(() => markLost(fresh, {}), (e) => e.status === 422);
  assert.throws(() => recordContact(fresh, { outcome: 'maybe' }), (e) => e.status === 422);
  assert.throws(() => book(fresh, { date: 'tomorrow', window: 'morning' }), (e) => e.status === 422);

  const done = complete(book(fresh, { date: '2026-10-01', window: 'morning' }, wed2pm), {}, wed2pm);
  assert.throws(() => markLost(done, { reason: 'x' }), /leadStatus from "won" to "lost"/);
  assert.equal(fresh.leadStatus, 'new', 'actions never change the lead they were given');
});

test('cancelling keeps the customer on the follow-up list; losing takes them off', () => {
  let lead = book(createLead(request, { now: wed2pm }), { date: '2026-10-01', window: 'morning' }, wed2pm);
  lead = cancel(lead, { reason: 'Customer away' }, wed2pm);
  assert.deepEqual([lead.bookingStatus, lead.followUpNeeded], ['cancelled', true]);
  lead = markLost(lead, { reason: 'Went with another company' }, wed2pm);
  assert.deepEqual([lead.leadStatus, lead.followUpNeeded, lead.closedReason], ['lost', false, 'Went with another company']);
});

test('call list: overdue first, then most urgent', () => {
  const at = (urgency, iso) => createLead({ ...request, description: 'Needs a look at the unit.', urgency }, { now: new Date(iso) });
  const oldFlexible = at('flexible', '2026-09-28T14:00:00Z'); // due Mon, overdue by Wed
  const newEmergency = at('emergency', '2026-09-30T18:55:00Z');
  const newSoon = at('soon', '2026-09-30T18:00:00Z');
  const booked = book(at('soon', '2026-09-30T18:00:00Z'), { date: '2026-10-01', window: 'any' }, wed2pm);

  const queue = workQueue([newSoon, booked, newEmergency, oldFlexible], wed2pm);
  assert.deepEqual(queue.map((l) => l.id), [oldFlexible.id, newEmergency.id, newSoon.id]);
  assert.equal(queue[0].overdue, true);
});

// ---- Safety

test('each hazard is recognised and named', () => {
  const hazard = (description) => triage({ urgency: 'flexible', description }).hazard;
  assert.equal(hazard('I think I smell gas in the basement'), 'gas');
  assert.equal(hazard('Smells like rotten eggs near the furnace'), 'gas');
  assert.equal(hazard('Our CO alarm keeps going off'), 'carbon_monoxide');
  assert.equal(hazard('Worried about carbon monoxide'), 'carbon_monoxide');
  assert.equal(hazard('Saw sparks from the outdoor unit'), 'fire');
  assert.equal(hazard('There is a burning smell from the vents'), 'fire');
  assert.equal(hazard('Smoke coming from the furnace'), 'fire');
  assert.equal(hazard('Thermostat screen is blank'), null);
});

test('a hazard never gets a "wait for our call" promise', () => {
  for (const description of ['I smell gas', 'CO detector beeping', 'sparks from the unit']) {
    const lead = createLead({ ...request, urgency: 'flexible', description: `Tune-up. ${description}.` }, { now: wed2pm });
    assert.equal(lead.triage.priority, 1);
    const emergency = customerEmergency(lead);
    assert.ok(emergency.title && emergency.steps.length >= 3);
    assert.match(emergency.steps.join(' '), /911/);
    const next = customerNextStep(lead, wed2pm);
    assert.doesNotMatch(next, /within|by \d/, 'no callback time is promised');
    assert.match(next, /Don't wait for our call/);
    assert.equal(lead.followUpNeeded, true, 'the office is still told to call');
  }
  assert.equal(customerEmergency(createLead(request, { now: wed2pm })), null);
});

// ---- Office screen

test('qualify: only from new or contacted, and a booking is still owed', () => {
  let lead = recordContact(createLead(request, { now: wed2pm }), { outcome: 'reached' }, wed2pm);
  lead = qualify(lead, {}, wed2pm);
  assert.deepEqual([lead.leadStatus, lead.followUpNeeded], ['qualified', true]);
  assert.throws(() => qualify(lead), /already qualified/);
  assert.equal(lead.history.at(-1).action, 'qualified');
});

test('buttons offered follow the allowed moves', () => {
  const fresh = createLead(request, { now: wed2pm });
  assert.deepEqual(availableActions(fresh), ['contact', 'qualify', 'book', 'lost']);

  const contacted = recordContact(fresh, { outcome: 'reached' }, wed2pm);
  assert.deepEqual(availableActions(contacted), ['contact', 'qualify', 'book', 'lost']);

  const booked = book(contacted, { date: '2026-10-01', window: 'morning' }, wed2pm);
  assert.deepEqual(availableActions(booked), ['contact', 'complete', 'cancel', 'lost']);

  const cancelled = cancel(booked, {}, wed2pm);
  assert.deepEqual(availableActions(cancelled), ['contact', 'book', 'lost']);

  assert.deepEqual(availableActions(complete(booked, {}, wed2pm)), [], 'a won job is finished');
  assert.deepEqual(availableActions(markLost(fresh, { reason: 'x' }, wed2pm)), ['contact'], 'lost can only be reopened by talking to them');
});

test('office order: overdue, then follow-ups by priority, then booked, then closed', () => {
  const at = (urgency, iso, description = 'Needs a look at the unit.') =>
    createLead({ ...request, description, urgency }, { now: new Date(iso) });
  const overdue = at('flexible', '2026-09-28T14:00:00Z');
  const urgent = at('emergency', '2026-09-30T18:55:00Z');
  const normal = at('this_week', '2026-09-30T18:00:00Z');
  const booked = book(at('soon', '2026-09-30T18:00:00Z'), { date: '2026-10-01', window: 'any' }, wed2pm);
  const won = complete(book(at('soon', '2026-09-29T18:00:00Z'), { date: '2026-09-30', window: 'any' }, wed2pm), {}, wed2pm);
  const lost = markLost(at('soon', '2026-09-29T18:00:00Z'), { reason: 'Price too high' }, new Date('2026-09-30T19:30:00Z'));

  const view = officeView([won, normal, booked, lost, urgent, overdue], wed2pm);
  assert.deepEqual(view.map((l) => l.id), [overdue.id, urgent.id, normal.id, booked.id, lost.id, won.id]);
  assert.equal(view[0].overdue, true);
  assert.deepEqual(view[0].actions, ['contact', 'qualify', 'book', 'lost']);

  assert.deepEqual(officeStats(view), { newLeads: 3, needFollowUp: 3, urgent: 1, booked: 1, won: 1 });
});
