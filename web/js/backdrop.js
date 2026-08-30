/* =====================================================================
   BACKDROP
   ---------------------------------------------------------------------
   Full-screen cinematic background: crossfading stills with a slow
   ken-burns move, an optional looping video, and a subtle parallax
   that responds to the mouse while always drifting on its own.

   Every layer degrades: no images -> gradients, no video -> images,
   broken file -> silently dropped from the rotation.
   ===================================================================== */

const Backdrop = (() => {

  let entries   = [];
  let order     = [];
  let cursor    = 0;
  let layers    = [];
  let active    = 0;
  let timer     = null;
  let started   = false;

  // parallax
  let px = 0, py = 0, tx = 0, ty = 0, drift = 0;
  let hasPointer = false;

  /* ------------------------------------------------------------------ */

  const PLANES = ['far', 'mid', 'near'];

  function normalise(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map(raw => {
        if (typeof raw === 'string') return { image: raw };
        if (raw && typeof raw === 'object') return raw;
        return null;
      })
      .filter(e => e && (e.image || e.gradient || e.scene || e.layers))
      .map(e => {
        // A `scene` folder expands to far/mid/near. Anything flat only
        // ever occupies the mid plane, so it parallaxes as one piece.
        if (e.scene) {
          const base = String(e.scene).replace(/\/+$/, '');
          e.planes = { far: base + '/far.svg', mid: base + '/mid.svg', near: base + '/near.svg' };
        } else if (Array.isArray(e.layers)) {
          e.planes = { far: e.layers[0], mid: e.layers[1], near: e.layers[2] };
        } else {
          e.planes = { mid: e.image || null };
          e.flat = e.gradient || null;
        }
        return e;
      });
  }

  /* ------------------------------------------------------------------
     TIME OF DAY
     ------------------------------------------------------------------ */
  let serverHour = null;

  function currentPeriod() {
    const cfg = CONFIG.backgrounds || {};
    const src = cfg.timeSource || 'client';
    if (src === 'off') return null;

    let hour;
    if (src === 'server') {
      if (serverHour === null) return null;   // not told yet — no filtering
      hour = serverHour;
    } else {
      hour = new Date().getHours();
    }

    const periods = cfg.periods || {};
    for (const name of Object.keys(periods)) {
      const span = periods[name];
      if (!Array.isArray(span) || span.length < 2) continue;
      const [a, b] = span;
      const hit = a <= b ? (hour >= a && hour < b) : (hour >= a || hour < b);
      if (hit) return name;
    }
    return null;
  }

  /** Scenes matching the current period, plus every untagged scene. */
  function eligible() {
    const period = currentPeriod();
    if (!period) return entries;

    const matched = entries.filter(e => !e.timeOfDay || e.timeOfDay === period);
    // Never let the filter empty the rotation.
    return matched.length ? matched : entries;
  }

  /* ------------------------------------------------------------------
     Ken burns: a fresh animation per swap so every appearance is a new
     move. We randomise direction/offset a little so a short rotation
     list never looks like a loop.
     ------------------------------------------------------------------ */
  function depthOf(plane) {
    const d = (CONFIG.backgrounds && CONFIG.backgrounds.depth) || {};
    const fallback = { far: 0.22, mid: 0.6, near: 1.15 };
    const v = Number(d[plane]);
    return Number.isFinite(v) ? v : fallback[plane];
  }

  /** `shared` keeps every plane of one shot moving as a single camera. */
  function applyKenBurns(el, entry, lifetime, plane, shared) {
    const kb = (CONFIG.backgrounds && CONFIG.backgrounds.kenBurns) || {};
    if (kb.enabled === false || U.speed() <= 0) {
      el.style.animation = '';
      el.style.transform = 'scale(1.02)';
      return;
    }

    const base  = Number(kb.scale) || 1.14;
    const drift = Number(kb.drift) || 2.6;

    // Nearer planes zoom and pan further than distant ones — that
    // difference over the shot's life is what sells the depth.
    const weight = depthOf(plane) / depthOf('mid');
    const scale  = 1 + (base - 1) * weight;

    el.style.setProperty('--kb-scale', scale.toFixed(4));
    el.style.setProperty('--kb-x', (shared.ax * drift * weight).toFixed(2) + '%');
    el.style.setProperty('--kb-y', (shared.ay * drift * 0.6 * weight).toFixed(2) + '%');

    // restart the animation
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = `kb-${shared.dir} ${Math.round(lifetime)}ms linear forwards`;
  }

  /* ------------------------------------------------------------------ */

  function present(entry) {
    const cfg      = CONFIG.backgrounds || {};
    const fade     = U.dur(Number(cfg.fade) || 2200);
    const duration = U.dur(Number(cfg.duration) || 11000);
    const next     = layers[(active + 1) % layers.length];
    const prev     = layers[active];

    // One camera move, shared by every plane of this shot.
    const shared = {
      dir: entry.zoom === 'out' ? 'out' : (entry.zoom === 'in' ? 'in' : (Math.random() < 0.5 ? 'in' : 'out')),
      ax: Math.random() * 2 - 1,
      ay: Math.random() * 2 - 1,
    };

    PLANES.forEach(plane => {
      const holder = next.querySelector('.bd-plane[data-depth="' + plane + '"]');
      if (!holder) return;
      const img = holder.querySelector('.bd-img');
      const src = entry.planes && entry.planes[plane];

      if (src) {
        img.style.backgroundImage = `url("${src}")`;
      } else if (plane === 'mid' && entry.flat) {
        img.style.backgroundImage = entry.flat;
      } else {
        img.style.backgroundImage = '';
        holder.hidden = true;
        return;
      }

      holder.hidden = false;
      img.style.backgroundPosition = entry.focus || 'center';
      applyKenBurns(img, entry, duration + fade * 2, plane, shared);
    });

    next.style.transitionDuration = fade + 'ms';
    prev.style.transitionDuration = fade + 'ms';

    // Force the browser to acknowledge the new image before fading.
    void next.offsetWidth;

    next.classList.add('is-live');
    prev.classList.remove('is-live');

    active = (active + 1) % layers.length;
  }

  function advance() {
    if (!order.length) reorder();
    if (!order.length) return;

    const entry = order[cursor % order.length];
    cursor++;

    if (cursor >= order.length) {
      cursor = 0;
      // Re-evaluate on every lap: a long session can cross into the
      // next period, and the rotation should follow it.
      reorder();
    }

    present(entry);

    if (order.length > 1) {
      const duration = U.dur(Number((CONFIG.backgrounds || {}).duration) || 11000);
      clearTimeout(timer);
      timer = setTimeout(advance, Math.max(1200, duration));
    }
  }

  function reorder() {
    const pool = eligible().filter(e => !e.dead);
    order = (CONFIG.backgrounds && CONFIG.backgrounds.shuffle) ? U.shuffle(pool) : pool.slice();
  }

  /* ------------------------------------------------------------------
     Verify images in the background. A dead file is removed from the
     rotation instead of showing a blank frame.
     ------------------------------------------------------------------ */
  async function verify() {
    for (const entry of entries) {
      if (!entry.planes) continue;

      for (const plane of PLANES) {
        const src = entry.planes[plane];
        if (!src) continue;

        const ok = await U.loadImage(src);
        if (ok) continue;

        console.warn('[loadscreen] background layer not found: ' + src);
        entry.planes[plane] = null;

        // Losing far or near just flattens the shot; losing mid leaves
        // nothing worth showing, so drop the whole scene.
        if (plane === 'mid') entry.dead = true;
      }
    }

    if (entries.some(e => !e.dead)) reorder();
  }

  /* ------------------------------------------------------------------
     VIDEO
     ------------------------------------------------------------------ */
  function startVideo() {
    const cfg = CONFIG.video || {};
    const el  = U.$('#bd-video');
    if (!cfg.enabled || !cfg.src || !el) return false;

    let failed = false;
    const fail = (why) => {
      if (failed) return;
      failed = true;
      console.warn('[loadscreen] background video unavailable:', why);
      el.hidden = true;
      el.removeAttribute('src');
      if (cfg.fallbackToImages !== false) startImages();
    };

    el.hidden = false;
    el.loop = true;
    el.muted = true;
    el.playsInline = true;
    if (cfg.poster) el.poster = cfg.poster;
    el.playbackRate = Number(cfg.rate) || 1;

    el.addEventListener('error', () => fail('error'), { once: true });
    el.addEventListener('canplay', () => { el.classList.add('is-live'); }, { once: true });

    el.src = cfg.src;

    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => fail('play rejected'));

    // If nothing has decoded after 6s, assume it is not coming.
    setTimeout(() => { if (el.readyState < 2) fail('timeout'); }, 6000);

    // Keep the stills running underneath as a safety net.
    if (cfg.fallbackToImages !== false) startImages();
    return true;
  }

  /* ------------------------------------------------------------------
     PARALLAX
     ------------------------------------------------------------------ */
  function startParallax() {
    const cfg = (CONFIG.backgrounds || {}).parallax || {};
    if (cfg.enabled === false || U.speed() <= 0) return;

    const strength = Number(cfg.strength) || 14;
    const ease     = U.clamp(Number(cfg.ease) || 0.06, 0.01, 0.5);
    const hud      = U.$('#hud');

    // Every plane of both layers, paired with its depth multiplier.
    const planes = U.$$('.bd-plane').map(node => ({
      node,
      depth: depthOf(node.getAttribute('data-depth')),
    }));
    if (!planes.length) return;

    window.addEventListener('mousemove', (e) => {
      hasPointer = true;
      tx = ((e.clientX / window.innerWidth)  - 0.5) * 2;
      ty = ((e.clientY / window.innerHeight) - 0.5) * 2;
    }, { passive: true });

    U.ticker.add((dt) => {
      // Autonomous drift so the shot never sits perfectly still, even
      // when the player never touches the mouse.
      drift += dt * 0.00012;
      const ax = hasPointer ? tx : Math.sin(drift) * 0.55;
      const ay = hasPointer ? ty : Math.cos(drift * 0.73) * 0.35;

      px = U.lerp(px, ax, ease);
      py = U.lerp(py, ay, ease);

      for (let i = 0; i < planes.length; i++) {
        const p = planes[i];
        p.node.style.transform =
          `translate3d(${(-px * strength * p.depth).toFixed(2)}px, ${(-py * strength * p.depth).toFixed(2)}px, 0)`;
      }

      if (hud) hud.style.transform = `translate3d(${(px * strength * 0.18).toFixed(2)}px, ${(py * strength * 0.18).toFixed(2)}px, 0)`;
    });
  }

  /* ------------------------------------------------------------------ */

  function startImages() {
    if (started) return;
    started = true;
    advance();
    verify();
  }

  function init() {
    layers = [U.$('#bd-a'), U.$('#bd-b')].filter(Boolean);
    entries = normalise((CONFIG.backgrounds || {}).images);

    // Always keep one gradient in reserve so the screen is never black.
    if (!entries.length) {
      entries = normalise([
        { gradient: 'radial-gradient(120% 90% at 70% 20%, #2a2f38 0%, #14171c 50%, #06070a 100%)' },
      ]);
    }

    reorder();

    const usedVideo = startVideo();
    if (!usedVideo) startImages();

    startParallax();

    // Grain animation. Cheap: one background-position step per frame
    // budget, driven by the shared ticker rather than a CSS animation
    // so `animationSpeed: 0` genuinely stops it.
    const grainEl = U.$('#bd-grain');
    const fx = CONFIG.effects || {};
    if (grainEl && (fx.grain || 0) > 0 && U.speed() > 0) {
      const fps = U.clamp(Number(fx.grainSpeed) || 8, 1, 30);
      let acc = 0;
      U.ticker.add((dt) => {
        acc += dt;
        if (acc < 1000 / fps) return;
        acc = 0;
        grainEl.style.backgroundPosition =
          `${(Math.random() * 100) | 0}% ${(Math.random() * 100) | 0}%`;
      });
    } else if (grainEl) {
      grainEl.style.display = 'none';
    }
  }

  function stop() {
    clearTimeout(timer);
    const v = U.$('#bd-video');
    if (v && !v.hidden) { try { v.pause(); } catch (e) {} }
  }

  /** Server-side hour, for `timeSource: 'server'`. */
  function setServerHour(hour) {
    const h = Number(hour);
    if (!Number.isFinite(h)) return;
    const was = serverHour;
    serverHour = ((h % 24) + 24) % 24;
    // First time we learn the hour, re-pick so the very next shot obeys it.
    if (was === null) reorder();
  }

  return { init, stop, next: advance, setServerHour };
})();

window.Backdrop = Backdrop;
