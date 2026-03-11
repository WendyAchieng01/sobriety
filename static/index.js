/* ============================================
   Ancora — Sobriety App · index.js
   All persistent data stored in Django DB.
   No localStorage used.
   ============================================ */
'use strict';

// ============================================
// STATE
// ============================================
const state = {
  startDate: null,
  userName: 'Friend',
  weeklySpend: 500,
  journal: [],
  moodToday: null,
  breatheRunning: false,
  breatheInterval: null,
  urgeTimerInterval: null,
};

const MILESTONES = [
  { days: 1,   icon: '🌱', name: 'First Day'   },
  { days: 3,   icon: '🌿', name: 'Three Days'  },
  { days: 7,   icon: '🌊', name: 'One Week'    },
  { days: 14,  icon: '🔥', name: 'Two Weeks'   },
  { days: 30,  icon: '🌙', name: 'One Month'   },
  { days: 60,  icon: '⭐', name: 'Two Months'  },
  { days: 90,  icon: '🏔️', name: 'Ninety Days' },
  { days: 180, icon: '🌟', name: 'Half Year'   },
  { days: 365, icon: '🏆', name: 'One Year'    },
  { days: 730, icon: '👑', name: 'Two Years'   },
];

const QUOTES = [
  '"Every day sober is a day won."',
  '"You are stronger than your urges."',
  '"Progress, not perfection."',
  '"This too shall pass."',
  '"One day at a time."',
  '"The storm doesn\'t last forever."',
  '"Courage is moving forward despite the fear."',
  '"You didn\'t come this far to only come this far."',
];

