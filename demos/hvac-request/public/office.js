import { TIME_WINDOWS, isoDate } from './validate.js';

/**
 * The office screen. It holds no customer data itself: everything comes from
 * /api/leads, which answers only with the office password (OFFICE_TOKEN).
 * Which buttons a lead shows comes from the server too (lead.actions), so the
 * screen can't offer a move the business rules don't allow.
 */

const REFRESH_EVERY = 30_000;
const TOKEN_KEY = 'hvac-office-token';

const ACTION_LABELS = {
  contact: 'Mark Contacted',
  qualify: 'Mark Qualified',
  book: 'Mark Booked',
  complete: 'Mark Completed',
  cancel: 'Mark Cancelled',
  lost: 'Mark Lost',
};
const PRIORITY_LABELS = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };
const HAZARD_LABELS = { gas: 'Gas', carbon_monoxide: 'Carbon monoxide', fire: 'Fire / electrical' };
const LEAD_LABELS = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', won: 'Won', lost: 'Lost' };
const BOOKING_LABELS = { not_booked: 'Not booked', tentative: 'Pencilled in', booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled' };

const $ = (id) => document.getElementById(id);
let timezone;
let refreshTimer;
let lastChanged = null;

// ---- Password, kept for this browser tab only

function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
function setToken(value) {
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode: the password just won't survive a reload */ }
}

async function api(path, options = {}) {
  const res = await fetch(`/api/leads${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function show(view) {
  for (const id of ['signin', 'off', 'board']) $(id).hidden = id !== view;
  $('bar-actions').hidden = view !== 'board';
}

// ---- Small DOM helper: text is always set as text, never as HTML, because
// every string here was typed by a customer.

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('data-')) node.setAttribute(key, value);
    else node[key] = value;
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}
const badge = (text, cls = '') => el('span', { class: `badge ${cls}` }, text);

// ---- Dates, in the business's own time zone

function dayWord(date) {
  const key = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d);
  const today = key(new Date());
  const yesterday = key(new Date(Date.now() - 864e5));
  const tomorrow = key(new Date(Date.now() + 864e5));
  const k = key(date);
  if (k === today) return 'Today';
  if (k === yesterday) return 'Yesterday';
  if (k === tomorrow) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}
function clock(date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' })
    .format(date).replace(' AM', 'am').replace(' PM', 'pm');
}
const when = (iso) => `${dayWord(new Date(iso))}, ${clock(new Date(iso))}`;

function ago(ms) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} days`;
}

function visitText(appointment) {
  if (!appointment) return null;
  const day = dayWord(new Date(`${appointment.date}T12:00:00Z`));
  return `${day}, ${TIME_WINDOWS[appointment.window].toLowerCase()}`;
}

// ---- Render

function renderStats(stats) {
  for (const [key, value] of Object.entries(stats)) $(`stat-${key}`).textContent = value;
  $('stat-urgent').closest('li').classList.toggle('has-urgent', stats.urgent > 0);
}

function row(lead) {
  const { customer, request, triage } = lead;
  const closed = lead.leadStatus === 'won' || lead.leadStatus === 'lost';

  const priority = el('td', { 'data-label': 'Priority' },
    el('div', {},
      badge(`P${triage.priority} ${PRIORITY_LABELS[triage.priority]}`, `p${triage.priority}`),
      triage.hazard && badge(`SAFETY: ${HAZARD_LABELS[triage.hazard]}`, 'safety-badge'),
      el('span', { class: 'sub' }, request.urgencyLabel.split(':')[0])));

  const person = el('td', { 'data-label': 'Customer' },
    el('div', {},
      el('div', { class: 'name' }, customer.name),
      el('a', { class: 'phone', href: `tel:${customer.phone.replace(/[^\d+]/g, '')}` }, customer.phone),
      el('p', { class: 'ref' }, lead.reference)));

  const req = el('td', { 'data-label': 'Request' },
    el('div', {},
      el('div', { class: 'service' }, request.serviceLabel),
      el('p', { class: 'summary' }, lead.aiSummary)));

  const received = el('td', { 'data-label': 'Received', class: 'nowrap' }, el('div', {}, when(lead.createdAt)));

  let deadline;
  if (!lead.followUpNeeded) deadline = el('span', { class: 'muted' }, '—');
  else if (lead.overdue) {
    deadline = el('div', {},
      el('span', { class: 'late' }, `Overdue ${ago(Date.now() - new Date(lead.followUpDueAt))}`),
      el('span', { class: 'sub' }, `was due ${when(lead.followUpDueAt)}`));
  } else deadline = el('div', {}, when(lead.followUpDueAt));
  const due = el('td', { 'data-label': 'Call back by', class: 'nowrap' }, deadline);

  const leadCell = el('td', { 'data-label': 'Lead' },
    el('div', {},
      badge(LEAD_LABELS[lead.leadStatus], `status-${lead.leadStatus}`),
      lead.closedReason && el('span', { class: 'sub' }, lead.closedReason),
      lead.lastContact && el('span', { class: 'sub' }, `Last contact ${when(lead.lastContact.at)}`)));

  const bookingCell = el('td', { 'data-label': 'Booking' },
    el('div', {},
      badge(BOOKING_LABELS[lead.bookingStatus], `status-${lead.bookingStatus}`),
      lead.bookingStatus !== 'not_booked' && el('span', { class: 'sub' }, visitText(lead.appointment))));

  const follow = el('td', { 'data-label': 'Follow-up' },
    el('div', {}, lead.followUpNeeded ? badge('Needed', 'follow-yes') : badge('No', 'follow-no')));

  const buttons = lead.actions.map((action) =>
    el('button', {
      type: 'button',
      class: `btn ${action === 'lost' || action === 'cancel' ? 'btn-danger' : ''}`,
      onclick: () => runAction(lead, action),
    }, ACTION_LABELS[action]));
  const actions = el('td', { class: 'actions-cell' }, el('div', { class: 'actions' }, buttons));

  return el('tr', {
    class: [lead.overdue && 'overdue', closed && 'closed', lead.id === lastChanged && 'flash'].filter(Boolean).join(' '),
  }, priority, person, req, received, due, leadCell, bookingCell, follow, actions);
}

async function load() {
  clearTimeout(refreshTimer);
  if (!getToken()) return show('signin');

  let result;
  try {
    result = await api('?all=1');
  } catch {
    $('board-alert').textContent = "Can't reach the server. Retrying…";
    $('board-alert').hidden = false;
    show('board');
    refreshTimer = setTimeout(load, REFRESH_EVERY);
    return;
  }
  const { status, body } = result;
  if (status === 503) return show('off');
  if (status === 401) {
    setToken('');
    $('signin-error').textContent = 'That password is not right.';
    return show('signin');
  }
  if (!body.ok) {
    $('board-alert').textContent = body.error || 'Something went wrong loading requests.';
    $('board-alert').hidden = false;
    return;
  }

  $('board-alert').hidden = true;
  timezone = body.timezone;
  renderStats(body.stats);
  $('rows').replaceChildren(...body.leads.map(row));
  $('empty').hidden = body.leads.length > 0;
  $('leads').hidden = body.leads.length === 0;
  $('updated').textContent = `Updated ${clock(new Date())}`;
  show('board');
  lastChanged = null;
  refreshTimer = setTimeout(load, REFRESH_EVERY);
}

// ---- Actions

function ask(dialog) {
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.returnValue = '';
    dialog.showModal();
  });
}

