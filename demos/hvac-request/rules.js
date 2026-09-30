/**
 * The business rules, in one place. Every number and word list here is a
 * decision a real HVAC owner should confirm; change them here and the rest of
 * the app (deadlines, the customer's confirmation, the office queue) follows.
 */

// ---- Settings

export const TIMEZONE = 'America/Chicago';

// Minutes after local midnight, by weekday (0 = Sunday). null = closed.
export const OPEN_HOURS = {
  0: null,
  1: [7 * 60, 19 * 60],
  2: [7 * 60, 19 * 60],
  3: [7 * 60, 19 * 60],
  4: [7 * 60, 19 * 60],
  5: [7 * 60, 19 * 60],
  6: [8 * 60, 16 * 60],
};

// How fast the office must first call back, by priority. Priority 1 runs on
// the clock (the emergency line is 24/7); the rest count office hours only.
export const RESPONSE_TARGET = {
  1: { minutes: 30, clock: true },
  2: { minutes: 120 },
  3: { minutes: 240 },
  4: { minutes: 480 },
};

// Couldn't reach them: when to try again, and when to stop.
export const RETRY_AFTER = {
  1: { minutes: 15, clock: true },
  default: { minutes: 120 },
};
export const MAX_CALL_ATTEMPTS = 4;

// Other follow-ups, in office-hours minutes.
export const CONFIRM_TENTATIVE_WITHIN = 240;
// A pencilled-in visit must be confirmed at least this long before it starts.
export const CONFIRM_BEFORE_VISIT = 60;
// When each arrival window opens, in minutes after local midnight.
export const WINDOW_START = { morning: 8 * 60, afternoon: 12 * 60, evening: 17 * 60, any: 8 * 60 };
export const REBOOK_AFTER_CANCEL_WITHIN = 480;

const BASE_PRIORITY = { emergency: 1, soon: 2, this_week: 3, flexible: 4 };

// Words that mean "possible danger": always priority 1. False alarms are cheap;
// a missed gas leak is not.
const SAFETY_WORDS = /\b(gas leak|smell(s|ed|ing)? (of |like )?gas|gas smell|carbon monoxide|co (alarm|detector)|smoke|smoking|burning smell|smell(s|ed|ing)? (of |like )?burning|sparks?|sparking)\b/i;

// People who suffer most without heat or cooling: moves a request up one level.
const VULNERABLE_WORDS = /\b(baby|babies|newborn|infant|toddler|elderly|senior|pregnant|disabled|oxygen|medical|sick)\b/i;

// ---- Triage

/** Priority 1 (drop everything) to 4 (whenever suits), plus why. */
export function triage(request) {
  const text = request.description || '';
  const safety = text.match(SAFETY_WORDS)?.[0]?.toLowerCase() || null;
  const vulnerable = text.match(VULNERABLE_WORDS)?.[0]?.toLowerCase() || null;

  let priority = BASE_PRIORITY[request.urgency] ?? 4;
  if (vulnerable && priority > 1) priority -= 1;
  if (safety) priority = 1;

  return { priority, safetyConcern: safety, vulnerableOccupant: vulnerable };
}