// ============================================
// CSRF HELPER (Django)
// ============================================
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    for (const cookie of document.cookie.split(';')) {
      const c = cookie.trim();
      if (c.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(c.slice(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// ============================================
// PROFILE API  (replaces all localStorage)
// ============================================
async function loadProfile() {
  if (!window.PROFILE_API_URL) {
    console.warn('PROFILE_API_URL not configured');
    return;
  }
  try {
    const res = await fetch(window.PROFILE_API_URL, {
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.name)                       state.userName   = data.name;
    if (data.sobriety_start)             state.startDate  = new Date(data.sobriety_start);
    if (data.weekly_spend !== undefined) state.weeklySpend = parseFloat(data.weekly_spend) || 0;
  } catch (e) {
    console.error('Profile load error:', e);
  }
}

async function saveProfile(patch = {}) {
  if (!window.PROFILE_API_URL) return;
  try {
    const res = await fetch(window.PROFILE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Profile save failed:', err);
    }
  } catch (e) {
    console.error('Profile save error:', e);
  }
}

// ============================================
// JOURNAL API  (Django model)
// ============================================
async function loadJournal() {
  if (!window.JOURNAL_API_URL) {
    console.warn('JOURNAL_API_URL not configured — journal will be empty');
    state.journal = [];
    return;
  }
  try {
    const res = await fetch(window.JOURNAL_API_URL, {
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
    });
    if (!res.ok) throw new Error('Failed to load journal');
    const data = await res.json();
    state.journal = Array.isArray(data) ? data : (data.entries || []);
    state.journal.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (e) {
    console.error('Journal load error (using empty):', e);
    state.journal = [];
  }
}

async function saveJournalEntry(title, body) {
  const res = await fetch(window.JOURNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify({ title: title || 'Untitled', body }),
  });
  if (!res.ok) throw new Error('Save failed');
}

// ============================================
// SOBRIETY PERIODS API
// ============================================
async function loadSobrietyPeriods() {
  if (!window.PERIODS_API_URL) return [];
  try {
    const res = await fetch(window.PERIODS_API_URL, {
      headers: { 'X-CSRFToken': getCookie('csrftoken') },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Periods load error:', e);
    return [];
  }
}

async function startNewPeriod(note = '') {
  const res = await fetch(window.PERIODS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ action: 'start', start_date: new Date().toISOString(), note }),
  });
  const data = await res.json();
  state.startDate = new Date(data.start_date);
}

async function logRelapse(note = '') {
  const res = await fetch(window.PERIODS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
    body: JSON.stringify({ action: 'relapse', note }),
  });
  const data = await res.json();
  state.startDate = new Date(data.start_date);
}

async function renderSobrietyHistory() {
  const container = document.getElementById('sobriety-history-list');
  if (!container) return;

  const periods = await loadSobrietyPeriods();
  if (!periods.length) {
    container.innerHTML = '<p class="empty-state">No history yet.</p>';
    return;
  }

  container.innerHTML = periods.map((p, i) => {
    const start   = new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end     = p.end_date ? new Date(p.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Present';
    const active  = !p.end_date;
    return `
      <div style="padding:0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.07);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.85rem; color:var(--text-muted);">${start} → ${end}</span>
          ${active ? '<span style="color:#2a7d6e; font-size:0.75rem;">● Active</span>' : ''}
        </div>
        <div style="font-size:1rem; font-weight:600; color:var(--text-primary); margin-top:2px;">
          ${p.days} day${p.days !== 1 ? 's' : ''} sober
          ${p.note ? `<span style="font-weight:300; font-size:0.78rem; color:var(--text-muted); margin-left:0.5rem;">${p.note}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Load all persistent data from DB before rendering anything
  await Promise.all([loadProfile(), loadJournal()]);

  updateGreeting();
  initNav();
  initDashboard();
  initMilestones();
  initJournal();
  initBreathe();
  initSettings();
  initUrgeModal();
  drawBgCanvas();
  setDailyQuote();
  setTodayDate();
  renderSobrietyHistory();

  // Run clock immediately so values are visible before the first tick
  tickClock();
  setInterval(tickClock, 1000);
});

// ============================================
// NAVIGATION
// ============================================
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.dataset.page;
      if (!pageId) return;
      switchPage(pageId);
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function switchPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');
}

// ============================================
// DATE / CLOCK / GREETING
// ============================================
function setTodayDate() {
  const el = document.getElementById('today-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function setDailyQuote() {
  const el = document.getElementById('daily-quote');
  if (!el) return;
  el.textContent = QUOTES[new Date().getDate() % QUOTES.length];
}

function updateGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.querySelector('#page-dashboard .page-eyebrow');
  if (el) el.textContent = `${greet}, ${state.userName}`;
}

function tickClock() {
  if (!state.startDate) return;
  const diff = Date.now() - state.startDate.getTime();
  if (diff < 0) return;

  const totalSeconds  = Math.floor(diff / 1000);
  const seconds       = totalSeconds % 60;
  const totalMinutes  = Math.floor(totalSeconds / 60);
  const minutes       = totalMinutes % 60;
  const totalHours    = Math.floor(totalMinutes / 60);
  const hours         = totalHours % 24;
  const days          = Math.floor(totalHours / 24);

  setEl('counter-days', days);
  setEl('stat-hours',   pad(hours));
  setEl('stat-minutes', pad(minutes));
  setEl('stat-seconds', pad(seconds));
  setEl('streak-count', days);

  const dailyRate  = state.weeklySpend / 7;
  const moneySaved = Math.floor(dailyRate * days);
  setEl('money-saved', `Kes. ${moneySaved.toLocaleString()}`);
  setEl('health-score', Math.min(100, Math.round(50 + (days / 365) * 50)) + '%');

  const next = MILESTONES.find(m => m.days > days);
  setEl('next-milestone', next ? next.days + 'd' : '∞');

  // Ring progress (full ring = 1 year)
  const circumference = 2 * Math.PI * 95;
  const ring = document.getElementById('ring-progress');
  if (ring) {
    ring.style.strokeDasharray  = circumference;
    ring.style.strokeDashoffset = circumference - circumference * Math.min(days / 365, 1);
  }

  renderMilestones(days);
}

function pad(n) { return n.toString().padStart(2, '0'); }

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================
// DASHBOARD — mood check-in + urge slider
// ============================================
function initDashboard() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.moodToday = parseInt(btn.dataset.mood, 10);
      const labels = {
        5: 'Feeling great — keep it up! 🌟',
        4: 'Good energy today 🙂',
        3: 'Getting through it 💪',
        2: 'Tough day — you\'re not alone 💙',
        1: 'Reach out to someone today 🤝',
      };
      const el = document.getElementById('checkin-status');
      if (el) el.textContent = labels[state.moodToday] || 'Select your mood above';
    });
  });

  // If no start date yet (brand new user who skipped onboarding), set now
  if (!state.startDate) {
    state.startDate = new Date();
    saveProfile({ sobriety_start: state.startDate.toISOString() });
  }
}

// ============================================
// MILESTONES
// ============================================
function initMilestones() {
  renderMilestones(0);
}

function renderMilestones(days) {
  const grid = document.getElementById('milestones-grid');
  if (!grid) return;
  grid.innerHTML = '';
  MILESTONES.forEach(m => {
    const unlocked = days >= m.days;
    const card = document.createElement('div');
    card.className = `milestone-card${unlocked ? ' unlocked' : ''}`;
    card.innerHTML = `
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-days">${m.days}</div>
      <div class="milestone-name">${m.name}</div>
      ${unlocked ? '<span class="milestone-badge">Earned</span>' : ''}
    `;
    grid.appendChild(card);
  });
}

