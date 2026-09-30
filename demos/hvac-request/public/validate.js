/**
 * One set of rules for the form. The browser imports this to show errors as
 * the customer types; the server imports the same file and re-checks every
 * submission, because anything sent from a browser can be forged.
 */

export const SERVICES = {
  ac_repair: 'Air conditioning repair',
  heating_repair: 'Heating or furnace repair',
  heat_pump: 'Heat pump service',
  maintenance: 'Maintenance or tune-up',
  installation: 'New system or replacement',
  thermostat: 'Thermostat problem',
  air_quality: 'Ducts or indoor air quality',
  other: 'Something else',
};

export const URGENCY = {
  emergency: 'Emergency: no heat or cooling right now',
  soon: 'Soon: within 1 to 2 days',
  this_week: 'This week',
  flexible: 'Flexible: any time is fine',
};

export const TIME_WINDOWS = {
  morning: 'Morning (8am to 12pm)',
  afternoon: 'Afternoon (12pm to 5pm)',
  evening: 'Evening (5pm to 7pm)',
  any: 'Any time',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS = /^[+\d\s().-]+$/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/** A date as YYYY-MM-DD in the local time zone of whoever runs this. */
export function isoDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Earliest date we accept. One day of slack, because the server's "today" and
 * the customer's "today" differ across time zones. The date picker itself
 * already blocks past days in the browser.
 */
function earliestDate() {
  return isoDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

/**
 * Returns { data, errors }. `data` holds the trimmed values; `errors` maps a
 * field name to a message a customer can act on. No errors means valid.
 */
export function validateRequest(input = {}) {
  const data = {
    name: clean(input.name),
    phone: clean(input.phone),
    email: clean(input.email).toLowerCase(),
    service: clean(input.service),
    description: clean(input.description),
    urgency: clean(input.urgency),
    preferredDate: clean(input.preferredDate),
    preferredWindow: clean(input.preferredWindow),
  };
  const errors = {};

  if (data.name.length < 2) errors.name = 'Please enter your name.';
  else if (data.name.length > 80) errors.name = 'Please keep your name under 80 characters.';

  const digits = data.phone.replace(/\D/g, '');
  if (!data.phone) errors.phone = 'Please enter a phone number so we can reach you.';
  else if (!PHONE_CHARS.test(data.phone) || digits.length < 10 || digits.length > 15)
    errors.phone = 'Please enter a full phone number, including area code.';

  if (!data.email) errors.email = 'Please enter your email address.';
  else if (!EMAIL.test(data.email) || data.email.length > 254)
    errors.email = 'That email address does not look right.';

  if (!Object.hasOwn(SERVICES, data.service)) errors.service = 'Please choose the service you need.';

  if (data.description.length < 10)
    errors.description = 'Please tell us a little more about the problem (at least 10 characters).';
  else if (data.description.length > 1000)
    errors.description = 'Please keep the description under 1,000 characters.';

  if (!Object.hasOwn(URGENCY, data.urgency)) errors.urgency = 'Please tell us how soon you need help.';

  if (data.preferredDate) {
    // Round-trip check: Date quietly turns Feb 31 into Mar 3, so compare back.
    const parsed = new Date(`${data.preferredDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.preferredDate) || Number.isNaN(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== data.preferredDate)
      errors.preferredDate = 'Please pick a valid date.';
    else if (data.preferredDate < earliestDate())
      errors.preferredDate = 'Please pick today or a later date.';
  }

  if (!Object.hasOwn(TIME_WINDOWS, data.preferredWindow))
    errors.preferredWindow = 'Please choose a preferred time of day.';

  return { data, errors };
}