// ---- Office-hours clock

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** Local weekday and minute-of-day at the business, for an instant. */
function localClock(ms) {
  const parts = Object.fromEntries(partsFormat.formatToParts(ms).map((p) => [p.type, p.value]));
  return { day: WEEKDAYS[parts.weekday], minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

/**
 * Adds minutes that only tick while the office is open. A request that
 * arrives Friday at 10pm with 120 minutes to go is due Saturday at 10am.
 */
export function addOfficeMinutes(start, minutes) {
  let t = new Date(start).getTime();
  let remaining = minutes;
  for (let guard = 0; remaining > 0 && guard < 1000; guard++) {
    const { day, minute } = localClock(t);
    const hours = OPEN_HOURS[day];
    if (hours && minute >= hours[0] && minute < hours[1]) {
      const take = Math.min(remaining, hours[1] - minute);
      t += take * 60_000;
      remaining -= take;
    } else if (hours && minute < hours[0]) {
      t += (hours[0] - minute) * 60_000; // later today, at opening
    } else {
      t += (24 * 60 - minute) * 60_000; // local midnight, then check again
    }
  }
  return new Date(t);
}

const wallFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** The instant it is `minute` minutes past midnight on `date` (YYYY-MM-DD) at the business. */
export function businessTime(date, minute) {
  const guess = Date.parse(`${date}T00:00:00Z`) + minute * 60_000;
  const p = Object.fromEntries(wallFormat.formatToParts(guess).map((x) => [x.type, Number(x.value)]));
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess;
  return new Date(guess - offset);
}

/**
 * When a pencilled-in visit must be confirmed: the usual confirm window, but
 * never later than an hour before the visit starts (and never in the past).
 */
export function confirmDeadline(now, appointment) {
  const usual = addOfficeMinutes(now, CONFIRM_TENTATIVE_WITHIN).getTime();
  if (!appointment) return new Date(usual);
  const start = businessTime(appointment.date, WINDOW_START[appointment.window] ?? 8 * 60).getTime();
  const latest = start - CONFIRM_BEFORE_VISIT * 60_000;
  return new Date(Math.max(new Date(now).getTime(), Math.min(usual, latest)));
}

export function addTarget(start, { minutes, clock }) {
  return clock ? new Date(new Date(start).getTime() + minutes * 60_000) : addOfficeMinutes(start, minutes);
}

export function responseDeadline(priority, from) {
  return addTarget(from, RESPONSE_TARGET[priority] || RESPONSE_TARGET[4]);
}

export function retryDeadline(priority, from) {
  return addTarget(from, RETRY_AFTER[priority] || RETRY_AFTER.default);
}

// ---- Words the customer and office read

const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit' });
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'long' });

/** "within 30 minutes", "by 4:15pm today", "by 10:00am Saturday". */
export function describeDeadline(deadline, now = new Date()) {
  const due = new Date(deadline).getTime();
  const minutes = Math.round((due - new Date(now).getTime()) / 60_000);
  if (minutes <= 60) return `within ${Math.max(5, Math.ceil(minutes / 5) * 5)} minutes`;

  // Round up to the next quarter hour: "4:15pm", not "4:07pm".
  const shown = Math.ceil(due / (15 * 60_000)) * 15 * 60_000;
  const time = timeFormat.format(shown).replace(' AM', 'am').replace(' PM', 'pm');
  const today = dayKey.format(now);
  const tomorrow = dayKey.format(new Date(now).getTime() + 24 * 60 * 60_000);
  const day = dayKey.format(shown);
  const when = day === today ? 'today' : day === tomorrow ? 'tomorrow' : weekdayFormat.format(shown);
  return `by ${time} ${when}`;
}

/** The first "what happens next" line on the customer's confirmation. */
export function customerNextStep(lead, now = new Date()) {
  const when = describeDeadline(lead.followUpDueAt, now);
  if (lead.triage.safetyConcern)
    return `You mentioned something that could be a safety risk, so we'll call you ${when}. If you smell gas or smoke, leave the house and call 911 from outside.`;
  if (lead.request.urgency === 'emergency') return `This is marked as an emergency, so we'll call you ${when}.`;
  return `We'll call you ${when} to book a visit.`;
}

/**
 * A two-line brief for whoever makes the call. Built from rules today; this
 * is the one function to swap for a language model later, and nothing else
 * has to change.
 */
export function summarize(lead) {
  const { request, triage: t } = lead;
  const firstSentence = request.description.split(/(?<=[.!?])\s/)[0];
  const quote = firstSentence.length > 140 ? `${firstSentence.slice(0, 137).trimEnd()}...` : firstSentence;
  const when = [request.preferredDate, request.preferredWindowLabel.toLowerCase()].filter(Boolean).join(', ');

  const parts = [];
  if (t.safetyConcern) parts.push(`SAFETY: mentions "${t.safetyConcern}".`);
  parts.push(`P${t.priority} ${request.serviceLabel.toLowerCase()}. "${quote}"`);
  if (t.vulnerableOccupant) parts.push(`Mentions ${t.vulnerableOccupant} in the home.`);
  parts.push(`Prefers ${when}.`);
  return parts.join(' ');
}
