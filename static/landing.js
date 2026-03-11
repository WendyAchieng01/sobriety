/* ============================================
   Ancora — Landing Page JS
   landing.js
   ============================================ */

'use strict';

// ============================================
// CONFIG
// ============================================
const SEQUENCE = [
  { id: 'msg-1', hold: 2400 },
  { id: 'msg-2', hold: 3000 },
  { id: 'msg-3', hold: 2400 },
  { id: 'msg-4', hold: 3000 },
  { id: 'msg-5', hold: 2800 },
  { id: 'msg-6', hold: 3000 },
  { id: 'msg-7', hold: Infinity }, // Final frame — stays
];

const FADE_DUR   = 800;   // ms for fade in/out
const AUTO_REDIR = 8;     // seconds on final frame before auto-redirect

// ============================================
// STATE
// ============================================
let currentStep = 0;
let autoRedirTimer = null;
let countdownInterval = null;
let sequenceTimer = null;
let isTransitioning = false;

// ============================================
// BOOT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  drawBgCanvas();
  wrapWords();
  startSequence();
  initProgressDots();
  initSkipBtn();
  initAutoRedirect();
});

// ============================================
// WORD WRAP — splits text nodes into .word spans
// ============================================
function wrapWords() {
  document.querySelectorAll('.msg-line').forEach(line => {
    // Collect all text, preserve <em> children
    const children = Array.from(line.childNodes);
    line.innerHTML = '';

    children.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const words = node.textContent.split(/(\s+)/);
        words.forEach(w => {
          if (w.trim()) {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            line.appendChild(span);
            line.appendChild(document.createTextNode(' '));
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // em tags — wrap their words too
        const words = node.textContent.split(/(\s+)/);
        words.forEach(w => {
          if (w.trim()) {
            const em = document.createElement('em');
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            em.appendChild(span);
            line.appendChild(em);
            line.appendChild(document.createTextNode(' '));
          }
        });
      }
    });
  });
}

// ============================================
// SEQUENCE ENGINE
// ============================================
function startSequence() {
  showStep(0);
}

function showStep(idx) {
  if (idx >= SEQUENCE.length) return;
  currentStep = idx;

  const step = SEQUENCE[idx];
  const frame = document.getElementById(step.id);

  // Update dots
  updateDots(idx);

  // Fade in
  frame.classList.add('visible');

  if (step.hold === Infinity) {
    // Final frame: start auto-redirect countdown
    startAutoRedirect();
    return;
  }

  // Hold, then fade out and advance
  sequenceTimer = setTimeout(() => {
    fadeOut(frame, () => {
      showStep(idx + 1);
    });
  }, step.hold);
}

function fadeOut(frame, cb) {
  if (isTransitioning) return;
  isTransitioning = true;
  frame.style.transition = `opacity ${FADE_DUR}ms ease`;
  frame.style.opacity = '0';
  setTimeout(() => {
    frame.classList.remove('visible');
    frame.style.opacity = '';
    frame.style.transition = '';
    isTransitioning = false;
    if (cb) cb();
  }, FADE_DUR);
}

// Jump to final frame immediately
function jumpToFinal() {
  clearTimeout(sequenceTimer);
  clearInterval(countdownInterval);
  // Hide all frames
  document.querySelectorAll('.message-frame').forEach(f => {
    f.classList.remove('visible');
    f.style.opacity = '';
  });
  isTransitioning = false;
  currentStep = SEQUENCE.length - 1;
  updateDots(currentStep);
  const final = document.getElementById('msg-7');
  final.classList.add('visible');
  startAutoRedirect();
}

// ============================================
// PROGRESS DOTS
// ============================================
function initProgressDots() {
  document.querySelectorAll('.pdot').forEach(dot => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step);
      if (step === SEQUENCE.length - 1) {
        jumpToFinal();
      } else if (step > currentStep) {
        clearTimeout(sequenceTimer);
        const current = document.getElementById(SEQUENCE[currentStep].id);
        fadeOut(current, () => showStep(step));
      }
    });
  });
}

function updateDots(idx) {
  document.querySelectorAll('.pdot').forEach((dot, i) => {
    dot.classList.remove('active', 'active-final');
    if (i === idx) {
      if (i === SEQUENCE.length - 1) {
        dot.classList.add('active-final');
      } else {
        dot.classList.add('active');
      }
    }
  });
}

// ============================================
// SKIP BUTTON (on final frame)
// ============================================
function initSkipBtn() {
  document.getElementById('auto-redirect-btn')?.addEventListener('click', () => {
    redirectToLogin();
  });
}

// ============================================
// AUTO-REDIRECT (countdown on final frame)
// ============================================
function initAutoRedirect() {
  // Will be triggered when final frame shows
}

function startAutoRedirect() {
  let remaining = AUTO_REDIR;
  const numEl = document.getElementById('countdown-num');
  if (numEl) numEl.textContent = remaining;

  countdownInterval = setInterval(() => {
    remaining--;
    if (numEl) numEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      redirectToLogin();
    }
  }, 1000);
}

function redirectToLogin() {
  clearInterval(countdownInterval);
  document.body.classList.add('transitioning-out');
  setTimeout(() => {
    window.location.href = '/accounts/login/';
  }, 700);
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

  // Stars / particles
  const stars = Array.from({ length: 80 }, () => ({
    x:     Math.random(),
    y:     Math.random(),
    r:     Math.random() * 1.8 + 0.3,
    vx:    (Math.random() - 0.5) * 0.0002,
    vy:    (Math.random() - 0.5) * 0.0002,
    alpha: Math.random() * 0.5 + 0.05,
    twinkleOffset: Math.random() * Math.PI * 2,
    twinkleSpeed:  Math.random() * 0.02 + 0.005,
  }));

  // Slow-moving large orbs
  const orbs = [
    { x: 0.15, y: 0.4,  r: 0.35, color: 'rgba(42,125,110,', speed: 0.00008 },
    { x: 0.82, y: 0.6,  r: 0.28, color: 'rgba(200,155,60,',  speed: 0.00006 },
    { x: 0.5,  y: 0.85, r: 0.22, color: 'rgba(42,125,110,',  speed: 0.0001  },
  ];
  let orbAngle = 0;

  let t = 0;

  function frame() {
    t++;
    orbAngle += 0.0005;
    ctx.clearRect(0, 0, W, H);

    // Base background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0c1210');
    grad.addColorStop(0.5, '#111817');
    grad.addColorStop(1, '#0a0f0e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Orbs
    orbs.forEach((orb, i) => {
      const ox = (orb.x + Math.sin(orbAngle * (i + 1) * 0.7) * 0.06) * W;
      const oy = (orb.y + Math.cos(orbAngle * (i + 1) * 0.5) * 0.04) * H;
      const rr = orb.r * Math.min(W, H);

      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
      g.addColorStop(0,   orb.color + '0.07)');
      g.addColorStop(0.5, orb.color + '0.03)');
      g.addColorStop(1,   orb.color + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    // Stars
    stars.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = 1; if (s.x > 1) s.x = 0;
      if (s.y < 0) s.y = 1; if (s.y > 1) s.y = 0;

      const twinkle = (Math.sin(t * s.twinkleSpeed + s.twinkleOffset) + 1) / 2;
      const a = s.alpha * (0.5 + twinkle * 0.5);

      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210, 230, 225, ${a})`;
      ctx.fill();
    });

    // Horizon glow
    const horizon = ctx.createLinearGradient(0, H * 0.7, 0, H);
    horizon.addColorStop(0, 'transparent');
    horizon.addColorStop(1, 'rgba(42,125,110,0.06)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(frame);
  }

  frame();
}