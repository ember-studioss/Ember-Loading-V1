/* =====================================================================
   TIPS
   ---------------------------------------------------------------------
   The single-line hint that cycles along the bottom bar: keybinds,
   economy advice, job pointers, rules reminders, beginner guidance.
   ===================================================================== */

const Tips = (() => {

  let list   = [];
  let order  = [];
  let cursor = -1;
  let timer  = null;

  const el = {};

  function normalise(raw) {
    if (!Array.isArray(raw)) return [];
    const def = (CONFIG.tipSettings && CONFIG.tipSettings.defaultBadge) || 'TIP';

    return raw.map(item => {
      if (typeof item === 'string') return { badge: def, text: item };
      if (item && typeof item === 'object' && item.text) {
        return { badge: item.badge || def, text: item.text };
      }
      return null;
    }).filter(Boolean);
  }

  function reorder() {
    const idx = list.map((_, i) => i);
    order = (CONFIG.tipSettings && CONFIG.tipSettings.shuffle !== false) ? U.shuffle(idx) : idx;
  }

  function show(tip) {
    el.root.classList.remove('is-in');
    el.root.classList.add('is-out');

    setTimeout(() => {
      el.badge.textContent = String(tip.badge).toUpperCase();
      el.text.textContent  = tip.text;
      el.root.classList.remove('is-out');
      el.root.classList.add('is-in');
    }, U.dur(260));
  }

  function next() {
    if (!list.length) return;

    cursor++;
    if (cursor >= order.length) {
      cursor = 0;
      reorder();
    }
    show(list[order[cursor]]);

    const hold = Math.max(2500, U.dur(Number((CONFIG.tipSettings || {}).duration) || 6500));
    clearTimeout(timer);
    timer = setTimeout(next, hold);
  }

  function init() {
    el.root  = U.$('#tip');
    el.badge = U.$('#tip-badge');
    el.text  = U.$('#tip-text');
    if (!el.root) return;

    if (!CONFIG.ui || CONFIG.ui.showTips === false) {
      el.root.hidden = true;
      return;
    }

    list = normalise(CONFIG.tips);
    if (!list.length) { el.root.hidden = true; return; }

    reorder();
    next();
  }

  function stop() { clearTimeout(timer); }

  return { init, stop, next };
})();

window.Tips = Tips;
