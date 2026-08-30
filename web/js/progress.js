/* =====================================================================
   LOADING PROGRESS
   ---------------------------------------------------------------------
   The engine's own progress is honest but jumpy — it sits at 4% for
   twenty seconds and then leaps to 80%. We ease toward it instead of
   snapping, and (in 'hybrid' mode) let a slow simulated creep fill the
   dead air so the bar never looks frozen.

   The bar is always monotonic: it can slow down, it never goes back.
   ===================================================================== */

const Progress = (() => {

  const el = {};

  let displayed = 0;     // 0..100, what the player sees
  let real      = 0;     // 0..100, reported by the engine
  let floor     = 0;     // 0..100, raised by client-side milestones
  let simStart  = 0;
  let done      = false;
  let finished  = false;
  let stages    = [];
  let lastStage = null;
  let listeners = [];
  // Far in the past, not 0: the first detail line often arrives less
  // than one throttle window after navigation start, and comparing
  // against 0 would silently swallow it.
  let detailAt  = -1e9;
  let holdUntil = 0;
  let queued    = false;

  /* ------------------------------------------------------------------ */

  function collect() {
    el.fill    = U.$('#bar-fill');
    el.bar     = U.$('#bar');
    el.percent = U.$('#percent');
    el.status  = U.$('#status');
    el.detail  = U.$('#detail');
    el.eta     = U.$('#eta');
    el.etaText = U.$('#eta-text');
  }

  /* ------------------------------------------------------------------
     TIME REMAINING
     ------------------------------------------------------------------
     Estimated from a smoothed percent-per-second rate. Deliberately
     cautious: nothing is shown until the rate has settled, the figure
     only ever falls, and it is rounded hard so it does not tick like a
     stopwatch. A confidently wrong ETA is worse than no ETA.
     ------------------------------------------------------------------ */
  let rate     = 0;      // percent per ms, smoothed
  let lastPct  = 0;
  let lastAt   = 0;
  let shownEta = Infinity;

  function humanise(seconds) {
    if (seconds >= 110) return 'about ' + Math.round(seconds / 60) + ' minutes left';
    if (seconds >= 75)  return 'about a minute and a half left';
    if (seconds >= 50)  return 'about a minute left';
    if (seconds >= 35)  return 'about 45 seconds left';
    if (seconds >= 25)  return 'about 30 seconds left';
    if (seconds >= 15)  return 'about 20 seconds left';
    return 'almost there';
  }

  function updateEta(pct, now) {
    const cfg = CONFIG.progress || {};
    if (cfg.showEta === false || !el.eta) return;

    if (!lastAt) { lastAt = now; lastPct = pct; return; }

    const dt = now - lastAt;
    if (dt < 250) return;              // sample slowly, the bar is eased anyway

    const delta = pct - lastPct;
    lastAt = now;
    lastPct = pct;

    if (delta > 0) {
      const sample = delta / dt;
      rate = rate ? U.lerp(rate, sample, 0.15) : sample;
    }

    const minPct = Number(cfg.etaMinPercent);
    if (pct < (Number.isFinite(minPct) ? minPct : 12) || rate <= 0 || done) {
      el.eta.hidden = true;
      return;
    }

    const seconds = ((100 - pct) / rate) / 1000;
    if (!Number.isFinite(seconds) || seconds > 900) { el.eta.hidden = true; return; }

    // Monotonic: an estimate that climbs reads as the screen giving up.
    shownEta = Math.min(shownEta, seconds);

    const hideBelow = Number(cfg.etaHideBelow);

    // Two ways to be unhelpful: counting down the last few seconds, or
    // claiming "almost there" while the bar is still near the start on
    // a very fast load. Say nothing in both cases.
    if (shownEta < (Number.isFinite(hideBelow) ? hideBelow : 8) ||
        (shownEta < 20 && pct < 60)) {
      el.eta.hidden = true;
      return;
    }

    const text = humanise(shownEta);
    if (el.etaText.textContent !== text) el.etaText.textContent = text;
    el.eta.hidden = false;
  }

  function mode() {
    const m = (CONFIG.progress && CONFIG.progress.mode) || 'hybrid';
    return (m === 'real' || m === 'simulated') ? m : 'hybrid';
  }

  /* ------------------------------------------------------------------
     Simulated curve: fast at first, asymptotic afterwards. Never
     reaches the cap on its own — only real progress or completion can
     push the last stretch.
     ------------------------------------------------------------------ */
  function simulated(now) {
    const total = Math.max(4000, Number((CONFIG.progress || {}).simulatedDuration) || 45000);
    const t = U.clamp((now - simStart) / total, 0, 1);
    const cap = mode() === 'simulated' ? 100 : 94;
    return cap * (1 - Math.pow(1 - t, 2.4));
  }

  function targetFor(now) {
    const m = mode();
    if (done) return 100;
    if (m === 'real')      return Math.max(real, floor);
    if (m === 'simulated') return Math.max(simulated(now), floor);
    return Math.max(real, simulated(now), floor);
  }

  /* ------------------------------------------------------------------
     STATUS TEXT
     ------------------------------------------------------------------ */
  function stageFor(pct) {
    let chosen = stages[0] || null;
    for (const s of stages) {
      if (pct >= s.at) chosen = s;
    }
    return chosen;
  }

  function paintStatus(pct) {
    // A status pushed from the client script outranks the percentage
    // driven stage text for a few seconds, otherwise the very next
    // frame would overwrite it.
    if (U.now() < holdUntil) return;

    const s = stageFor(pct);
    if (!s || s === lastStage || !el.status) return;
    lastStage = s;

    // Text first, then restart a rise-in animation. Deliberately timer
    // free: a dropped timeout could otherwise leave the label stuck at
    // opacity 0, and a blank status line looks like a crash.
    el.status.textContent = s.text;
    if (U.speed() <= 0) return;
    el.status.style.animation = 'none';
    void el.status.offsetWidth;
    el.status.style.animation = `status-in ${U.dur(420)}ms cubic-bezier(.2,.7,.3,1)`;
  }

  /* ------------------------------------------------------------------
     FRAME
     ------------------------------------------------------------------ */
  function tick(dt, now) {
    if (finished) return;

    // While queued the bar means nothing — freeze it and let the queue
    // card do the talking rather than crawling a fake percentage.
    if (queued) {
      if (el.eta) el.eta.hidden = true;
      return;
    }

    const target = targetFor(now);
    const base   = U.clamp(Number((CONFIG.progress || {}).smoothing) || 0.08, 0.005, 1);

    // Once the game is genuinely ready the bar commits to the finish
    // instead of crawling asymptotically toward it.
    const smooth = done ? Math.max(base, 0.18) : base;
    const floorStep = (done ? 0.12 : 0.004) * (dt / 16.67);

    // Frame-rate independent easing.
    const k = 1 - Math.pow(1 - smooth, dt / 16.67);
    let next = U.lerp(displayed, target, k);

    // Guarantee forward motion so the bar is never visually stuck.
    if (target > displayed && next - displayed < floorStep) next = displayed + floorStep;

    if ((CONFIG.progress || {}).monotonic !== false) next = Math.max(displayed, next);
    displayed = U.clamp(next, 0, 100);

    const pct = displayed >= 99.6 && done ? 100 : Math.min(99, Math.floor(displayed));

    if (el.fill)    el.fill.style.width = displayed.toFixed(2) + '%';
    if (el.percent) el.percent.textContent = String(pct);
    paintStatus(displayed);
    if (!queued) updateEta(displayed, now);

    if (done && displayed >= 99.9) {
      finished = true;
      displayed = 100;
      if (el.fill) el.fill.style.width = '100%';
      if (el.percent) el.percent.textContent = '100';
      if (el.bar) el.bar.classList.add('is-complete');
      listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
      listeners = [];
    }
  }

  /* ------------------------------------------------------------------
     PUBLIC
     ------------------------------------------------------------------ */

  /** Engine progress, 0..1. */
  function setReal(fraction) {
    const pct = U.clamp(Number(fraction) * 100, 0, 100);
    if (pct > real) real = pct;
    if (real >= 99.9) complete();
  }

  /** Raise the minimum, e.g. once the session has actually started. */
  function milestone(pct) {
    floor = Math.max(floor, U.clamp(Number(pct) || 0, 0, 100));
  }

  /** The small grey line under the bar: file names, init functions. */
  function setDetail(text) {
    if (!el.detail) return;
    if ((CONFIG.progress || {}).showDetail === false) return;
    if (!text) return;

    // Throttle — the engine can emit hundreds of these per second.
    const now = U.now();
    if (now - detailAt < 90) return;
    detailAt = now;

    const clean = String(text).replace(/\s+/g, ' ').trim();
    el.detail.textContent = clean.length > 96 ? clean.slice(0, 95) + '…' : clean;
  }

  /** Overrides the stage text for a few seconds. */
  function setStatus(text) {
    if (!el.status || !text) return;
    lastStage = { at: -1, text: String(text).toUpperCase() };
    el.status.textContent = lastStage.text;
    holdUntil = U.now() + 4000;

    if (U.speed() <= 0) return;
    el.status.style.animation = 'none';
    void el.status.offsetWidth;
    el.status.style.animation = `status-in ${U.dur(420)}ms cubic-bezier(.2,.7,.3,1)`;
  }

  function complete() {
    done = true;
    queued = false;
    holdUntil = 0;   // the final stage text always wins
  }

  /** Freeze the bar and hand the screen over to the queue card. */
  function setQueued(on) {
    if (queued === on) return;
    queued = !!on;

    const stage = document.getElementById('stage');
    if (stage) stage.classList.toggle('is-queued', queued);

    if (queued) {
      setStatus('WAITING IN QUEUE');
      holdUntil = Infinity;          // nothing overwrites it while queued
      if (el.eta) el.eta.hidden = true;
    } else {
      holdUntil = 0;
      lastStage = null;              // force the stage text to repaint
      // The wait skewed every rate sample; start the estimate over.
      rate = 0; lastAt = 0; shownEta = Infinity;
    }
  }

  function onComplete(fn) {
    if (finished) fn();
    else listeners.push(fn);
  }

  function init() {
    collect();

    const cfg = CONFIG.progress || {};
    stages = Array.isArray(cfg.stages) && cfg.stages.length
      ? cfg.stages.slice().sort((a, b) => a.at - b.at).map(s => ({ at: Number(s.at) || 0, text: String(s.text).toUpperCase() }))
      : [{ at: 0, text: 'LOADING' }];

    if (cfg.showPercent === false) {
      const p = U.$('.percent');
      if (p) p.hidden = true;
    }
    if (!CONFIG.ui || CONFIG.ui.showProgressBar === false) {
      if (el.bar) el.bar.hidden = true;
    }

    simStart = U.now();
    paintStatus(0);
    U.ticker.add(tick);
  }

  return { init, setReal, setDetail, setStatus, milestone, complete, onComplete,
           setQueued, value: () => displayed };
})();

window.Progress = Progress;
