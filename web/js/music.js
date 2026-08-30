/* =====================================================================
   MUSIC PLAYER
   ---------------------------------------------------------------------
   Two audio channels so tracks can crossfade instead of hard-cutting,
   a real WebAudio spectrum visualiser when the files are local, and a
   synthetic one when they are not.

   Why the split: routing a cross-origin file through WebAudio without
   CORS headers produces SILENCE, not an error. So the analyser is only
   attached when every configured track is served from this resource.
   Remote URLs still play perfectly — they just get the synthetic bars.
   ===================================================================== */

const Music = (() => {

  const el = {};

  let tracks   = [];
  let order    = [];
  let cursor   = -1;
  let channels = [];
  let active   = 0;

  let ctx = null, analyser = null, masterGain = null, freq = null;
  let useAnalyser = false;

  let volume  = 0.55;
  let muted   = false;
  let playing = false;
  let ready   = false;
  let stopped = false;
  let crossfading = false;

  let vizStop = null;

  /* ==================================================================
     SETUP
     ================================================================== */

  function collect() {
    el.root      = U.$('#player');
    el.title     = U.$('#track-title');
    el.artist    = U.$('#track-artist');
    el.art       = U.$('#player-art');
    el.play      = U.$('#btn-play');
    el.prev      = U.$('#btn-prev');
    el.next      = U.$('#btn-next');
    el.mute      = U.$('#btn-mute');
    el.volTrack  = U.$('#vol-track');
    el.volFill   = U.$('#vol-fill');
    el.volKnob   = U.$('#vol-knob');
    el.viz       = U.$('#viz');
    el.prompt    = U.$('#audio-prompt');
    el.state     = U.$('#player-state');
    el.hint      = U.$('#player-hint');
  }

  const isLocal = (src) => typeof src === 'string' && !/^[a-z]+:\/\//i.test(src);

  function normalise(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(t => (typeof t === 'string' ? { src: t } : t))
      .filter(t => t && typeof t.src === 'string' && t.src.trim())
      .map((t, i) => ({
        src:    t.src.trim(),
        title:  t.title  || ('TRACK ' + String(i + 1).padStart(2, '0')),
        artist: t.artist || (CONFIG.server && CONFIG.server.name) || '',
        cover:  t.cover  || '',
        dead:   false,
      }));
  }

  function reorder() {
    const idx = tracks.map((_, i) => i).filter(i => !tracks[i].dead);
    order = (CONFIG.music && CONFIG.music.shuffle) ? U.shuffle(idx) : idx;
  }

  /* ==================================================================
     AUDIO GRAPH
     ================================================================== */

  function buildChannel() {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume  = 0;

    const ch = { audio, gain: null, level: 0, target: 0, rate: 0, track: null };

    if (useAnalyser && ctx) {
      try {
        const source = ctx.createMediaElementSource(audio);
        ch.gain = ctx.createGain();
        ch.gain.gain.value = 0;
        source.connect(ch.gain);
        ch.gain.connect(masterGain);
      } catch (e) {
        // Fall back to element volume for this channel.
        ch.gain = null;
      }
    }

    audio.addEventListener('ended', () => {
      if (!crossfading && ch === channels[active]) advance(1);
    });

    audio.addEventListener('error', () => {
      if (ch.track) {
        ch.track.dead = true;
        console.warn(
          '[loadscreen] TRACK FAILED TO LOAD: ' + ch.track.src + '\n' +
          '  Usually one of: the path is wrong (it is relative to web/),\n' +
          '  the file is not matched by the files{} globs in fxmanifest.lua,\n' +
          '  or the codec is unsupported (use MP3 or OGG, not WMA/FLAC).'
        );
      }
      if (ch === channels[active]) {
        const alive = tracks.some(t => !t.dead);
        if (alive) { reorder(); advance(1); }
        else       { disable('no playable tracks'); }
      }
    });

    return ch;
  }

  function initAudioGraph() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const wantViz = CONFIG.music.visualiser !== false;
    const allLocal = tracks.every(t => isLocal(t.src));

    if (wantViz && AC && allLocal) {
      try {
        ctx = new AC();
        masterGain = ctx.createGain();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        freq = new Uint8Array(analyser.frequencyBinCount);

        masterGain.connect(analyser);
        analyser.connect(ctx.destination);
        useAnalyser = true;
      } catch (e) {
        ctx = null; analyser = null; masterGain = null; useAnalyser = false;
      }
    }

    channels = [buildChannel(), buildChannel()];
    applyVolume();
  }

  /* ==================================================================
     VOLUME
     ================================================================== */

  function applyVolume() {
    const m = muted ? 0 : volume;

    if (masterGain) masterGain.gain.value = m;

    channels.forEach(ch => {
      if (ch.gain) {
        // Routed through WebAudio: the element must stay wide open,
        // volume is handled by the gain nodes.
        ch.gain.gain.value = ch.level;
        ch.audio.volume = 1;
        ch.audio.muted  = false;
      } else {
        ch.audio.volume = U.clamp(m * ch.level, 0, 1);
        ch.audio.muted  = muted;
      }
    });

    paintVolume();
  }

  function paintVolume() {
    const pct = Math.round((muted ? 0 : volume) * 100);
    if (el.volFill) el.volFill.style.width = pct + '%';
    if (el.volKnob) el.volKnob.style.left  = pct + '%';
    if (el.volTrack) el.volTrack.setAttribute('aria-valuenow', String(pct));
    if (el.root) el.root.classList.toggle('is-muted', muted || volume <= 0);
  }

  function setVolume(v, persist = true) {
    volume = U.clamp(v, 0, 1);
    if (volume > 0 && muted) muted = false;
    applyVolume();
    if (persist && CONFIG.music.rememberSettings !== false) {
      U.store.set('volume', volume);
      U.store.set('muted', muted);
    }
  }

  function toggleMute() {
    muted = !muted;
    applyVolume();
    if (CONFIG.music.rememberSettings !== false) U.store.set('muted', muted);
  }

  /* ==================================================================
     FADES  (driven by the shared ticker)
     ================================================================== */

  function fadeChannel(ch, target, ms) {
    ch.target = U.clamp(target, 0, 1);
    ch.rate   = ms > 0 ? Math.abs(ch.target - ch.level) / ms : Infinity;
    if (!Number.isFinite(ch.rate)) { ch.level = ch.target; applyVolume(); }
  }

  function tickFades(dt) {
    let changed = false;
    channels.forEach(ch => {
      if (ch.level === ch.target) return;
      const step = ch.rate * dt;
      if (Math.abs(ch.target - ch.level) <= step) ch.level = ch.target;
      else ch.level += Math.sign(ch.target - ch.level) * step;
      changed = true;

      if (ch.level === 0 && ch.target === 0 && !ch.audio.paused) {
        try { ch.audio.pause(); } catch (e) {}
      }
    });
    if (changed) applyVolume();
  }

  /* ==================================================================
     PLAYBACK
     ================================================================== */

  function pickNext(step) {
    if (!order.length) return null;
    cursor += step;

    if (cursor >= order.length) {
      if (CONFIG.music.loop === false) return null;
      cursor = 0;
      if (CONFIG.music.shuffle) reorder();
    }
    if (cursor < 0) cursor = order.length - 1;

    return tracks[order[cursor]] || null;
  }

  function paintTrack(track) {
    if (el.title)  el.title.textContent  = track ? track.title  : '—';
    if (el.artist) el.artist.textContent = track ? track.artist : '';
    if (el.art) {
      if (track && track.cover) {
        el.art.style.backgroundImage = `url("${track.cover}")`;
        el.art.classList.add('has-cover');
      } else {
        el.art.style.backgroundImage = '';
        el.art.classList.remove('has-cover');
      }
    }
  }

  function play(track, { crossfade = false } = {}) {
    if (!track || stopped) return;

    const cfg      = CONFIG.music;
    const fadeIn   = Math.max(0, Number(cfg.fadeIn) || 0);
    const overlap  = Math.max(0, Number(cfg.crossfade) || 0);

    const nextIndex = crossfade ? (active + 1) % channels.length : active;
    const ch  = channels[nextIndex];
    const old = channels[active];

    ch.track = track;
    ch.audio.src = track.src;
    ch.level = 0;

    const started = ch.audio.play();

    const onStarted = () => {
      playing = true;
      ready = true;
      // `active` must move first — setState reads channels[active] to
      // decide whether a track is loaded at all. (`old` was captured
      // before this, so the crossfade below is unaffected.)
      active = nextIndex;
      setState(true);
      hidePrompt();
      fadeChannel(ch, 1, crossfade ? overlap : fadeIn);
      if (crossfade && old !== ch) {
        crossfading = true;
        fadeChannel(old, 0, overlap);
        setTimeout(() => { crossfading = false; }, overlap + 50);
      }
      paintTrack(track);
      startViz();
    };

    if (started && typeof started.then === 'function') {
      started.then(onStarted).catch(() => {
        // Autoplay blocked, or the file is missing. The track is loaded
        // either way, so this is a genuine paused state.
        playing = false;
        active = nextIndex;
        setState(false);
        paintTrack(track);
        showPrompt();
      });
    } else {
      onStarted();
    }
  }

  function advance(step) {
    const track = pickNext(step);
    if (!track) { setState(false); playing = false; return; }
    play(track, { crossfade: playing && (Number(CONFIG.music.crossfade) || 0) > 0 });
  }

  function togglePlay() {
    const ch = channels[active];
    if (!ch) return;

    if (playing) {
      playing = false;
      setState(false);
      fadeChannel(ch, 0, U.dur(320));
      setTimeout(() => { if (!playing) { try { ch.audio.pause(); } catch (e) {} } }, U.dur(360));
    } else if (ch.track) {
      const p = ch.audio.play();
      const ok = () => {
        playing = true; setState(true); hidePrompt();
        fadeChannel(ch, 1, U.dur(400));
        startViz();
      };
      if (p && typeof p.then === 'function') p.then(ok).catch(showPrompt);
      else ok();
    } else {
      advance(1);
    }
  }

  /* ------------------------------------------------------------------
     Playback state is three-valued, not two: nothing loaded yet,
     playing, or deliberately paused. Only the third one should announce
     itself — a paused player that still says "NOW PLAYING" reads as a
     bug, and a player that never started should not say "PAUSED".
     ------------------------------------------------------------------ */
  function setState(on) {
    if (!el.root) return;

    const ch = channels[active];
    const loaded = !!(ch && ch.track);

    el.root.classList.toggle('is-playing', !!on);
    el.root.classList.toggle('is-paused', !on && loaded);

    if (el.state) el.state.textContent = (!on && loaded) ? 'PAUSED' : 'NOW PLAYING';

    // One short pulse on the transport button so the change is felt as
    // well as read, without anything flashing on screen.
    if (loaded && el.play && U.speed() > 0) {
      el.play.classList.remove('is-bump');
      void el.play.offsetWidth;
      el.play.classList.add('is-bump');
    }
  }

  /* ==================================================================
     AUTOPLAY PROMPT
     ================================================================== */

  function showPrompt() {
    if (!el.prompt || stopped) return;
    el.prompt.hidden = false;
    setTimeout(() => el.prompt.classList.add('is-on'), 16);
  }

  function hidePrompt() {
    if (!el.prompt) return;
    el.prompt.classList.remove('is-on');
    setTimeout(() => { el.prompt.hidden = true; }, 300);
  }

  function unlock() {
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    const ch = channels[active];
    if (ch && ch.track) {
      const p = ch.audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          playing = true; setState(true); hidePrompt();
          fadeChannel(ch, 1, U.dur(600));
          startViz();
        }).catch(() => {});
      }
    } else {
      advance(1);
    }
  }

  /* ==================================================================
     VISUALISER
     ================================================================== */

  function startViz() {
    if (vizStop || !el.viz) return;
    if (CONFIG.music.visualiser === false) return;
    if (U.speed() <= 0) return;

    const cvs = el.viz;
    const g   = cvs.getContext('2d');
    if (!g) return;

    const bars = U.clamp(Number(CONFIG.music.visualiserBars) || 44, 8, 128);
    const dpr  = U.clamp(window.devicePixelRatio || 1, 1, 2);
    let w = 0, h = 0, cssW = -1, cssH = -1;
    const levels = new Float32Array(bars);
    let phase = 0;
    let settled = false;

    /** Cheap: offsetWidth/Height only, no getBoundingClientRect per frame. */
    function resize() {
      const ow = cvs.offsetWidth, oh = cvs.offsetHeight;
      if (ow === cssW && oh === cssH) return;
      cssW = ow; cssH = oh;
      w = Math.max(1, Math.round(ow * dpr));
      h = Math.max(1, Math.round(oh * dpr));
      cvs.width = w; cvs.height = h;
    }
    resize();

    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#ff8a3d';

    vizStop = U.ticker.add((dt) => {
      resize();
      if (w < 2 || h < 2) return;

      phase += dt * 0.004;

      if (!playing) {
        // Paused: settle onto a low resting curve so the panel reads as
        // a stopped equaliser rather than an empty gap, then stop
        // redrawing entirely.
        let moving = false;
        for (let i = 0; i < bars; i++) {
          const rest = 0.045 + 0.055 * Math.sin((i / bars) * Math.PI);
          if (Math.abs(levels[i] - rest) > 0.002) {
            levels[i] = U.lerp(levels[i], rest, 0.12);
            moving = true;
          } else {
            levels[i] = rest;
          }
        }
        if (!moving && settled) return;
        settled = !moving;

      } else if (useAnalyser && analyser) {
        settled = false;
        analyser.getByteFrequencyData(freq);
        const usable = Math.floor(freq.length * 0.78);
        for (let i = 0; i < bars; i++) {
          // Log-ish bucket mapping so the bass does not dominate.
          const t0 = Math.pow(i / bars, 1.6);
          const t1 = Math.pow((i + 1) / bars, 1.6);
          const a = Math.floor(t0 * usable);
          const b = Math.max(a + 1, Math.floor(t1 * usable));
          let sum = 0;
          for (let k = a; k < b; k++) sum += freq[k];
          const v = (sum / (b - a)) / 255;
          levels[i] = U.lerp(levels[i], Math.pow(v, 0.85), 0.35);
        }

      } else {
        // Synthetic: pleasant, never claims to be real data.
        settled = false;
        for (let i = 0; i < bars; i++) {
          const n = Math.sin(phase * 1.7 + i * 0.42) * 0.5 +
                    Math.sin(phase * 0.9 + i * 1.13) * 0.3 +
                    Math.sin(phase * 2.6 + i * 0.21) * 0.2;
          const env = 0.35 + 0.65 * Math.sin((i / bars) * Math.PI);
          levels[i] = U.lerp(levels[i], U.clamp((n * 0.5 + 0.5) * env, 0, 1), 0.2);
        }
      }

      g.clearRect(0, 0, w, h);

      const gap   = Math.max(1, Math.round(w / bars * 0.34));
      const bw    = Math.max(1, (w - gap * (bars - 1)) / bars);
      const grad  = g.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0.16)');
      grad.addColorStop(1, accent);
      g.fillStyle = grad;

      for (let i = 0; i < bars; i++) {
        const bh = Math.max(1 * dpr, levels[i] * h);
        g.fillRect(i * (bw + gap), h - bh, bw, bh);
      }
    });
  }

  function stopViz() {
    if (vizStop) { vizStop(); vizStop = null; }
    if (el.viz) {
      const g = el.viz.getContext('2d');
      if (g) g.clearRect(0, 0, el.viz.width, el.viz.height);
    }
  }

  /* ==================================================================
     CONTROLS
     ================================================================== */

  function wireVolumeSlider() {
    const track = el.volTrack;
    if (!track) return;

    let dragging = false;

    const fromEvent = (e) => {
      const r = track.getBoundingClientRect();
      const x = (e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0));
      return U.clamp((x - r.left) / Math.max(1, r.width), 0, 1);
    };

    const down = (e) => { dragging = true; setVolume(fromEvent(e)); e.preventDefault(); };
    const move = (e) => { if (dragging) setVolume(fromEvent(e)); };
    const up   = () => { dragging = false; };

    track.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    track.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);

    track.addEventListener('wheel', (e) => {
      e.preventDefault();
      setVolume(volume + (e.deltaY < 0 ? 0.05 : -0.05));
    }, { passive: false });

    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp')   { setVolume(volume + 0.05); e.preventDefault(); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') { setVolume(volume - 0.05); e.preventDefault(); }
    });
  }

  function wire() {
    if (el.play) el.play.addEventListener('click', togglePlay);
    if (el.next) el.next.addEventListener('click', () => advance(1));
    if (el.prev) el.prev.addEventListener('click', () => advance(-1));
    if (el.mute) el.mute.addEventListener('click', toggleMute);
    if (el.prompt) el.prompt.addEventListener('click', unlock);

    // The artwork is a second, much larger target for the same action.
    if (el.art) el.art.addEventListener('click', togglePlay);

    // Only advertise the shortcuts if they are actually enabled.
    if (el.hint && CONFIG.ui && CONFIG.ui.keyboardShortcuts !== false) {
      el.hint.hidden = false;
    }

    wireVolumeSlider();
  }

  function disable(reason) {
    if (el.root) el.root.hidden = true;
    stopViz();
    if (reason) console.warn('[loadscreen] MUSIC DISABLED — ' + reason);
  }

  /* ==================================================================
     LIFECYCLE
     ================================================================== */

  function init() {
    collect();
    if (!el.root) return;

    const cfg = CONFIG.music || {};

    if (!cfg.enabled || !CONFIG.ui || CONFIG.ui.showMusic === false) {
      return disable('turned off in config');
    }

    tracks = normalise(cfg.tracks);
    if (!tracks.length) {
      return disable(
        'music.tracks is empty in web/js/config.js.\n' +
        '  Copying an audio file into the resource is only half of it — the\n' +
        '  player cannot list a directory, so every track must be named in\n' +
        '  the config:\n\n' +
        "      tracks: [\n" +
        "        { title: 'My Track', artist: 'Artist', src: 'assets/music/01.mp3' },\n" +
        "      ]\n\n" +
        '  `src` is relative to web/ — not web/assets/..., not a disk path.'
      );
    }

    console.info('[loadscreen] music: ' + tracks.length + ' track(s) configured — ' +
                 tracks.map(t => t.src).join(', '));

    volume = Number.isFinite(Number(cfg.volume)) ? U.clamp(Number(cfg.volume), 0, 1) : 0.55;
    muted  = !!cfg.startMuted;

    if (cfg.rememberSettings !== false) {
      const sv = U.store.get('volume', null);
      const sm = U.store.get('muted', null);
      if (sv !== null && Number.isFinite(Number(sv))) volume = U.clamp(Number(sv), 0, 1);
      if (sm !== null) muted = !!sm;
    }

    reorder();
    initAudioGraph();
    wire();
    applyVolume();
    U.ticker.add(tickFades);
    startViz();   // draws the resting baseline until playback begins

    if (cfg.autoplay !== false) advance(1);
    else { paintTrack(tracks[order[0]] || null); cursor = -1; }
  }

  /** Fade out and release everything — called by the outro. */
  function fadeOutAndStop(ms) {
    stopped = true;
    const d = Math.max(0, ms || 800);
    channels.forEach(ch => fadeChannel(ch, 0, d));
    setTimeout(() => {
      channels.forEach(ch => { try { ch.audio.pause(); ch.audio.src = ''; } catch (e) {} });
      stopViz();
      if (ctx) { try { ctx.close(); } catch (e) {} }
    }, d + 80);
  }

  return {
    init, fadeOutAndStop,
    toggleMute, togglePlay,
    next: () => advance(1),
    prev: () => advance(-1),
    setVolume: (v) => setVolume(v),
    getVolume: () => volume,
    isMuted: () => muted,
  };
})();

window.Music = Music;
