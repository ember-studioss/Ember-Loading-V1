/* =====================================================================
   UTILITIES + THEME BOOTSTRAP
   ===================================================================== */

const U = (() => {

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp  = (a, b, t) => a + (b - a) * t;

  /** Fisher-Yates, returns a new array. */
  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Escapes text destined for innerHTML. Config is author-controlled but
   *  server-pushed strings (player names) are not. */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Only http(s) links may reach an <a href>. */
  function safeUrl(url) {
    if (typeof url !== 'string') return null;
    const t = url.trim();
    return /^https?:\/\//i.test(t) ? t : null;
  }

  /** Resolve a config value with a fallback chain. */
  function pick(...vals) {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }

  /** Preload an image. Resolves true/false — never rejects. */
  function loadImage(src) {
    return new Promise(resolve => {
      if (!src) return resolve(false);
      const img = new Image();
      img.onload  = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  const now = () => (window.performance ? performance.now() : Date.now());

  /** Animation speed multiplier from config, guarded. */
  function speed() {
    const s = Number(CONFIG.effects && CONFIG.effects.animationSpeed);
    return Number.isFinite(s) ? clamp(s, 0, 4) : 1;
  }

  /** Scale a duration by the global animation speed. speed 0 => instant. */
  function dur(ms) {
    const s = speed();
    if (s <= 0) return 0;
    return Math.round(ms / s);
  }

  /* -------------------------------------------------------------------
     A tiny rAF-driven ticker. One loop for the whole screen keeps the
     cost predictable while the game is fighting for the same CPU.
     ------------------------------------------------------------------- */
  const ticker = (() => {
    const subs = new Set();
    let running = false;
    let last = now();
    let watchdog = null;

    function runFrame() {
      const t  = now();
      const dt = Math.min(64, t - last);   // clamp big stalls
      last = t;
      subs.forEach(fn => {
        try { fn(dt, t); } catch (e) { console.error('[loadscreen] tick', e); }
      });
    }

    function frame() {
      if (!running) return;
      runFrame();
      requestAnimationFrame(frame);
    }

    /* If the compositor stalls rAF — which CEF does occasionally while
       the game is thrashing the disk — a timer keeps the progress bar
       and fades moving. It costs nothing while rAF is healthy. */
    function startWatchdog() {
      if (watchdog) return;
      watchdog = setInterval(() => {
        if (!running) return;
        if (now() - last > 500) runFrame();
      }, 250);
    }

    return {
      add(fn) {
        subs.add(fn);
        if (!running) {
          running = true;
          last = now();
          requestAnimationFrame(frame);
          startWatchdog();
        }
        return () => subs.delete(fn);
      },
      remove(fn) { subs.delete(fn); },
      stop() {
        running = false;
        subs.clear();
        clearInterval(watchdog);
        watchdog = null;
      },
    };
  })();

  /* -------------------------------------------------------------------
     Local storage that cannot throw (CEF sometimes blocks it).
     ------------------------------------------------------------------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('ember-ls:' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('ember-ls:' + key, JSON.stringify(value)); }
      catch (e) { /* ignore */ }
    },
  };

  /* -------------------------------------------------------------------
     THEME — writes the config into CSS custom properties.
     ------------------------------------------------------------------- */
  function applyTheme() {
    const t  = CONFIG.theme   || {};
    const f  = CONFIG.fonts   || {};
    const fx = CONFIG.effects || {};
    const r  = document.documentElement.style;

    const set = (k, v) => { if (v !== undefined && v !== null) r.setProperty(k, String(v)); };

    set('--accent',      t.accent);
    set('--accent-deep', t.accentDeep);
    set('--accent-ink',  t.accentInk);
    set('--ink',         t.ink);
    set('--ink-soft',    t.inkSoft);
    set('--ink-faint',   t.inkFaint);
    set('--panel',       t.panel);
    set('--panel-solid', t.panelSolid);
    set('--hairline',    t.hairline);
    set('--good',        t.good);
    set('--warn',        t.warn);
    set('--bad',         t.bad);
    set('--radius',      (t.radius != null ? t.radius : 0.35) + 'rem');
    set('--glass-blur',  (t.glass === false ? 0 : (t.glassBlur || 18)) + 'px');

    set('--font-display', f.display);
    set('--font-body',    f.body);

    set('--grain',     fx.grain != null ? fx.grain : 0.045);
    set('--vignette',  fx.vignette != null ? fx.vignette : 0.68);
    set('--grade',     fx.grade === false ? 0 : (fx.gradeStrength != null ? fx.gradeStrength : 0.34));
    set('--contrast',  fx.contrast != null ? fx.contrast : 1.06);
    set('--saturate',  fx.saturation != null ? fx.saturation : 1.08);

    const spd = speed();
    set('--speed', spd <= 0 ? 0 : 1 / spd);

    if (spd <= 0) document.documentElement.classList.add('no-anim');
    if (t.glass === false) document.documentElement.classList.add('no-glass');

    // Custom @font-face declarations.
    const custom = Array.isArray(f.custom) ? f.custom : [];
    if (custom.length) {
      const css = custom.map(font => {
        if (!font || !font.family || !font.url) return '';
        return `@font-face{font-family:"${font.family}";src:url("${font.url}");` +
               `font-weight:${font.weight || 400};font-style:${font.style || 'normal'};font-display:block;}`;
      }).join('');
      const el = document.createElement('style');
      el.textContent = css;
      document.head.appendChild(el);
    }
  }

  return { $, $$, clamp, lerp, shuffle, esc, safeUrl, pick, loadImage,
           now, speed, dur, ticker, store, applyTheme };
})();

window.U = U;