async function runAction(lead, action) {
  let input = {};
  const who = `${lead.customer.name} · ${lead.request.serviceLabel}`;

  if (action === 'book') {
    $('book-who').textContent = who;
    $('book-date').min = isoDate();
    // Their preferred day if it hasn't passed, otherwise tomorrow.
    const today = isoDate();
    const preferred = lead.request.preferredDate >= today ? lead.request.preferredDate : null;
    $('book-date').value = lead.appointment?.date || preferred || isoDate(new Date(Date.now() + 864e5));
    $('book-window').value = lead.appointment?.window || lead.request.preferredWindow;
    if (!(await ask($('book-dialog')))) return;
    input = { date: $('book-date').value, window: $('book-window').value, confirmed: true };
  } else if (action === 'lost') {
    $('lost-who').textContent = who;
    $('lost-reason').value = '';
    if (!(await ask($('lost-dialog')))) return;
    input = { reason: $('lost-reason').value };
  } else if (action === 'cancel') {
    if (!confirm(`Cancel the visit for ${lead.customer.name}?`)) return;
  } else if (action === 'contact') {
    input = { outcome: 'reached', channel: 'phone', by: 'Office' };
  }

  document.querySelectorAll('.actions .btn').forEach((b) => { b.disabled = true; });
  const { status, body } = await api(`/${encodeURIComponent(lead.reference)}/${action}`, {
    method: 'POST', body: JSON.stringify(input),
  }).catch(() => ({ status: 0, body: {} }));

  if (status === 401) return load();
  if (!body.ok) {
    $('board-alert').textContent = body.error || "That didn't save. Please try again.";
    $('board-alert').hidden = false;
  }
  lastChanged = lead.id;
  load();
}

// ---- Wire up

for (const [value, label] of Object.entries(TIME_WINDOWS)) $('book-window').add(new Option(label, value));

$('signin-form').addEventListener('submit', (e) => {
  e.preventDefault();
  $('signin-error').textContent = '';
  setToken($('token').value.trim());
  $('token').value = '';
  load();
});
$('refresh').addEventListener('click', load);
$('signout').addEventListener('click', () => {
  setToken('');
  clearTimeout(refreshTimer);
  $('rows').replaceChildren();
  show('signin');
});

load();
