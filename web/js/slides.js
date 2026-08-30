/* =====================================================================
   FEATURED CONTENT SLIDES
   ---------------------------------------------------------------------
   The rotating promotional panel: updates, vehicles, jobs, businesses,
   events, announcements, community news, rules.

   One card, swapped in place. The card animates out, its content is
   replaced, then it animates back in with a small stagger — the same
   read as a Rockstar newswire panel.
   ===================================================================== */

const Slides = (() => {

  let list    = [];
  let order   = [];
  let cursor  = -1;
  let timer   = null;
  let swapping = false;
  let paused   = false;

  const el = {};

  /* ------------------------------------------------------------------ */

  function collect() {
    el.section = U.$('#feature');
    el.card    = U.$('#feature-card');
    el.art     = U.$('#feature-art');
    el.artImg  = U.$('#feature-art-img');
    el.mono    = U.$('#feature-art-mono');
    el.kicker  = U.$('#feature-kicker');
    el.title   = U.$('#feature-title');
    el.desc    = U.$('#feature-desc');
    el.cta     = U.$('#feature-cta');
    el.ctaLbl  = U.$('#feature-cta-label');
    el.dots    = U.$('#feature-dots');
    el.timer   = U.$('#feature-timer-fill');
    el.badge   = U.$('#feature-new');
  }

  /* ------------------------------------------------------------------
     "NEW SINCE YOU LAST PLAYED"
     ------------------------------------------------------------------
     Per-client, no server involved: remember which slide ids this
     browser profile has already been shown. A slide is only new the
     first time, and only for a while after the player's first ever
     visit, so a returning player is not shown a wall of badges.
     ------------------------------------------------------------------ */
  let seen = {};
  let firstEver = false;

  function loadSeen() {
    if (!CONFIG.slideSettings || CONFIG.slideSettings.markNew === false) return;

    seen = U.store.get('seenSlides', null) || {};
    if (!U.store.get('firstVisit', null)) {
      U.store.set('firstVisit', Date.now());
      firstEver = true;   // everything is "new" to someone who has never connected
    }
  }

  function isNew(slide) {
    if (!slide.id) return false;
    if (!CONFIG.slideSettings || CONFIG.slideSettings.markNew === false) return false;
    if (firstEver) return false;          // do not badge all eight on a first visit
    return !seen[slide.id];
  }

  function markSeen(slide) {
    if (!slide.id) return;
    if (seen[slide.id]) return;
    seen[slide.id] = Date.now();
    U.store.set('seenSlides', seen);
  }

  function normalise(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.filter(s => s && (s.title || s.description));
  }

  function reorder() {
    const idx = list.map((_, i) => i);
    order = (CONFIG.slideSettings && CONFIG.slideSettings.shuffle) ? U.shuffle(idx) : idx;
  }

  /* ------------------------------------------------------------------
     DOTS
     ------------------------------------------------------------------ */
  function buildDots() {
    const cfg = CONFIG.slideSettings || {};
    if (!el.dots) return;

    if (cfg.showDots === false || list.length < 2) {
      el.dots.hidden = true;
      return;
    }

    el.dots.innerHTML = '';
    list.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.setAttribute('aria-label', 'Slide ' + (i + 1));
      b.addEventListener('click', () => jumpTo(i));
      el.dots.appendChild(b);
    });
  }

  function syncDots(index) {
    if (!el.dots || el.dots.hidden) return;
    Array.from(el.dots.children).forEach((d, i) => {
      d.classList.toggle('is-on', i === index);
    });
  }

  /* ------------------------------------------------------------------
     TIMER BAR
     ------------------------------------------------------------------ */
  function runTimer(ms) {
    const cfg = CONFIG.slideSettings || {};
    if (!el.timer) return;

    if (cfg.showTimer === false || list.length < 2 || U.speed() <= 0) {
      el.timer.style.display = 'none';
      return;
    }

    el.timer.style.animation = 'none';
    void el.timer.offsetWidth;
    el.timer.style.animation = `slide-timer ${ms}ms linear forwards`;
  }

  /* ------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------ */
  function paint(slide) {
    const accent = slide.accent || null;

    if (el.badge) {
      const fresh = isNew(slide);
      el.badge.hidden = !fresh;
      // Mark it read only once it has actually been on screen.
      if (fresh) setTimeout(() => markSeen(slide), 1200);
      else markSeen(slide);
    }

    if (el.card) {
      if (accent) el.card.style.setProperty('--slide-accent', accent);
      else        el.card.style.removeProperty('--slide-accent');
    }

    el.kicker.textContent = (slide.kicker || 'FEATURED').toUpperCase();
    el.title.textContent  = slide.title || '';
    el.desc.textContent   = slide.description || '';
    el.desc.hidden        = !slide.description;

    // Artwork ------------------------------------------------------
    const gradient = slide.gradient ||
      'linear-gradient(135deg,#1b1e24 0%,#2c313a 55%,#454d5a 100%)';

    if (slide.image && !slide.imageDead) {
      el.artImg.style.backgroundImage = `url("${slide.image}"), ${gradient}`;
      el.mono.textContent = '';
      el.mono.hidden = true;
    } else {
      el.artImg.style.backgroundImage = gradient;
      // Subtle watermark initial so an art-less slide still has weight.
      const letter = (slide.kicker || slide.title || '?').trim().charAt(0).toUpperCase();
      el.mono.textContent = letter;
      el.mono.hidden = false;
    }
    el.artImg.style.backgroundPosition = slide.focus || 'center';

    // Button -------------------------------------------------------
    const btn = slide.button;
    const url = btn && U.safeUrl(btn.url);
    if (btn && url) {
      el.cta.hidden = false;
      el.cta.href = url;
      el.ctaLbl.textContent = (btn.label || 'LEARN MORE').toUpperCase();
    } else {
      el.cta.hidden = true;
      el.cta.removeAttribute('href');
    }
  }

  /* ------------------------------------------------------------------
     TRANSITION
     ------------------------------------------------------------------ */
  function show(listIndex) {
    if (!list.length) return;

    const slide = list[listIndex];
    const cfg   = CONFIG.slideSettings || {};
    const hold  = Math.max(2000, U.dur(Number(cfg.duration) || 9000));
    const mode  = cfg.transition || 'cinematic';

    const finish = () => {
      paint(slide);
      syncDots(listIndex);
      el.card.classList.remove('is-out');
      el.card.classList.add('is-in');
      // Re-trigger the stagger animation on the children.
      el.card.style.animation = 'none';
      void el.card.offsetWidth;
      el.card.style.animation = '';
      swapping = false;
      runTimer(hold);
      schedule(hold);
    };

    el.card.dataset.transition = mode;

    if (U.speed() <= 0 || el.card.classList.contains('is-first')) {
      el.card.classList.remove('is-first');
      finish();
      return;
    }

    swapping = true;
    el.card.classList.remove('is-in');
    el.card.classList.add('is-out');
    setTimeout(finish, U.dur(mode === 'fade' ? 320 : 420));
  }

  function schedule(ms) {
    clearTimeout(timer);
    if (list.length < 2) return;
    timer = setTimeout(() => { if (!paused) next(); else schedule(1000); }, ms);
  }

  /* ------------------------------------------------------------------
     NAVIGATION
     ------------------------------------------------------------------ */
  function next() {
    if (swapping || !list.length) return;
    cursor++;
    if (cursor >= order.length) {
      cursor = 0;
      if (CONFIG.slideSettings && CONFIG.slideSettings.shuffle) reorder();
    }
    show(order[cursor]);
  }

  function prev() {
    if (swapping || !list.length) return;
    cursor--;
    if (cursor < 0) cursor = order.length - 1;
    show(order[cursor]);
  }

  function jumpTo(listIndex) {
    if (swapping) return;
    const at = order.indexOf(listIndex);
    if (at === -1) return;
    cursor = at;
    show(listIndex);
  }

  /* ------------------------------------------------------------------
     ART PRELOAD — a slide whose image is missing falls back to its
     gradient instead of flashing an empty box.
     ------------------------------------------------------------------ */
  async function verifyArt() {
    for (const slide of list) {
      if (!slide.image) continue;
      const ok = await U.loadImage(slide.image);
      if (!ok) {
        slide.imageDead = true;
        console.warn('[loadscreen] slide art not found:', slide.image);
      }
    }
  }

  /* ------------------------------------------------------------------ */

  function init() {
    collect();
    if (!el.card) return;

    if (!CONFIG.ui || CONFIG.ui.showSlides === false) {
      if (el.section) el.section.hidden = true;
      return;
    }

    list = normalise(CONFIG.slides);
    if (!list.length) {
      if (el.section) el.section.hidden = true;
      return;
    }

    loadSeen();
    reorder();
    buildDots();
    verifyArt();

    // Pause the rotation while the player is reading / hovering a button.
    el.card.addEventListener('mouseenter', () => { paused = true;  el.card.classList.add('is-held'); });
    el.card.addEventListener('mouseleave', () => { paused = false; el.card.classList.remove('is-held'); });

    el.card.classList.add('is-first');
    next();
  }

  function stop() { clearTimeout(timer); }

  return { init, stop, next, prev };
})();

window.Slides = Slides;
