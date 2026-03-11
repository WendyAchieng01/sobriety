/* ============================================
   Ancora — Auth Pages JS
   auth.js  (shared by login.html + signup.html)
   ============================================ */

'use strict';

// ============================================
// BACKGROUND CANVAS (same as main app)
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

  const particles = Array.from({ length: 60 }, () => ({
    x:  Math.random() * window.innerWidth,
    y:  Math.random() * window.innerHeight,
    r:  Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    alpha: Math.random() * 0.35 + 0.08,
  }));

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bg = ctx.createRadialGradient(
      canvas.width * 0.25, canvas.height * 0.5, 0,
      canvas.width * 0.5,  canvas.height * 0.5, canvas.width * 0.9
    );
    bg.addColorStop(0,   '#1f2d2b');
    bg.addColorStop(0.5, '#161a19');
    bg.addColorStop(1,   '#0d0f0e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(
      canvas.width * 0.22, canvas.height * 0.55, 0,
      canvas.width * 0.22, canvas.height * 0.55, canvas.width * 0.55
    );
    glow.addColorStop(0, 'rgba(42,125,110,0.14)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,215,${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }
  frame();
}

// ============================================
// HELPERS
// ============================================
function val(id)  { return document.getElementById(id)?.value.trim() ?? ''; }
function err(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}
function clearErr(id) { err(id, ''); }

function setInputState(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('error', 'success');
  if (state) el.classList.add(state);
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function showSuccess(msg, sub) {
  const overlay = document.getElementById('success-overlay');
  if (!overlay) return;
  const msgEl = overlay.querySelector('.success-msg');
  const subEl = overlay.querySelector('.success-sub');
  if (msgEl) msgEl.textContent = msg;
  if (subEl) subEl.textContent = sub;
  overlay.style.display = 'flex';
}

// ============================================
// PASSWORD TOGGLE
// ============================================
function initPasswordToggle(toggleId, inputId) {
  const btn = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁';
  });
}

// ============================================
// PASSWORD STRENGTH
// ============================================
function initPasswordStrength(inputId) {
  const input = document.getElementById(inputId);
  const fill  = document.getElementById('pw-fill');
  const label = document.getElementById('pw-label');
  if (!input || !fill || !label) return;

  input.addEventListener('input', () => {
    const pw = input.value;
    let score = 0;
    if (pw.length >= 8)             score++;
    if (/[A-Z]/.test(pw))           score++;
    if (/[0-9]/.test(pw))           score++;
    if (/[^A-Za-z0-9]/.test(pw))    score++;

    const levels = [
      { pct: '0%',   color: 'transparent',  text: '' },
      { pct: '25%',  color: '#b84c3a',       text: 'Weak' },
      { pct: '50%',  color: '#c89b3c',       text: 'Fair' },
      { pct: '75%',  color: '#3da08e',       text: 'Good' },
      { pct: '100%', color: '#2a7d6e',       text: 'Strong' },
    ];

    const lvl = levels[score] || levels[0];
    fill.style.width      = pw.length ? lvl.pct : '0%';
    fill.style.background = lvl.color;
    label.textContent     = pw.length ? lvl.text : '';
  });
}

// ============================================
// LOGIN PAGE
// ============================================
function initLogin() {
  initPasswordToggle('toggle-pw', 'password');

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    clearErr('email-error');
    clearErr('password-error');

    const email    = val('email');
    const password = val('password');

    if (!email) {
      err('email-error', 'Email is required.');
      setInputState('email', 'error');
      valid = false;
    } else if (!isValidEmail(email)) {
      err('email-error', 'Please enter a valid email address.');
      setInputState('email', 'error');
      valid = false;
    } else {
      setInputState('email', 'success');
    }

    if (!password) {
      err('password-error', 'Password is required.');
      setInputState('password', 'error');
      valid = false;
    } else if (password.length < 6) {
      err('password-error', 'Password must be at least 6 characters.');
      setInputState('password', 'error');
      valid = false;
    } else {
      setInputState('password', 'success');
    }

    if (!valid) return;

    // Simulate login — replace with real auth call
    const btn = document.getElementById('login-btn');
    btn.querySelector('.btn-text').textContent = 'Signing in…';
    btn.disabled = true;

    setTimeout(() => {
      // Persist user session stub
      localStorage.setItem('ancora_user', JSON.stringify({ email }));
      showSuccess('Welcome back.', 'Redirecting to your dashboard…');
      setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    }, 1200);
  });

  // OAuth stubs
  document.getElementById('google-btn')?.addEventListener('click', () => {
    showSuccess('Connecting…', 'Authenticating with Google…');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
  });

  document.getElementById('apple-btn')?.addEventListener('click', () => {
    showSuccess('Connecting…', 'Authenticating with Apple…');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
  });
}

