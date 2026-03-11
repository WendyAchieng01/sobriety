/* ============================================
   Ancora — Sobriety App · index.js
   ============================================ */

'use strict';

// ============================================
// STATE
// ============================================
const state = {
  startDate: null,
  userName: 'Friend',
  dailySpend: 10,
  journal: [],
  moodToday: null,
  breatheRunning: false,
  breatheInterval: null,
  urgeTimerInterval: null,
};

const MILESTONES = [
  { days: 1,   icon: '🌱', name: 'First Day' },
  { days: 3,   icon: '🌿', name: 'Three Days' },
  { days: 7,   icon: '🌊', name: 'One Week' },
  { days: 14,  icon: '🔥', name: 'Two Weeks' },
  { days: 30,  icon: '🌙', name: 'One Month' },
  { days: 60,  icon: '⭐', name: 'Two Months' },
  { days: 90,  icon: '🏔️', name: 'Ninety Days' },
  { days: 180, icon: '🌟', name: 'Half Year' },
  { days: 365, icon: '🏆', name: 'One Year' },
  { days: 730, icon: '👑', name: 'Two Years' },
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
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
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
  setInterval(tickClock, 1000);
});

// ============================================
// PERSIST / LOAD
// ============================================
function saveState() {
  try {
    localStorage.setItem('Ancora_state', JSON.stringify({
      startDate: state.startDate,
      userName: state.userName,
      dailySpend: state.dailySpend,
      journal: state.journal,
    }));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('Ancora_state');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.startDate) state.startDate = new Date(saved.startDate);
    if (saved.userName)  state.userName  = saved.userName;
    if (saved.dailySpend !== undefined) state.dailySpend = saved.dailySpend;
    if (saved.journal)   state.journal   = saved.journal;
  } catch(e) {}
}

// ============================================
// NAVIGATION
// ============================================
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.dataset.page;
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
// DATE / CLOCK
// ============================================
function setTodayDate() {
  const el = document.getElementById('today-date');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function setDailyQuote() {
  const el = document.getElementById('daily-quote');
  if (!el) return;
  const idx = new Date().getDate() % QUOTES.length;
  el.textContent = QUOTES[idx];
}

function tickClock() {
  if (!state.startDate) return;
  const now = new Date();
  const diff = now - state.startDate;

  if (diff < 0) return;

  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  setEl('counter-days', days);
  setEl('stat-hours', pad(hours));
  setEl('stat-minutes', pad(minutes));
  setEl('stat-seconds', pad(seconds));
  setEl('streak-count', days);
  setEl('money-saved', '$' + (days * state.dailySpend).toFixed(0));
  setEl('health-score', Math.min(100, Math.round(50 + (days / 365) * 50)) + '%');

  // Next milestone
  const next = MILESTONES.find(m => m.days > days);
  setEl('next-milestone', next ? next.days + 'd' : '∞');

  // Ring progress (circle up to 365 days)
  const progress = Math.min(days / 365, 1);
  const circumference = 2 * Math.PI * 95;
  const offset = circumference - circumference * progress;
  const ring = document.getElementById('ring-progress');
  if (ring) ring.style.strokeDashoffset = offset;

  // Update milestones
  renderMilestones(days);
}

function pad(n) { return n.toString().padStart(2, '0'); }
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ============================================
// DASHBOARD
// ============================================
function initDashboard() {
  // Mood
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.moodToday = parseInt(btn.dataset.mood);
      const labels = {5:'Feeling great — keep it up! 🌟', 4:'Good energy today 🙂', 3:'Getting through it 💪', 2:'Tough day — you\'re not alone 💙', 1:'Reach out to someone today 🤝'};
      const el = document.getElementById('checkin-status');
      if (el) el.textContent = labels[state.moodToday];
    });
  });

  // If no start date set, prompt
  if (!state.startDate) {
    state.startDate = new Date();
    saveState();
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
    card.className = 'milestone-card' + (unlocked ? ' unlocked' : '');
    card.innerHTML = `
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-days">${m.days}</div>
      <div class="milestone-name">${m.name}</div>
      <span class="milestone-badge">Earned</span>
    `;
    grid.appendChild(card);
  });
}

