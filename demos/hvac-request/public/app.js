import { SERVICES, TIME_WINDOWS, URGENCY, isoDate, validateRequest } from './validate.js';

// Where the form posts. Our own server by default; it saves the request and
// forwards it to WEBHOOK_URL. Point this at another API if you host the page elsewhere.
const ENDPOINT = '/api/requests';

// What the confirmation promises for each urgency. Set these to what the
// business can actually keep.
const CALLBACK = {
  emergency: 'This is marked as an emergency, so we\'ll call you within 30 minutes.',
  soon: 'We\'ll call you within 2 business hours to book a visit.',
  this_week: 'We\'ll call you today or next business morning to book a visit.',
  flexible: 'We\'ll call you within 1 business day to find a time that works.',
};

const form = document.getElementById('request-form');
const submitButton = document.getElementById('submit');
const formAlert = document.getElementById('form-alert');
const FIELDS = ['name', 'phone', 'email', 'service', 'description', 'urgency', 'preferredDate', 'preferredWindow'];

// ---- Build the choices from the shared lists, so the page and server always agree.

function fillSelect(id, options) {
  const select = document.getElementById(id);
  for (const [value, label] of Object.entries(options)) select.add(new Option(label, value));
}
fillSelect('service', SERVICES);
fillSelect('preferredWindow', TIME_WINDOWS);

const urgencyGroup = document.getElementById('urgency');
for (const [value, label] of Object.entries(URGENCY)) {
  const [title, detail] = label.split(': ');
  const option = document.createElement('label');
  option.className = `choice choice-${value}`;
  option.innerHTML = `<input type="radio" name="urgency" value="${value}"><span><strong></strong><small></small></span>`;
  option.querySelector('strong').textContent = title;
  option.querySelector('small').textContent = detail || '';
  urgencyGroup.append(option);
}

document.getElementById('preferredDate').min = isoDate();
document.getElementById('year').textContent = new Date().getFullYear();

// ---- Errors

function valuesFromForm() {
  const values = Object.fromEntries(new FormData(form));
  values.urgency = values.urgency || '';
  return values;
}

function showError(field, message) {
  const error = document.getElementById(`${field}-error`);
  error.textContent = message || '';
  const input = field === 'urgency' ? urgencyGroup : document.getElementById(field);
  input.toggleAttribute('aria-invalid', Boolean(message));
  if (field !== 'urgency') input.setAttribute('aria-describedby', `${field}-error`);
}

function showErrors(errors) {
  for (const field of FIELDS) showError(field, errors[field]);
}

// Check a field when the customer leaves it, then keep re-checking it as
// they type, but only once it has been flagged. No shouting while they're mid-word.
const touched = new Set();
function checkField(field) {
  const { errors } = validateRequest(valuesFromForm());
  showError(field, errors[field]);
}
form.addEventListener('focusout', (e) => {
  const field = e.target.name;
  if (!FIELDS.includes(field) || !e.target.value) return;
  touched.add(field);
  checkField(field);
});
form.addEventListener('input', (e) => {
  const field = e.target.name;
  if (field === 'description') document.getElementById('description-count').textContent = e.target.value.length;
  if (field === 'urgency') {
    document.getElementById('safety').hidden = e.target.value !== 'emergency';
    touched.add(field);
  }
  if (touched.has(field)) checkField(field);
});

// ---- Submit

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.classList.toggle('busy', busy);
  submitButton.querySelector('.submit-label').textContent = busy ? 'Sending…' : 'Send request';
}

function showAlert(message) {
  formAlert.textContent = message;
  formAlert.hidden = !message;
  if (message) formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function focusFirstError(errors) {
  const first = FIELDS.find((f) => errors[f]);
  if (!first) return;
  const target = first === 'urgency' ? urgencyGroup.querySelector('input') : document.getElementById(first);
  target.focus();
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showAlert('');

  const values = valuesFromForm();
  const { errors } = validateRequest(values);
  FIELDS.forEach((f) => touched.add(f));
  showErrors(errors);
  if (Object.keys(errors).length) {
    focusFirstError(errors);
    return;
  }

  setBusy(true);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 422 && body.errors) {
      showErrors(body.errors);
      focusFirstError(body.errors);
      return;
    }
    if (!res.ok || !body.ok) throw new Error(`Server replied ${res.status}`);

    showThanks(body, values);
  } catch {
    showAlert('We couldn\'t send your request just now. Please try again, or call us on (312) 555-0142 and we\'ll book you in over the phone.');
  } finally {
    setBusy(false);
  }
});

// ---- Confirmation

function showThanks(result, values) {
  const firstName = result.firstName || values.name.split(/\s+/)[0];
  document.getElementById('thanks-title').textContent = `Thanks, ${firstName}. We've got your request.`;
  document.getElementById('thanks-ref').textContent = result.reference;
  const day = values.preferredDate
    ? new Date(`${values.preferredDate}T12:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ', '
    : '';
  document.getElementById('thanks-lead').textContent =
    `${SERVICES[values.service]}, ${day}${TIME_WINDOWS[values.preferredWindow].toLowerCase()}. We'll call you on ${values.phone}.`;
  document.getElementById('step-1').textContent = CALLBACK[values.urgency];

  document.getElementById('form-view').hidden = true;
  const thanks = document.getElementById('thanks-view');
  thanks.hidden = false;
  thanks.focus();
  thanks.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('another').addEventListener('click', () => {
  form.reset();
  touched.clear();
  showErrors({});
  document.getElementById('description-count').textContent = '0';
  document.getElementById('safety').hidden = true;
  document.getElementById('thanks-view').hidden = true;
  document.getElementById('form-view').hidden = false;
  document.getElementById('name').focus();
});