// ============================================
// JOURNAL
// ============================================
function initJournal() {
  document.getElementById('new-entry-btn').addEventListener('click', () => {
    document.getElementById('journal-compose').style.display = 'block';
    document.getElementById('journal-title').focus();
  });

  document.getElementById('cancel-entry').addEventListener('click', closeCompose);

  document.getElementById('save-entry').addEventListener('click', async () => {
    const title = document.getElementById('journal-title').value.trim();
    const body  = document.getElementById('journal-body').value.trim();
    if (!title && !body) return;

    try {
      await saveJournalEntry(title, body);
      await loadJournal();
      renderJournal();
      closeCompose();
      showToast('Entry saved ✓');
    } catch (e) {
      console.error(e);
      showToast('Could not save — check your connection');
    }
  });

  renderJournal();
}

function closeCompose() {
  document.getElementById('journal-compose').style.display = 'none';
  document.getElementById('journal-title').value = '';
  document.getElementById('journal-body').value  = '';
}

function renderJournal() {
  const container = document.getElementById('journal-entries');
  if (!container) return;
  if (!state.journal.length) {
    container.innerHTML = '<p class="empty-state">No entries yet. Start writing.</p>';
    return;
  }
  container.innerHTML = state.journal.map(e => `
    <div class="journal-entry-item card">
      <div class="je-title">${escHtml(e.title)}</div>
      <div class="je-date">${new Date(e.date).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })}</div>
      <div class="je-preview">${escHtml(e.body)}</div>
    </div>
  `).join('');
}

function escHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================
// BREATHE
// ============================================
const BREATHE_PATTERNS = {
  '4-4-4-4': [
    { phase: 'Inhale', dur: 4, state: 'inhale'  },
    { phase: 'Hold',   dur: 4, state: ''         },
    { phase: 'Exhale', dur: 4, state: 'exhale'  },
    { phase: 'Hold',   dur: 4, state: ''         },
  ],
  '4-7-8': [
    { phase: 'Inhale', dur: 4, state: 'inhale' },
    { phase: 'Hold',   dur: 7, state: ''        },
    { phase: 'Exhale', dur: 8, state: 'exhale' },
  ],
  '5-5': [
    { phase: 'Inhale', dur: 5, state: 'inhale' },
    { phase: 'Exhale', dur: 5, state: 'exhale' },
  ],
};

function initBreathe() {
  document.getElementById('breathe-btn').addEventListener('click', () => {
    state.breatheRunning ? stopBreathe() : startBreathe();
  });
}

function startBreathe() {
  state.breatheRunning = true;
  document.getElementById('breathe-btn').textContent = 'Stop Session';

  const patternKey = document.getElementById('breathe-pattern').value;
  const pattern    = BREATHE_PATTERNS[patternKey];
  let stepIdx      = 0;

  function runStep() {
    const step = pattern[stepIdx];
    let timeLeft = step.dur;

    const orb   = document.getElementById('breathe-orb');
    const instr = document.getElementById('breathe-instruction');
    orb.className    = 'breathe-orb ' + (step.state || '');
    instr.textContent = step.phase;
    setEl('breathe-cycle', `${step.phase} · ${timeLeft}s`);

    state.breatheInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        setEl('breathe-cycle', `${step.phase} · ${timeLeft}s`);
      } else {
        clearInterval(state.breatheInterval);
        stepIdx = (stepIdx + 1) % pattern.length;
        if (state.breatheRunning) runStep();
      }
    }, 1000);
  }

  runStep();
}

function stopBreathe() {
  state.breatheRunning = false;
  if (state.breatheInterval) clearInterval(state.breatheInterval);
  document.getElementById('breathe-btn').textContent       = 'Start Session';
  document.getElementById('breathe-orb').className         = 'breathe-orb';
  document.getElementById('breathe-instruction').textContent = 'Press Start';
  setEl('breathe-cycle', '');
}

