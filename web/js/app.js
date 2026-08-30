/* =====================================================================
   APP
   ---------------------------------------------------------------------
   Boots every module, renders the static chrome (brand, social links),
   wires the keyboard shortcuts and plays the closing cinematic.
   ===================================================================== */

(() => {

  /* ==================================================================
     ICONS
     ================================================================== */
  const ICONS = {
    discord:  'M19.3 5.4A17 17 0 0015 4.2l-.2.4a13 13 0 00-5.6 0L9 4.2a17 17 0 00-4.3 1.2C2 9.3 1.3 13.1 1.6 16.8a17 17 0 005.2 2.6l.9-1.5c-.6-.2-1.2-.5-1.7-.8l.4-.3a12 12 0 0011.2 0l.4.3c-.5.3-1.1.6-1.7.8l.9 1.5a17 17 0 005.2-2.6c.4-4.3-.7-8-2.9-11.4zM8.4 14.6c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.9 2.1-1.9 2.1zm7.2 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z',
    globe:    'M12 2a10 10 0 100 20 10 10 0 000-20zm0 0c2.7 2.6 4 6 4 10s-1.3 7.4-4 10c-2.7-2.6-4-6-4-10s1.3-7.4 4-10zM2.5 9h19M2.5 15h19',
    cart:     'M3 4h2l2.4 11.2A2 2 0 009.4 17h7.5a2 2 0 002-1.6L20.5 8H6M9 21a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z',
    x:        'M3 3l7.4 9.6L3.3 21h2.1l5.9-6.9L16.6 21H21l-7.8-10.1L20.6 3h-2.1l-5.5 6.4L8.1 3H3z',
    youtube:  'M22 12s0-3.2-.4-4.7a2.6 2.6 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.5a2.6 2.6 0 00-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.7a2.6 2.6 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.5a2.6 2.6 0 001.8-1.8C22 15.2 22 12 22 12zM10 15V9l5 3-5 3z',
    tiktok:   'M16.5 3c.3 2 1.5 3.4 3.5 3.6v2.6a6.6 6.6 0 01-3.6-1.1v5.8a5.7 5.7 0 11-5.7-5.7c.3 0 .6 0 .9.1v2.7a3 3 0 101.9 2.8V3h3z',
    instagram:'M7.5 3h9A4.5 4.5 0 0121 7.5v9a4.5 4.5 0 01-4.5 4.5h-9A4.5 4.5 0 013 16.5v-9A4.5 4.5 0 017.5 3zm4.5 5.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6zM17.3 6a1 1 0 100 2 1 1 0 000-2z',
    twitch:   'M4 3h16v11l-4 4h-3l-2.5 2.5H8V18H4V3zm4.5 4v5M14 7v5',
    steam:    'M12 2a10 10 0 00-9.9 8.8l5.3 2.2a2.8 2.8 0 011.6-.5h.2l2.4-3.4v-.1a3.8 3.8 0 117.5 0 3.8 3.8 0 01-4 3.7l-3.4 2.4a2.8 2.8 0 11-5.5.7L2 16.3A10 10 0 1012 2zm3.1 4.2a2.5 2.5 0 100 5.1 2.5 2.5 0 000-5.1z',
    link:     'M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1.2 1.1M14 11a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7L12.7 18',
  };

  const FILLED = new Set(['discord', 'youtube', 'tiktok', 'instagram', 'steam', 'x']);

  function iconSvg(name) {
    const path = ICONS[name] || ICONS.link;
    const filled = FILLED.has(name);
    return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${filled ? 'ico-fill' : 'ico-stroke'}"><path d="${path}"/></svg>`;
  }

  /* ==================================================================
     BRAND
     ================================================================== */
  function renderBrand() {
    const s    = CONFIG.server || {};
    const root = U.$('#brand');
    if (!root) return;

    if (!CONFIG.ui || CONFIG.ui.showBrand === false) { root.hidden = true; return; }

    const nameEl = U.$('#brand-name');
    const tagEl  = U.$('#brand-tagline');
    const logoEl = U.$('#brand-logo');
    const imgEl  = U.$('#brand-logo-img');

    nameEl.innerHTML = `${U.esc(s.name || 'SERVER')}${s.accent ? `<em>${U.esc(s.accent)}</em>` : ''}`;

    if (s.tagline) tagEl.textContent = s.tagline;
    else tagEl.hidden = true;

    if (s.logo) {
      imgEl.style.height = (Number(s.logoHeight) || 3.4) + 'rem';
      imgEl.onload  = () => { imgEl.hidden = false; logoEl.classList.add('has-image'); };
      imgEl.onerror = () => { logoEl.hidden = true; console.warn('[loadscreen] logo not found:', s.logo); };
      imgEl.src = s.logo;
    } else {
      logoEl.hidden = true;
    }

    // Outro copy
    const outro = CONFIG.outro || {};
    const oName = U.$('#outro-name');
    const oSub  = U.$('#outro-sub');
    const oLogo = U.$('#outro-logo');

    if (oName) {
      oName.innerHTML = outro.title
        ? U.esc(outro.title)
        : `${U.esc(s.name || 'SERVER')}${s.accent ? `<em>${U.esc(s.accent)}</em>` : ''}`;
    }
    if (oSub) oSub.textContent = outro.subtitle || '';
    if (oLogo && s.logo) {
      const img = new Image();
      img.src = s.logo;
      img.alt = '';
      img.style.height = ((Number(s.logoHeight) || 3.4) * 1.8) + 'rem';
      img.onload = () => oLogo.appendChild(img);
    }

    document.title = [s.name, s.accent].filter(Boolean).join(' ') || 'Loading';
  }

  /* ==================================================================
     SOCIAL LINKS
     ================================================================== */
  function renderSocials() {
    const list = U.$('#social');
    if (!list) return;

    if (!CONFIG.ui || CONFIG.ui.showSocials === false) { list.hidden = true; return; }

    const items = (CONFIG.socials || []).filter(x => x && x.show !== false && U.safeUrl(x.url));
    if (!items.length) { list.hidden = true; return; }

    list.innerHTML = items.map(item => {
      const url = U.safeUrl(item.url);
      return `<li class="social-item">
        <a href="${U.esc(url)}" target="_blank" rel="noreferrer" title="${U.esc(item.label || url)}">
          ${iconSvg(item.icon)}<span>${U.esc(item.label || '')}</span>
        </a>
      </li>`;
    }).join('');
  }

  /* ==================================================================
     CURSOR AUTO-HIDE
     ================================================================== */
  function autoHideCursor() {
    const after = Number((CONFIG.ui || {}).hideCursorAfter);
    if (!Number.isFinite(after) || after <= 0) return;

    let timer = null;
    const root = document.documentElement;

    const wake = () => {
      root.classList.remove('cursor-idle');
      clearTimeout(timer);
      timer = setTimeout(() => root.classList.add('cursor-idle'), after);
    };

    window.addEventListener('mousemove', wake, { passive: true });
    window.addEventListener('mousedown', wake, { passive: true });
    wake();
  }

  /* ==================================================================
     KEYBOARD
     ================================================================== */
  function keyboard() {
    if (!CONFIG.ui || CONFIG.ui.keyboardShortcuts === false) return;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      // If a control has focus, let it own its own keys. Otherwise Space
      // on the focused play button would fire the button AND this
      // handler, toggling twice and appearing to do nothing.
      const held = e.target && e.target.closest &&
                   e.target.closest('button, a, input, [role="slider"]');
      if (held && (e.key === ' ' || e.key === 'Enter' || e.key.indexOf('Arrow') === 0)) return;

      switch (e.key.toLowerCase()) {
        case 'm': Music.toggleMute(); break;
        case ' ': Music.togglePlay(); e.preventDefault(); break;
        case 'arrowright': Slides.next(); break;
        case 'arrowleft':  Slides.prev(); break;
        case 'h': document.getElementById('hud').classList.toggle('is-hidden'); break;
      }
    });
  }

  /* ==================================================================
     OUTRO
     ================================================================== */
  function playOutro() {
    const cfg   = CONFIG.outro || {};
    const stage = U.$('#stage');
    const outro = U.$('#outro');
    const black = U.$('#blackout');

    const hold = cfg.enabled === false ? 0 : Math.max(0, U.dur(Number(cfg.hold) || 1600));
    const fade = Math.max(120, U.dur(Number(cfg.fade) || 900));

    Backdrop.stop();
    Slides.stop();
    Tips.stop();
    Music.fadeOutAndStop(hold + fade);

    if (cfg.enabled !== false && outro) {
      stage.classList.add('is-outro');
      outro.hidden = false;
      // Timer rather than rAF — this one must not be skippable.
      setTimeout(() => outro.classList.add('is-on'), 16);
    }

    setTimeout(() => {
      if (black) {
        black.style.transitionDuration = fade + 'ms';
        black.classList.add('is-on');
      }
      setTimeout(() => {
        U.ticker.stop();
        Bridge.finish();
      }, fade + 60);
    }, hold);
  }

  /* ==================================================================
     BOOT
     ================================================================== */
  function boot() {
    U.applyTheme();

    renderBrand();
    renderSocials();

    // Progress first: Bridge replays any engine messages that arrived
    // before boot, and they need somewhere to land.
    Progress.init();
    Bridge.init();
    Backdrop.init();
    Slides.init();
    Tips.init();
    Music.init();

    keyboard();
    autoHideCursor();

    Progress.onComplete(playOutro);

    // Trigger the entrance animation on the next frame so the browser
    // has laid everything out first. The timer is a backstop: if the
    // compositor stalls rAF, the HUD must still become visible.
    const reveal = () => U.$('#stage').classList.remove('is-booting');
    requestAnimationFrame(() => requestAnimationFrame(reveal));
    setTimeout(reveal, 120);

    // Last-resort guard: if something above threw before onComplete was
    // registered, the Lua safety timeout still closes the screen.
    window.addEventListener('error', (e) => {
      console.error('[loadscreen] uncaught', e.message);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
