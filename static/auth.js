/* ============================================
   Ancora — auth.js
   Shared by login.html + signup.html
   ============================================ */

'use strict';

// ============================================
// BOOT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  drawBgCanvas();
  initLogin();
  initSignup();
});

// ============================================
// LOGIN PAGE
// ============================================
function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  initPasswordToggle('toggle-pw', 'password');

  form.addEventListener('submit', (e) => {
    // --- Client-side validation ---
    let valid = true;

    clearErr('email-error');
    clearErr('password-error');

    const email    = val('email');
    const password = val('password');

    if (!email) {
      err('email-error', 'Email address is required.');
      setFieldState('email', 'error');
      valid = false;
    } else if (!isValidEmail(email)) {
      err('email-error', 'Please enter a valid email address.');
      setFieldState('email', 'error');
      valid = false;
    } else {
      setFieldState('email', 'success');
    }

    if (!password) {
      err('password-error', 'Password is required.');
      setFieldState('password', 'error');
      valid = false;
    } else {
      setFieldState('password', 'success');
    }

    if (!valid) {
      e.preventDefault();   // stop submit — show inline errors
      return;
    }

    // --- Valid: show overlay then let the form POST to Django ---
    const overlay = document.getElementById('success-overlay');
    if (overlay) overlay.style.display = 'flex';

    const btn = document.getElementById('login-btn');
    if (btn) {
      const t = btn.querySelector('.btn-text');
      if (t) t.textContent = 'Signing in…';
      btn.disabled = true;
    }
    // Do NOT call e.preventDefault() — the native POST goes through.
  });
}

// ============================================
// SIGNUP PAGE — MULTI-STEP
// ============================================
function initSignup() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // --- Sub-inits ---
  initPasswordToggle('su-toggle-pw', 'su-password');
  initPasswordStrength('su-password');
  initRecoveryChips();
  setDefaultStartDate();
  restoreChipFromPost();     // Re-highlight chip if Django returned POST data

  // ── Step references ──
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');

  // ── Navigation ──
  document.getElementById('next-1')?.addEventListener('click', () => {
    if (validateStep1()) goToStep(step1, step2, 2);
  });

  document.getElementById('back-1')?.addEventListener('click', () => {
    goToStep(step2, step1, 1);
  });

  document.getElementById('next-2')?.addEventListener('click', () => {
    if (validateStep2()) goToStep(step2, step3, 3);
  });

  document.getElementById('back-2')?.addEventListener('click', () => {
    goToStep(step3, step2, 2);
  });

  // ── Final submit ──
  form.addEventListener('submit', (e) => {
    // Validate step 3 fields before allowing POST
    let valid = true;

    clearErr('su-agree-error');
    clearErr('su-date-error');

    if (!document.getElementById('su-agree')?.checked) {
      err('su-agree-error', 'You must agree to the Terms and Privacy Policy.');
      valid = false;
    }

    if (!val('su-start-date')) {
      err('su-date-error', 'Please choose your sobriety start date.');
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      return;
    }

    // Show success overlay — Django will redirect after POST completes
    const overlay = document.getElementById('success-overlay');
    if (overlay) overlay.style.display = 'flex';

    const btn = document.getElementById('create-btn');
    if (btn) {
      btn.querySelector('.btn-text').textContent = 'Creating account…';
      btn.disabled = true;
    }
    // Form submits naturally to Django view
  });
}

// ============================================
// STEP SWITCHER
// ============================================
function goToStep(from, to, stepNum) {
  from.classList.remove('active');
  to.classList.add('active');
  updateStepIndicator(stepNum);
  // Scroll form wrap to top on mobile
  document.querySelector('.right-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepIndicator(n) {
  [1, 2, 3].forEach(i => {
    const dot  = document.getElementById('dot-'  + i);
    const lbl  = document.getElementById('lbl-'  + i);
    const line = document.getElementById('line-' + i);

    if (!dot) return;

    dot.classList.remove('active', 'done');
    if (lbl) lbl.classList.remove('active', 'done');

    if (i === n) {
      dot.classList.add('active');
      if (lbl) lbl.classList.add('active');
    } else if (i < n) {
      dot.classList.add('done');
      if (lbl) lbl.classList.add('done');
    }

    if (line && i < 3) {
      line.classList.toggle('done', i < n);
    }
  });
}

// ============================================
// STEP VALIDATORS
// ============================================
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
    setFieldState('su-email', 'error');
    valid = false;
  } else {
    setFieldState('su-email', 'success');
  }

  if (password.length < 8) {
    err('su-password-error', 'Password must be at least 8 characters.');
    setFieldState('su-password', 'error');
    valid = false;
  } else {
    setFieldState('su-password', 'success');
  }

  if (!confirm) {
    err('su-confirm-error', 'Please confirm your password.');
    setFieldState('su-confirm', 'error');
    valid = false;
  } else if (confirm !== password) {
    err('su-confirm-error', 'Passwords do not match.');
    setFieldState('su-confirm', 'error');
    valid = false;
  } else {
    setFieldState('su-confirm', 'success');
  }

  return valid;
}