// ============================================
// SIGNUP PAGE — MULTI-STEP
// ============================================
function initSignup() {
  if (!document.getElementById('signup-form')) return;

  initPasswordToggle('su-toggle-pw', 'su-password');
  initPasswordStrength('su-password');
  initRecoveryChips();

  // Set default datetime to now
  const startInput = document.getElementById('su-start-date');
  if (startInput) {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    startInput.value = local.toISOString().slice(0, 16);
  }

  let currentStep = 1;

  // ---- Step navigation ----
  document.getElementById('next-1')?.addEventListener('click', () => {
    if (validateStep1()) goToStep(2);
  });

  document.getElementById('next-2')?.addEventListener('click', () => {
    if (validateStep2()) goToStep(3);
  });

  document.getElementById('back-1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('back-2')?.addEventListener('click', () => goToStep(2));

  function goToStep(n) {
    currentStep = n;
    document.querySelectorAll('.form-step').forEach((s, i) => {
      s.classList.toggle('active', i + 1 === n);
    });
    updateStepIndicator(n);
  }

  function updateStepIndicator(n) {
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i + 1 === n)  dot.classList.add('active');
      if (i + 1 <  n)  dot.classList.add('done');
    });
    document.querySelectorAll('.step-line').forEach((line, i) => {
      line.classList.toggle('done', i + 1 < n);
    });
    document.querySelectorAll('.step-lbl').forEach((lbl, i) => {
      lbl.classList.remove('active', 'done');
      if (i + 1 === n) lbl.classList.add('active');
      if (i + 1 <  n)  lbl.classList.add('done');
    });
  }

  // ---- Validations ----
  function validateStep1() {
    let valid = true;
    clearErr('su-email-error');
    clearErr('su-password-error');
    clearErr('su-confirm-error');

    const email    = val('su-email');
    const password = val('su-password');
    const confirm  = val('su-confirm');

    if (!email || !isValidEmail(email)) {
      err('su-email-error', 'Please enter a valid email address.');
      setInputState('su-email', 'error');
      valid = false;
    } else { setInputState('su-email', 'success'); }

    if (password.length < 8) {
      err('su-password-error', 'Password must be at least 8 characters.');
      setInputState('su-password', 'error');
      valid = false;
    } else { setInputState('su-password', 'success'); }

    if (confirm !== password) {
      err('su-confirm-error', 'Passwords do not match.');
      setInputState('su-confirm', 'error');
      valid = false;
    } else if (confirm) { setInputState('su-confirm', 'success'); }

    return valid;
  }

  function validateStep2() {
    let valid = true;
    clearErr('su-name-error');
    clearErr('su-recovery-error');

    if (!val('su-name')) {
      err('su-name-error', 'Please tell us what to call you.');
      setInputState('su-name', 'error');
      valid = false;
    } else { setInputState('su-name', 'success'); }

    const selected = document.querySelector('.chip.selected');
    if (!selected) {
      err('su-recovery-error', 'Please choose at least one option.');
      valid = false;
    }

    return valid;
  }

  // ---- Final Submit ----
  document.getElementById('signup-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    clearErr('su-agree-error');

    const agreed = document.getElementById('su-agree')?.checked;
    if (!agreed) {
      err('su-agree-error', 'You must agree to the Terms and Privacy Policy.');
      valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('create-btn');
    btn.querySelector('.btn-text').textContent = 'Creating account…';
    btn.disabled = true;

    // Build user profile stub
    const profile = {
      email:      val('su-email'),
      name:       val('su-name'),
      recovery:   document.querySelector('.chip.selected')?.dataset.val || '',
      dailySpend: parseFloat(val('su-spend')) || 10,
      startDate:  document.getElementById('su-start-date')?.value || new Date().toISOString(),
    };

    // Save to localStorage for the main app to pick up
    localStorage.setItem('ancora_user', JSON.stringify(profile));
    localStorage.setItem('ancora_state', JSON.stringify({
      startDate:  profile.startDate,
      userName:   profile.name,
      dailySpend: profile.dailySpend,
      journal:    [],
    }));

    setTimeout(() => {
      showSuccess('You\'re anchored.', 'Your journey begins now. Redirecting…');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    }, 1400);
  });
}

// ============================================
// RECOVERY CHIPS
// ============================================
function initRecoveryChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      clearErr('su-recovery-error');
    });
  });
}

// ============================================
// BOOT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  drawBgCanvas();
  initLogin();
  initSignup();
});