// ============================================
// JOURNAL
// ============================================
function initJournal() {
  renderJournal();

  document.getElementById('new-entry-btn').addEventListener('click', () => {
    document.getElementById('journal-compose').style.display = 'block';
    document.getElementById('journal-title').focus();
  });

  document.getElementById('cancel-entry').addEventListener('click', () => {
    closeCompose();
  });

  document.getElementById('save-entry').addEventListener('click', () => {
    const title = document.getElementById('journal-title').value.trim();
    const body = document.getElementById('journal-body').value.trim();
    if (!title && !body) return;
    state.journal.unshift({
      id: Date.now(),
      title: title || 'Untitled',
      body,
      date: new Date().toISOString(),
    });
    saveState();
    renderJournal();
    closeCompose();
  });
}

function closeCompose() {
  document.getElementById('journal-compose').style.display = 'none';
  document.getElementById('journal-title').value = '';
  document.getElementById('journal-body').value = '';
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
      <div class="je-date">${new Date(e.date).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
      <div class="je-preview">${escHtml(e.body)}</div>
    </div>
  `).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ============================================
// BREATHE
// ============================================
const BREATHE_PATTERNS = {
  '4-4-4-4': [
    { phase: 'Inhale',     dur: 4, state: 'inhale' },
    { phase: 'Hold',       dur: 4, state: '' },
    { phase: 'Exhale',     dur: 4, state: 'exhale' },
    { phase: 'Hold',       dur: 4, state: '' },
  ],
  '4-7-8': [
    { phase: 'Inhale',     dur: 4, state: 'inhale' },
    { phase: 'Hold',       dur: 7, state: '' },
    { phase: 'Exhale',     dur: 8, state: 'exhale' },
  ],
  '5-5': [
    { phase: 'Inhale',     dur: 5, state: 'inhale' },
    { phase: 'Exhale',     dur: 5, state: 'exhale' },
  ],
};

function initBreathe() {
  document.getElementById('breathe-btn').addEventListener('click', () => {
    if (state.breatheRunning) {
      stopBreathe();
    } else {
      startBreathe();
    }
  });
}

function startBreathe() {
  state.breatheRunning = true;
  document.getElementById('breathe-btn').textContent = 'Stop Session';
  const patternKey = document.getElementById('breathe-pattern').value;
  const pattern = BREATHE_PATTERNS[patternKey];
  let stepIdx = 0;
  let countdown = 0;

  function runStep() {
    const step = pattern[stepIdx];
    countdown = step.dur;

    const orb = document.getElementById('breathe-orb');
    const instr = document.getElementById('breathe-instruction');

    orb.className = 'breathe-orb ' + step.state;
    if (instr) instr.textContent = step.phase;
    document.getElementById('breathe-cycle').textContent = `${step.phase} · ${step.dur}s`;

    state.breatheInterval = setInterval(() => {
      countdown--;
      document.getElementById('breathe-cycle').textContent = `${step.phase} · ${countdown}s`;
      if (countdown <= 0) {
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
  clearInterval(state.breatheInterval);
  document.getElementById('breathe-btn').textContent = 'Start Session';
  const orb = document.getElementById('breathe-orb');
  orb.className = 'breathe-orb';
  const instr = document.getElementById('breathe-instruction');
  if (instr) instr.textContent = 'Press Start';
  document.getElementById('breathe-cycle').textContent = '';
}

// ============================================
// SETTINGS
// ============================================
function initSettings() {
  const startInput = document.getElementById('start-date-input');
  const spendInput = document.getElementById('daily-spend');
  const nameInput  = document.getElementById('user-name');

  if (state.startDate) startInput.value = toDatetimeLocal(state.startDate);
  if (state.dailySpend) spendInput.value = state.dailySpend;
  if (state.userName) nameInput.value = state.userName !== 'Friend' ? state.userName : '';

  document.getElementById('save-start-date').addEventListener('click', () => {
    const val = startInput.value;
    if (!val) return;
    state.startDate = new Date(val);
    saveState();
    showToast('Start date saved ✓');
    tickClock();
  });

  document.getElementById('save-spend').addEventListener('click', () => {
    const val = parseFloat(spendInput.value);
    if (isNaN(val) || val < 0) return;
    state.dailySpend = val;
    saveState();
    showToast('Daily spend saved ✓');
  });

  document.getElementById('save-name').addEventListener('click', () => {
    const val = nameInput.value.trim();
    if (!val) return;
    state.userName = val;
    saveState();
    showToast('Name saved ✓');
    document.querySelector('.page-eyebrow') && updateGreeting();
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset your sobriety counter? This cannot be undone, but you can start fresh.')) return;
    state.startDate = new Date();
    saveState();
    tickClock();
    switchPage('dashboard');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-page="dashboard"]').classList.add('active');
    showToast('Counter reset. Day 1 begins now. 💙');
  });
}

function toDatetimeLocal(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function updateGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.querySelector('#page-dashboard .page-eyebrow');
  if (el) el.textContent = `${greet}, ${state.userName}`;
}

// ============================================
// URGE MODAL
// ============================================
function initUrgeModal() {
  document.getElementById('start-urge-surf').addEventListener('click', () => {
    openUrgeModal();
  });

  document.getElementById('close-urge-modal').addEventListener('click', () => {
    closeUrgeModal();
  });
}

function openUrgeModal() {
  const modal = document.getElementById('urge-modal');
  modal.style.display = 'flex';

  const totalSeconds = 15 * 60;
  let remaining = totalSeconds;

  const fill = document.getElementById('urge-fill');
  const countdown = document.getElementById('urge-countdown');
  fill.style.width = '100%';

  state.urgeTimerInterval = setInterval(() => {
    remaining--;
    const pct = (remaining / totalSeconds) * 100;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    countdown.textContent = `${pad(m)}:${pad(s)}`;
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
  document.getElementById('urge-fill').style.width = '100%';
  document.getElementById('urge-countdown').textContent = '15:00';
}

// ============================================
// TOAST
// ============================================
function showToast(msg) {
  const existing = document.getElementById('Ancora-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'Ancora-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:2rem; right:2rem; z-index:999;
    background: var(--teal); color: white;
    padding: 0.75rem 1.25rem;
    border-radius: 10px;
    font-family: var(--font-mono, monospace);
    font-size: 0.78rem;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    animation: slideUpFade 0.25s ease;
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes slideUpFade {
    from { opacity:0; transform: translateY(10px); }
    to   { opacity:1; transform: translateY(0); }
  }`;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
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

  // Floating particles
  const particles = Array.from({ length: 55 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    alpha: Math.random() * 0.4 + 0.1,
  }));

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep background
    const bg = ctx.createRadialGradient(
      canvas.width * 0.3, canvas.height * 0.4, 0,
      canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.85
    );
    bg.addColorStop(0, '#1f2d2b');
    bg.addColorStop(0.5, '#161a19');
    bg.addColorStop(1, '#0e1110');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle aurora glow
    const aurora = ctx.createRadialGradient(
      canvas.width * 0.6, canvas.height * 0.2, 0,
      canvas.width * 0.6, canvas.height * 0.2, canvas.width * 0.5
    );
    aurora.addColorStop(0, 'rgba(42,125,110,0.12)');
    aurora.addColorStop(0.5, 'rgba(42,125,110,0.04)');
    aurora.addColorStop(1, 'transparent');
    ctx.fillStyle = aurora;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 215, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(drawFrame);
  }

  drawFrame();
}