function validateStep2() {
  let valid = true;

  clearErr('su-name-error');
  clearErr('su-recovery-error');

  if (!val('su-name')) {
    err('su-name-error', 'Please tell us what to call you.');
    setFieldState('su-name', 'error');
    valid = false;
  } else {
    setFieldState('su-name', 'success');
  }

  if (!val('recovery-input')) {
    err('su-recovery-error', 'Please choose at least one option.');
    valid = false;
  }

  return valid;
}

// ============================================
// RECOVERY CHIPS
// ============================================
function initRecoveryChips() {
  document.querySelectorAll('#recovery-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Deselect all
      document.querySelectorAll('#recovery-chips .chip').forEach(c => {
        c.classList.remove('selected', 'active');
      });
      // Select clicked
      chip.classList.add('selected');
      // Write to hidden input so it's included in POST
      const input = document.getElementById('recovery-input');
      if (input) input.value = chip.dataset.val;
      clearErr('su-recovery-error');
    });
  });
}

// Re-highlight the chip that matches POST data (after a failed submit + redirect)
function restoreChipFromPost() {
  const input = document.getElementById('recovery-input');
  if (!input || !input.value) return;
  const match = document.querySelector(
    `#recovery-chips .chip[data-val="${input.value}"]`
  );
  if (match) match.classList.add('selected');
}

// ============================================
// DEFAULT START DATE (now)
// ============================================
function setDefaultStartDate() {
  const input = document.getElementById('su-start-date');
  if (!input || input.value) return;     // Don't override POST value
  const now    = new Date();
  const offset = now.getTimezoneOffset();
  const local  = new Date(now.getTime() - offset * 60000);
  input.value  = local.toISOString().slice(0, 16);
}

// ============================================
// PASSWORD TOGGLE
// ============================================
function initPasswordToggle(toggleId, inputId) {
  const btn   = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type  = show ? 'text' : 'password';
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
    if (pw.length >= 8)           score++;
    if (/[A-Z]/.test(pw))         score++;
    if (/[0-9]/.test(pw))         score++;
    if (/[^A-Za-z0-9]/.test(pw))  score++;

    const levels = [
      { pct: '0%',   color: 'transparent', text: '' },
      { pct: '25%',  color: '#b84c3a',     text: 'Weak' },
      { pct: '50%',  color: '#c89b3c',     text: 'Fair' },
      { pct: '75%',  color: '#3da08e',     text: 'Good' },
      { pct: '100%', color: '#2a7d6e',     text: 'Strong' },
    ];

    const lvl = levels[score] || levels[0];
    fill.style.width      = pw.length ? lvl.pct : '0%';
    fill.style.background = lvl.color;
    label.textContent     = pw.length ? lvl.text : '';
  });
}

// ============================================
// HELPERS
// ============================================
function val(id) {
  return (document.getElementById(id)?.value ?? '').trim();
}

function err(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErr(id) { err(id, ''); }

function setFieldState(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('error', 'success');
  if (state) el.classList.add(state);
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ============================================
// BACKGROUND CANVAS
// ============================================
function drawBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 60 }, () => ({
    x:     Math.random(),
    y:     Math.random(),
    r:     Math.random() * 2 + 0.5,
    vx:    (Math.random() - 0.5) * 0.0003,
    vy:    (Math.random() - 0.5) * 0.0003,
    alpha: Math.random() * 0.35 + 0.08,
  }));

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // Deep background
    const bg = ctx.createRadialGradient(W * 0.25, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.9);
    bg.addColorStop(0,   '#1f2d2b');
    bg.addColorStop(0.5, '#161a19');
    bg.addColorStop(1,   '#0d0f0e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Teal aurora glow
    const glow = ctx.createRadialGradient(W * 0.22, H * 0.55, 0, W * 0.22, H * 0.55, W * 0.55);
    glow.addColorStop(0, 'rgba(42,125,110,0.14)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,215,${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }

  frame();
}