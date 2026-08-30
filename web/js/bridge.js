/* =====================================================================
   FIVEM BRIDGE
   ---------------------------------------------------------------------
   Two sources of messages arrive on `window.message`:

   1) The GAME ITSELF, automatically, while it loads:
        loadProgress, startInitFunction, initFunctionInvoking,
        initFunctionInvoked, endInitFunction, startDataFileEntries,
        onDataFileEntry, endDataFileEntries, performMapLoadFunction,
        onLogLine
      No Lua is involved — these are free, real progress signals.

   2) OUR OWN client script, via SendLoadingScreenMessage:
        { type: 'player' | 'serverInfo' | 'status' | 'gameReady' }

   Outbound we use one NUI callback, when the outro has finished, so
   client/main.lua can tear the screen down.
   ===================================================================== */

const Bridge = (() => {

  const el = {};

  let dataFileTotal = 0;
  let dataFileSeen  = 0;
  let sawRealProgress = false;

  /* ------------------------------------------------------------------
     Resource name — needed for the outbound fetch.
     ------------------------------------------------------------------ */
  function resourceName() {
    try {
      if (typeof window.GetParentResourceName === 'function') {
        return window.GetParentResourceName();
      }
      const m = String(window.location.hostname || '').match(/^cfx-nui-(.+)$/i);
      if (m) return m[1];
    } catch (e) { /* ignore */ }
    return 'ember-loadscreen-online';
  }

  function post(endpoint, body) {
    try {
      return fetch(`https://${resourceName()}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(body || {}),
      }).catch(() => {});
    } catch (e) {
      return Promise.resolve();
    }
  }

  /* ------------------------------------------------------------------
     FRIENDLY NAMES for the engine's internal phases.
     ------------------------------------------------------------------ */
  const INIT_NAMES = {
    INIT_CORE:              'starting game systems',
    INIT_BEFORE_MAP_LOADED: 'preparing world data',
    INIT_AFTER_MAP_LOADED:  'finalising world data',
    INIT_SESSION:           'starting session',
  };

  /* ==================================================================
     INBOUND — GAME EVENTS
     ================================================================== */

  function handleEngine(data) {
    switch (data.eventName) {

      case 'loadProgress': {
        const f = Number(data.loadFraction);
        if (Number.isFinite(f)) {
          sawRealProgress = true;
          Progress.setReal(f);
        }
        return true;
      }

      case 'startInitFunction':
        Progress.setDetail(INIT_NAMES[data.type] || String(data.type || '').toLowerCase());
        return true;

      case 'initFunctionInvoking': {
        const name = data.name || data.type || '';
        Progress.setDetail(String(name).toLowerCase());
        if (data.count > 0 && Number.isFinite(data.idx)) {
          // A weak signal, but better than nothing on builds that do
          // not emit loadProgress.
          if (!sawRealProgress) {
            Progress.milestone(10 + (data.idx / data.count) * 30);
          }
        }
        return true;
      }

      case 'initFunctionInvoked':
      case 'endInitFunction':
        return true;

      case 'startDataFileEntries':
        dataFileTotal = Number(data.count) || 0;
        dataFileSeen  = 0;
        Progress.setDetail('mounting data files');
        return true;

      case 'onDataFileEntry': {
        dataFileSeen++;
        const total = Number(data.count) || dataFileTotal;
        if (data.name) Progress.setDetail(String(data.name));
        if (!sawRealProgress && total > 0) {
          Progress.milestone(40 + (dataFileSeen / total) * 35);
        }
        return true;
      }

      case 'endDataFileEntries':
        Progress.setDetail('data files mounted');
        return true;

      case 'performMapLoadFunction':
        Progress.setDetail('building the world');
        if (!sawRealProgress) Progress.milestone(78);
        return true;

      case 'onLogLine':
        if (data.message) Progress.setDetail(data.message);
        return true;
    }
    return false;
  }

  /* ==================================================================
     INBOUND — OUR CLIENT SCRIPT
     ================================================================== */

  function handleResource(data) {
    switch (data.type) {

      case 'player':
        if (data.name)          setIdentity('name', data.name);
        if (data.characterName) setIdentity('character', data.characterName);
        if (data.serverId)      setIdentity('server', '#' + data.serverId);
        return;

      case 'serverInfo':
        setServerInfo(data);
        return;

      case 'status':
        if (data.text) Progress.setStatus(String(data.text));
        return;

      case 'gameReady':
        setQueue(null);
        Progress.milestone(97);
        Progress.complete();
        return;

      case 'queue':
        setQueue(data);
        return;

      case 'serverTime':
        if (window.Backdrop && Backdrop.setServerHour) Backdrop.setServerHour(data.hour);
        return;
    }
  }

  /* ==================================================================
     QUEUE
     ------------------------------------------------------------------
     Driven entirely by whatever queue resource you run — this just
     renders what it is told. Position 0/nil means "through the queue".
     ================================================================== */
  function setQueue(data) {
    const cfg = CONFIG.queue || {};
    if (!el.queue) return;

    const pos = data && Number(data.position);
    const on  = cfg.enabled !== false && Number.isFinite(pos) && pos > 0;

    if (!on) {
      if (!el.queue.hidden) {
        el.queue.classList.remove('is-on');
        setTimeout(() => { el.queue.hidden = true; }, 320);
      }
      Progress.setQueued(false);
      return;
    }

    el.queuePos.textContent = String(pos);

    const total = Number(data.total);
    if (cfg.showTotal !== false && Number.isFinite(total) && total > 0) {
      el.queueTotal.textContent = 'of ' + total;
      el.queueTotal.hidden = false;
    } else {
      el.queueTotal.hidden = true;
    }

    const eta = Number(data.eta);
    if (cfg.showEta !== false && Number.isFinite(eta) && eta > 0) {
      el.queueEta.textContent = 'Estimated wait ' + formatWait(eta);
      el.queueEta.hidden = false;
    } else {
      el.queueEta.hidden = true;
    }

    if (el.queueLabel)   el.queueLabel.textContent = cfg.label || 'POSITION IN QUEUE';
    if (el.queueMessage) el.queueMessage.textContent = data.message || cfg.message || '';

    if (el.queue.hidden) {
      el.queue.hidden = false;
      setTimeout(() => el.queue.classList.add('is-on'), 16);
    }
    Progress.setQueued(true);
  }

  function formatWait(seconds) {
    if (seconds < 90) return Math.max(1, Math.round(seconds / 10) * 10) + ' seconds';
    const mins = Math.round(seconds / 60);
    return mins + (mins === 1 ? ' minute' : ' minutes');
  }

  /* ==================================================================
     PANEL UPDATES
     ================================================================== */

  function setIdentity(kind, value) {
    if (!CONFIG.ui || CONFIG.ui.showPlayerInfo === false) return;
    const p = CONFIG.player || {};

    if (kind === 'name'      && p.showName === false) return;
    if (kind === 'character' && p.showCharacterName === false) return;
    if (kind === 'server'    && p.showServerId === false) return;

    const row = el['id_' + kind];
    const val = el['id_' + kind + '_val'];
    if (!row || !val) return;

    val.textContent = value;
    if (row.hidden) {
      row.hidden = false;
      // Timer, not rAF: if this class never lands the row stays at
      // opacity 0 and the player's name silently never appears.
      setTimeout(() => row.classList.add('is-in'), 16);
    }
  }

  function setServerInfo(info) {
    const s = CONFIG.server || {};

    if (Number.isFinite(Number(info.players))) {
      const max = Number(info.maxPlayers) || s.maxPlayers || 0;
      if (el.players) {
        el.players.textContent = max ? `${info.players} / ${max}` : String(info.players);
      }
      if (el.rowPlayers) el.rowPlayers.hidden = false;
    }

    const put = (node, row, value) => {
      if (!node) return;
      if (value) { node.textContent = value; if (row) row.hidden = false; }
    };

    put(el.framework, el.rowFramework, info.framework || s.framework);
    put(el.version,   el.rowVersion,   info.version   || s.version);
    put(el.region,    el.rowRegion,    info.region    || s.region);

    if (info.status && el.status) {
      el.status.textContent = String(info.status).toUpperCase();
      const tone = ['good', 'warn', 'bad'].includes(info.statusTone) ? info.statusTone : 'good';
      if (el.dot) el.dot.className = 'info-dot tone-' + tone;
    }
  }

  /** Fill the panel from config before any live data arrives. */
  function seedServerInfo() {
    const s = CONFIG.server || {};
    setServerInfo({
      // Only seed a player count if the config actually has one —
      // showing "0 / 64" before the server answers looks broken.
      players:    Number(s.players) > 0 ? Number(s.players) : undefined,
      maxPlayers: s.maxPlayers,
      framework:  s.framework,
      version:    s.version,
      region:     s.region,
    });

    if (el.status) el.status.textContent = 'CONNECTING';
    if (el.dot) el.dot.className = 'info-dot tone-idle';

    // Hide any row that has no value at all.
    [['rowPlayers', 'players'], ['rowFramework', 'framework'],
     ['rowVersion', 'version'], ['rowRegion', 'region']].forEach(([r, v]) => {
      const row = el[r], node = el[v];
      if (row && node && (!node.textContent || node.textContent === '—')) row.hidden = true;
    });
  }

  /* ==================================================================
     LIFECYCLE
     ================================================================== */

  function collect() {
    el.players      = U.$('#info-players');
    el.framework    = U.$('#info-framework');
    el.version      = U.$('#info-version');
    el.region       = U.$('#info-region');
    el.status       = U.$('#info-status');
    el.dot          = U.$('#info-dot');

    el.rowPlayers   = U.$('#row-players');
    el.rowFramework = U.$('#row-framework');
    el.rowVersion   = U.$('#row-version');
    el.rowRegion    = U.$('#row-region');

    el.id_name           = U.$('#id-name');
    el.id_name_val       = U.$('#id-name-val');
    el.id_character      = U.$('#id-character');
    el.id_character_val  = U.$('#id-character-val');
    el.id_server         = U.$('#id-server');
    el.id_server_val     = U.$('#id-server-val');

    el.queue        = U.$('#queue');
    el.queueLabel   = U.$('#queue-label');
    el.queuePos     = U.$('#queue-pos');
    el.queueTotal   = U.$('#queue-total');
    el.queueEta     = U.$('#queue-eta');
    el.queueMessage = U.$('#queue-message');
  }

  /* ------------------------------------------------------------------
     The game starts pushing loadProgress the moment the frame exists —
     which is before DOMContentLoaded, and therefore before boot(). So
     the listener is attached at parse time and anything that arrives
     early is queued and replayed once the modules are up. Without this
     the first chunk of real progress is silently thrown away.
     ------------------------------------------------------------------ */
  const pending = [];
  let live = false;

  function dispatch(data) {
    try {
      if (data.eventName) { handleEngine(data); return; }
      if (data.type)      { handleResource(data); }
    } catch (e) {
      console.error('[loadscreen] message handler', e);
    }
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (!live) { if (pending.length < 500) pending.push(data); return; }
    dispatch(data);
  });

  function init() {
    collect();

    if (!CONFIG.ui || CONFIG.ui.showServerInfo === false) {
      const panel = U.$('#info');
      if (panel) panel.hidden = true;
    } else {
      seedServerInfo();
    }

    live = true;
    const queued = pending.splice(0, pending.length);
    queued.forEach(dispatch);

    // Tell Lua the UI is alive.
    post('ember:loadscreen:ready', {});
  }

  /** Called once the outro has played out. */
  function finish() {
    post('ember:loadscreen:finished', {});
  }

  return { init, finish, post };
})();

window.Bridge = Bridge;
