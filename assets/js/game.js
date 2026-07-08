/* =========================================================
   Tailscale 安裝闖關  |  game.js
   關卡狀態機・進度儲存・展開動畫・彩帶特效
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'tailscale-quest-progress-v1';
  var TOTAL = 6;

  var levels = Array.prototype.slice.call(document.querySelectorAll('.level'));
  var progressFill = document.getElementById('progressFill');
  var progressText = document.getElementById('progressText');
  var resetBtn = document.getElementById('resetBtn');
  var replayBtn = document.getElementById('replayBtn');
  var finale = document.getElementById('finale');
  var canvas = document.getElementById('confetti');

  // ---------- 進度存取 ----------
  function load() {
    try {
      var v = parseInt(localStorage.getItem(KEY), 10);
      if (isNaN(v)) return 0;
      return Math.min(Math.max(v, 0), TOTAL);
    } catch (e) { return 0; }
  }
  function save(v) { try { localStorage.setItem(KEY, String(v)); } catch (e) {} }

  var progress = load();   // 已完成關數
  var openN = 0;           // 目前展開的關卡（0 = 無）

  function levelEl(n) { return levels[n - 1]; }
  function bodyOf(el) { return el.querySelector('.level-body'); }
  function setMaxHeight(el) { bodyOf(el).style.maxHeight = bodyOf(el).scrollHeight + 'px'; }
  function clearMaxHeight(el) { bodyOf(el).style.maxHeight = '0px'; }

  // ---------- 開合關卡 ----------
  function openLevel(n, scroll) {
    if (openN && openN !== n) {
      var prev = levelEl(openN);
      prev.classList.remove('is-open');
      prev.querySelector('.level-head').setAttribute('aria-expanded', 'false');
      clearMaxHeight(prev);
    }
    var el = levelEl(n);
    el.classList.add('is-open');
    el.querySelector('.level-head').setAttribute('aria-expanded', 'true');
    setMaxHeight(el);
    openN = n;
    if (scroll) {
      requestAnimationFrame(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    }
  }
  function closeLevel(n) {
    var el = levelEl(n);
    el.classList.remove('is-open');
    el.querySelector('.level-head').setAttribute('aria-expanded', 'false');
    clearMaxHeight(el);
    if (openN === n) openN = 0;
  }
  function resizeOpen() { if (openN) setMaxHeight(levelEl(openN)); }

  // ---------- 套用狀態 ----------
  function render() {
    levels.forEach(function (el, i) {
      var n = i + 1, state;
      if (n <= progress) state = 'done';
      else if (n === progress + 1) state = 'active';
      else state = 'locked';
      el.setAttribute('data-state', state);
    });
    progressFill.style.width = Math.round(progress / TOTAL * 100) + '%';
    progressText.textContent = progress + ' / ' + TOTAL + ' 關完成';
    finale.hidden = progress < TOTAL;
  }

  // ---------- 完成一關 ----------
  function complete(n) {
    if (n !== progress + 1) return;   // 只有當前關可完成
    progress = n;
    save(progress);
    render();
    if (progress < TOTAL) {
      openLevel(progress + 1, true);
    } else {
      closeLevel(n);
      requestAnimationFrame(function () { finale.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      burst();
    }
  }

  // ---------- 綁定事件 ----------
  levels.forEach(function (el) {
    var n = parseInt(el.getAttribute('data-level'), 10);
    el.querySelector('.level-head').addEventListener('click', function () {
      if (el.getAttribute('data-state') === 'locked') {
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        return;
      }
      if (el.classList.contains('is-open')) closeLevel(n); else openLevel(n, true);
    });
    var cb = el.querySelector('.complete-btn');
    if (cb) cb.addEventListener('click', function () { complete(n); });
    // 圖片載入後重算高度，避免截圖未載入時內容被裁切
    Array.prototype.forEach.call(el.querySelectorAll('img'), function (img) {
      img.addEventListener('load', function () { if (openN === n) setMaxHeight(el); });
    });
  });

  resetBtn.addEventListener('click', function () {
    progress = 0; save(0);
    if (openN) closeLevel(openN);
    render();
    openLevel(1, true);
  });
  if (replayBtn) replayBtn.addEventListener('click', function () {
    if (openN) closeLevel(openN);
    openLevel(1, true);
  });

  window.addEventListener('resize', resizeOpen);
  window.addEventListener('load', resizeOpen);

  // ---------- 初始化 ----------
  levels.forEach(function (el) {
    el.classList.remove('is-open');
    el.querySelector('.level-head').setAttribute('aria-expanded', 'false');
    clearMaxHeight(el);
  });
  render();
  if (progress < TOTAL) openLevel(progress + 1, false);
  setTimeout(resizeOpen, 300);

  /* ---------- 彩帶特效 ---------- */
  var ctx, W, H, parts = [], running = false;
  function fit() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  function burst() {
    if (!canvas) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    ctx = canvas.getContext('2d'); fit();
    var colors = ['#34d399', '#22d3ee', '#fbbf24', '#ffffff', '#a7f3d0'];
    parts = [];
    for (var i = 0; i < 170; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * 140,
        y: H * 0.32,
        vx: (Math.random() - 0.5) * 11,
        vy: Math.random() * -13 - 4,
        g: 0.30 + Math.random() * 0.14,
        s: 5 + Math.random() * 7,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        c: colors[(Math.random() * colors.length) | 0],
        life: 0, ttl: 90 + Math.random() * 45
      });
    }
    if (!running) { running = true; loop(); }
  }
  function loop() {
    ctx.clearRect(0, 0, W, H);
    var alive = false;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; p.life++;
      if (p.life > p.ttl) continue;
      alive = true;
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (alive) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }
  window.addEventListener('resize', function () { if (running) fit(); });
})();