// ============================================
// SETTINGS  — all saves go to Django DB
// ============================================
function initSettings() {
  const startInput = document.getElementById('start-date-input');
  const spendInput = document.getElementById('weeklySpend');
  const nameInput  = document.getElementById('user-name');

  // Pre-fill inputs from loaded state
  if (state.startDate)   startInput.value = toDatetimeLocal(state.startDate);
  if (state.weeklySpend !== undefined) spendInput.value = state.weeklySpend;
  if (state.userName && state.userName !== 'Friend') nameInput.value = state.userName;

  // Save sobriety start date
  document.getElementById('save-start-date').addEventListener('click', async () => {
    const val = startInput.value;
    if (!val) return;
    state.startDate = new Date(val);
    await saveProfile({ sobriety_start: state.startDate.toISOString() });
    showToast('Start date saved ✓');
    tickClock();
  });

  // Save weekly spend
  document.getElementById('save-weekly-spend').addEventListener('click', async () => {
    const val = parseFloat(spendInput.value);
    if (isNaN(val) || val < 0) return;
    state.weeklySpend = val;
    await saveProfile({ weekly_spend: val });
    showToast('Weekly spend saved ✓');
    tickClock();
  });

  // Save name
  document.getElementById('save-name').addEventListener('click', async () => {
    const val = nameInput.value.trim();
    if (!val) return;
    state.userName = val;
    await saveProfile({ name: val });
    showToast('Name saved ✓');
    updateGreeting();
  });

  // Reset counter
  document.getElementById('reset-btn').addEventListener('click', async () => {
    const note = prompt('Optional: Add a note about this reset (leave blank to skip)') ?? '';
    if (!confirm('Reset your sobriety counter? Your previous streak will be saved in your history.')) return;

    await logRelapse(note || 'Counter reset');

    const startInput = document.getElementById('start-date-input');
    startInput.value = toDatetimeLocal(state.startDate);
    tickClock();
    renderSobrietyHistory();
    switchPage('dashboard');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-page="dashboard"]').classList.add('active');
    showToast('Counter reset. Your history is saved. Day 1 begins now. 💙');
  });
}

function toDatetimeLocal(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

// ============================================
// URGE MODAL
// ============================================
function initUrgeModal() {
  document.getElementById('start-urge-surf').addEventListener('click', openUrgeModal);
  document.getElementById('close-urge-modal').addEventListener('click', closeUrgeModal);
}

function openUrgeModal() {
  const modal       = document.getElementById('urge-modal');
  modal.style.display = 'flex';

  const totalSeconds = 15 * 60;
  let remaining      = totalSeconds;
  const fill         = document.getElementById('urge-fill');
  const countdown    = document.getElementById('urge-countdown');
  fill.style.width   = '100%';

  state.urgeTimerInterval = setInterval(() => {
    remaining--;
    const pct = (remaining / totalSeconds) * 100;
    countdown.textContent = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;
    fill.style.width = pct + '%';
    if (remaining <= 0) {
      clearInterval(state.urgeTimerInterval);
      countdown.textContent = '00:00';
      document.getElementById('close-urge-modal').textContent = 'You Did It! ✓';
    }
  }, 1000);
}

function closeUrgeModal() {
  document.getElementById('urge-modal').style.display = 'none';
  clearInterval(state.urgeTimerInterval);
  document.getElementById('close-urge-modal').textContent = 'I Surfed It ✓';
  document.getElementById('urge-fill').style.width        = '100%';
  document.getElementById('urge-countdown').textContent   = '15:00';
}

// ============================================
// TOAST
// ============================================
function showToast(msg) {
  const existing = document.getElementById('ancora-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'ancora-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;
    background: var(--teal, #2a7d6e); color: #fff;
    padding: 0.75rem 1.25rem; border-radius: 10px;
    font-family: var(--font-mono, monospace); font-size: 0.78rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.22);
    animation: _toastIn 0.25s ease;
  `;

  if (!document.getElementById('_toast-style')) {
    const s = document.createElement('style');
    s.id = '_toast-style';
    s.textContent = `@keyframes _toastIn {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0);    }
    }`;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.opacity    = '0';
    setTimeout(() => toast.remove(), 320);
  }, 2500);
}

// ============================================
// BACKGROUND CANVAS
// ============================================
function drawBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 55 }, () => ({
    x:     Math.random() * window.innerWidth,
    y:     Math.random() * window.innerHeight,
    r:     Math.random() * 2.5 + 0.5,
    vx:    (Math.random() - 0.5) * 0.3,
    vy:    (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.4 + 0.1,
  }));

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep background gradient
    const bg = ctx.createRadialGradient(
      canvas.width * 0.3, canvas.height * 0.4, 0,
      canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.85
    );
    bg.addColorStop(0,   '#1f2d2b');
    bg.addColorStop(0.5, '#161a19');
    bg.addColorStop(1,   '#0e1110');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Aurora glow
    const aurora = ctx.createRadialGradient(
      canvas.width * 0.6, canvas.height * 0.2, 0,
      canvas.width * 0.6, canvas.height * 0.2, canvas.width * 0.5
    );
    aurora.addColorStop(0,   'rgba(42,125,110,0.12)');
    aurora.addColorStop(0.5, 'rgba(42,125,110,0.04)');
    aurora.addColorStop(1,   'transparent');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0)             p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0)             p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,215,${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(drawFrame);
  }

  drawFrame();
}