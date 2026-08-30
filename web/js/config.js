/* =====================================================================
   EMBER LOADSCREEN — CONFIGURATION
   =====================================================================
   THIS IS THE ONLY FILE YOU NEED TO EDIT.

   Paths are relative to web/  ->  'assets/backgrounds/city.jpg'
   Remote https:// URLs work too. Anything missing is skipped silently,
   so the screen never breaks over a bad path.

   Tune it live: open web/preview.html in a browser. No server needed.

     1 server      5 backgrounds   9  music      12 outro
     2 links       6 video         10 player     13 effects
     3 theme       7 slides        11 progress   14 ui
     4 fonts       8 tips          11b queue
   ===================================================================== */

const CONFIG = {

  /* ===================================================================
     1. SERVER IDENTITY
     =================================================================== */
  server: {
    // Split name: `name` is bold white, `accent` is coloured.
    // Set accent to '' if you want a single-word name.
    name:    'EMBER',
    accent:  'ROLEPLAY',

    tagline: 'LOS SANTOS · SERIOUS ROLEPLAY · EST. 2021',

    // Optional logo image. Leave '' to use the typographic wordmark.
    // Recommended: transparent PNG/SVG, ~512px tall.
    logo: '',            // e.g. 'assets/logo.png'
    logoHeight: 3.4,     // in rem — scales with resolution

    // Shown in the top-right info panel. The Lua config can override
    // any of these at runtime (see config.lua).
    version:   'v4.2.0',
    framework: 'QBCore',
    region:    'EU · Frankfurt',

    // Fallback player numbers, replaced by live data when available.
    players:    0,
    maxPlayers: 64,
  },

  /* ===================================================================
     2. LINKS  (bottom-right, and used by slide buttons)
     ===================================================================
     icon: 'discord' | 'globe' | 'cart' | 'x' | 'youtube' | 'tiktok'
           | 'instagram' | 'twitch' | 'steam' | 'link'
     Set `show: false` to hide one without deleting it.
     =================================================================== */
  links: {
    discord: 'https://discord.gg/yourserver',
    website: 'https://yourserver.com',
    store:   'https://yourserver.tebex.io',
  },

  socials: [
    { icon: 'discord', label: 'discord.gg/yourserver', url: 'https://discord.gg/yourserver', show: true },
    { icon: 'globe',   label: 'yourserver.com',        url: 'https://yourserver.com',        show: true },
    { icon: 'cart',    label: 'STORE',                 url: 'https://yourserver.tebex.io',   show: true },
    { icon: 'x',       label: '@yourserver',           url: 'https://x.com/yourserver',      show: false },
    { icon: 'youtube', label: 'YouTube',               url: 'https://youtube.com/@yourserver', show: false },
    { icon: 'tiktok',  label: 'TikTok',                url: 'https://tiktok.com/@yourserver', show: false },
  ],

  /* ===================================================================
     3. THEME
     ===================================================================
     Every colour is a CSS variable, so you can restyle the whole screen
     from these few values.
     =================================================================== */
  theme: {
    accent:      '#ff8a3d',   // primary brand colour (progress, kickers)
    accentDeep:  '#c2410c',   // darker end of accent gradients
    accentInk:   '#0b0705',   // text drawn ON the accent colour

    ink:         '#ffffff',   // primary text
    inkSoft:     'rgba(255,255,255,0.66)',
    inkFaint:    'rgba(255,255,255,0.38)',

    panel:       'rgba(10,11,13,0.58)',   // glass panel fill
    panelSolid:  'rgba(12,13,15,0.92)',   // opaque panel fill
    hairline:    'rgba(255,255,255,0.10)',

    good:        '#3ddc84',
    warn:        '#ffbf3d',
    bad:         '#ff5757',

    // Panel corner radius, in rem.
    radius: 0.35,

    // Frosted glass behind panels. Costs a little GPU — turn off on
    // low-end target hardware.
    glass: true,
    glassBlur: 18,
  },

  /* ===================================================================
     4. FONTS
     ===================================================================
     Defaults use fonts that ship with Windows, so nothing is downloaded
     and nothing can fail. To use a custom font, drop the file in
     web/assets/fonts/ and add it to `custom` below.
     =================================================================== */
  fonts: {
    // Headlines, numbers, UI labels — wants a condensed grotesque.
    display: '"Franklin Gothic Demi Cond","Franklin Gothic Medium Cond","Haettenschweiler","Arial Narrow","Segoe UI Semibold","Segoe UI",Arial,sans-serif',

    // Body copy.
    body: '"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif',

    custom: [
      // { family: 'Chalet', url: 'assets/fonts/chalet.woff2', weight: 400 },
      // { family: 'Chalet', url: 'assets/fonts/chalet-bold.woff2', weight: 700 },
    ],
  },

  /* ===================================================================
     5. BACKGROUNDS
     ===================================================================
     Five hand-drawn Los Santos scenes ship wired up. Swap in your own
     screenshots any time: 2560x1440, JPG q80, under 600 KB each.
     =================================================================== */
  backgrounds: {
    shuffle: true,

    // ms each background stays on screen
    duration: 11000,

    // ms crossfade between backgrounds
    fade: 2200,

    kenBurns: {
      enabled: true,
      scale: 1.14,       // how far it zooms over its lifetime
      drift: 2.6,        // % of horizontal/vertical pan
    },

    parallax: {
      enabled: true,
      strength: 14,      // px of movement at screen edge
      ease: 0.06,        // 0..1 — lower is smoother/laggier
    },

    /* TIME OF DAY -----------------------------------------------------
       Scenes tagged `timeOfDay` only show in matching hours, so a
       midnight connect gets the night city. Untagged scenes always
       qualify; if nothing matches, the full list is used.

         'client'  the player's own clock              (default)
         'server'  the hour from Config.GetServerHour  (config.lua)
         'off'     ignore tags, shuffle everything
       ----------------------------------------------------------------- */
    timeSource: 'client',

    // Which hours count as which period. [start, end), 24h, wraps.
    periods: {
      dawn:  [5, 8],
      day:   [8, 17],
      dusk:  [17, 20],
      night: [20, 5],
    },

    /* SCENES ----------------------------------------------------------
       scene:    folder holding far.svg / mid.svg / near.svg. Each layer
                 moves at its own rate — real depth, not a flat slide.
       image:    a single flat image (your screenshots go here).
       gradient: a plain colour wash, no file needed.

       Optional per entry: focus ('50% 30%'), zoom ('in' | 'out').
       ----------------------------------------------------------------- */
    images: [
      { scene: 'assets/backgrounds/01-downtown-dusk',  timeOfDay: 'dusk',  zoom: 'in'  },
      { scene: 'assets/backgrounds/02-blaine-county',  timeOfDay: 'night', zoom: 'out' },
      { scene: 'assets/backgrounds/03-beach-sunset',   timeOfDay: 'dusk',  zoom: 'in'  },
      { scene: 'assets/backgrounds/04-desert-highway', timeOfDay: 'day',   zoom: 'out' },
      { scene: 'assets/backgrounds/05-downtown-night', timeOfDay: 'night', zoom: 'in'  },

      // Your own screenshots drop straight in alongside them:
      // { image: 'assets/backgrounds/06.jpg', focus: '50% 35%', zoom: 'out' },
    ],

    // How far each depth plane moves, relative to `parallax.strength`.
    // Far barely shifts, near swings the most — that difference is the
    // whole effect. Also scales how much each plane ken-burns.
    depth: { far: 0.22, mid: 0.6, near: 1.15 },
  },

  /* ===================================================================
     6. BACKGROUND VIDEO  (optional)
     ===================================================================
     When enabled the video replaces the image rotation entirely.
     Keep it short, muted and well compressed — 10-25s, H.264 MP4,
     under ~15 MB. Long/large videos slow down the actual game load.
     =================================================================== */
  video: {
    enabled: false,
    src: 'assets/video/intro.mp4',
    // Shown while the video buffers, and if it fails to play.
    poster: '',
    // Play the image rotation underneath as a safety net.
    fallbackToImages: true,
    // Slight slow-motion reads more cinematic. 1 = normal.
    rate: 0.9,
  },

  /* ===================================================================
     7. FEATURED CONTENT SLIDES
     ===================================================================
     The GTA Online-style rotating promo panel.

       kicker      small coloured label ("NEW VEHICLE", "EVENT"...)
       title       headline
       description one or two short sentences
       image       artwork — 16:9 works best. Optional.
       gradient    used when there is no image (or as its backdrop)
       button      { label, url } — optional. Needs loadscreen_cursor.
       accent      optional per-slide colour override

     Suggested categories: server updates, new vehicles, new jobs,
     businesses, events, staff announcements, community news, featured
     players, rules, releases, seasonal content.
     =================================================================== */
  slideSettings: {
    duration: 9000,      // ms per slide
    shuffle: false,      // keep order, or randomise
    showDots: true,
    showTimer: true,
    transition: 'cinematic',   // 'cinematic' | 'fade' | 'slide'

    /* NEW BADGES ------------------------------------------------------
       A slide with an `id` gets a NEW badge the first time a player
       sees it. Seen ids live in that client's browser storage — no
       server, no database. Change the `id` and it counts as new again.
       Slides without an `id` are never badged.
       ----------------------------------------------------------------- */
    markNew: true,
    newForDays: 14,
  },

  slides: [
    {
      id: 'cayo-2026-08',
      kicker: 'SERVER UPDATE',
      title: 'THE CAYO EXPANSION',
      description: 'A new island district opens this weekend — smuggling routes, a private airstrip and eleven new properties to claim.',
      image: 'assets/slides/island.svg',
      gradient: 'linear-gradient(135deg,#0f3b46 0%,#1d6f6a 45%,#37b39b 100%)',
      button: { label: 'PATCH NOTES', url: 'https://discord.gg/yourserver' },
    },
    {
      id: 'comet-s2',
      kicker: 'NEW VEHICLE',
      title: 'PFISTER COMET S2',
      description: 'Now stocked at Legendary Motorsport. Tuned for canyon runs, with full liveries and performance upgrades available.',
      image: 'assets/slides/night-run.svg',
      gradient: 'linear-gradient(135deg,#2b1a3d 0%,#7a2f6b 50%,#e0567a 100%)',
      button: { label: 'VIEW SHOWROOM', url: 'https://yourserver.com' },
      accent: '#e0567a',
    },
    {
      id: 'harbour-freight',
      kicker: 'NEW CAREER',
      title: 'HARBOUR FREIGHT',
      description: 'Move containers across the docks for legitimate pay — or look the other way when a crate is not on the manifest.',
      image: 'assets/slides/docks.svg',
      gradient: 'linear-gradient(135deg,#13233b 0%,#22557f 55%,#4ea0c9 100%)',
    },
    {
      id: 'nightclubs',
      kicker: 'BUSINESSES',
      title: 'OWN A NIGHTCLUB',
      description: 'Ten venues across the city are now purchasable. Hire staff, book DJs and run the floor however you like.',
      image: 'assets/slides/venue.svg',
      gradient: 'linear-gradient(135deg,#3d1030 0%,#8a1d5a 50%,#ff7ab6 100%)',
      button: { label: 'MORE INFO', url: 'https://yourserver.com' },
    },
    {
      id: 'vespucci-meet',
      kicker: 'THIS WEEKEND',
      title: 'VESPUCCI STREET MEET',
      description: 'Saturday, 8PM. Bring something loud. Cash prizes for best build, best livery and the quickest lap of the canals.',
      image: '',
      gradient: 'linear-gradient(135deg,#3a2606 0%,#a56a12 50%,#ffcf5c 100%)',
      accent: '#ffcf5c',
    },
    {
      id: 'staff-apps',
      kicker: 'FROM THE TEAM',
      title: 'APPLICATIONS ARE OPEN',
      description: 'We are recruiting moderators and emergency-services whitelist staff. Applications close at the end of the month.',
      image: '',
      gradient: 'linear-gradient(135deg,#171a20 0%,#333a47 50%,#7c889c 100%)',
      button: { label: 'APPLY NOW', url: 'https://discord.gg/yourserver' },
    },
    {
      id: 'potm',
      kicker: 'COMMUNITY',
      title: 'PLAYER OF THE MONTH',
      description: 'Congratulations to @Marlowe for outstanding roleplay across the taxi and legal storylines. Nominate someone in Discord.',
      image: '',
      gradient: 'linear-gradient(135deg,#0d2a1c 0%,#1f6b45 50%,#63d99a 100%)',
    },
    {
      kicker: 'REMINDER',
      title: 'STAY IN CHARACTER',
      description: 'No OOC chat in-game, no random deathmatch, and value your life. Full rules are pinned in the Discord.',
      image: '',
      gradient: 'linear-gradient(135deg,#3a0f12 0%,#8c2226 50%,#e8646a 100%)',
      button: { label: 'READ THE RULES', url: 'https://discord.gg/yourserver' },
      accent: '#e8646a',
    },
  ],

  /* ===================================================================
     8. TIPS
     ===================================================================
     Short one-liners cycled along the bottom bar.
     Either a plain string, or { badge, text } for a custom label.
     =================================================================== */
  tipSettings: {
    duration: 6500,
    shuffle: true,
    defaultBadge: 'TIP',
  },

  tips: [
    'Press F1 to open the phone. Everything from banking to the taxi app lives in there.',
    { badge: 'KEYBIND', text: 'Hold ALT to interact with the nearest object, door or player.' },
    { badge: 'KEYBIND', text: 'Press F2 for your inventory and F3 for the emote wheel.' },
    'New in town? Take a starter job from the pin on your map before spending your first paycheck.',
    { badge: 'ECONOMY', text: 'Cash in your pocket can be stolen — bank anything you are not about to spend.' },
    { badge: 'ECONOMY', text: 'Vehicle insurance is cheaper than a replacement. Always insure a new purchase.' },
    { badge: 'VEHICLES', text: 'Engine damage above 40% will stall you. Carry a repair kit on long routes.' },
    { badge: 'VEHICLES', text: 'Impounded cars can be recovered from the depot for a fee — you never lose a vehicle permanently.' },
    { badge: 'RULES', text: 'Value your life. If someone is pointing a gun at you, act like it.' },
    { badge: 'RULES', text: 'No combat logging. Disconnecting during a scene results in an automatic ban.' },
    { badge: 'SUPPORT', text: 'Stuck? Use /report in game or open a ticket in the Discord — staff are on around the clock.' },
    'Speak with /me and /do to describe things the game engine cannot show.',
  ],

  /* ===================================================================
     9. MUSIC
     ===================================================================
     No audio ships with this resource. Drop files in web/assets/music/
     and list them below — copying a file in is only HALF the job, the
     player cannot list a directory. `src` is relative to web/.

     While `tracks` is empty the whole panel stays hidden, pause button
     included (an empty player looks broken). This is the most common
     setup mistake.

     Use MP3 or OGG. Remote URLs play fine but get a synthetic
     visualiser — cross-origin audio cannot be analysed.

     Pausing: the transport button, clicking the artwork, or SPACE.
     =================================================================== */
  music: {
    enabled: true,
    autoplay: true,
    shuffle: true,
    loop: true,

    volume: 0.55,        // 0..1
    startMuted: false,

    fadeIn: 1800,        // ms fade when a track starts
    crossfade: 1200,     // ms overlap between tracks

    visualiser: true,
    visualiserBars: 44,

    // Remember volume/mute between loads (per client).
    rememberSettings: true,

    tracks: [
      // Rename title/artist to whatever this actually is — they show
      // in the player panel.
      { title: 'Loading Theme', artist: 'Ember Radio', src: 'assets/music/musicc.mp3' },

      // { title: 'Vinewood Hills', artist: 'Ember Radio', src: 'assets/music/02.mp3' },
    ],
  },

  /* ===================================================================
     10. PLAYER INFORMATION
     ===================================================================
     Populated by client/main.lua where the data is available.
     =================================================================== */
  player: {
    show: true,
    showName: true,
    showCharacterName: true,
    showServerId: true,
    unknownLabel: '—',
  },

  /* ===================================================================
     11. LOADING PROGRESS
     ===================================================================
     mode:
       'real'      trust the game's own progress events only
       'simulated' ignore the game, run a timed fake bar
       'hybrid'    real progress, but never let it look stuck  (recommended)
     =================================================================== */
  progress: {
    mode: 'hybrid',

    // 'hybrid'/'simulated': how long a full fake run takes, ms.
    simulatedDuration: 45000,

    // Bar smoothing, 0..1. Lower = smoother and lazier.
    smoothing: 0.08,

    // Never show a percentage that goes backwards.
    monotonic: true,

    showPercent: true,

    // Show the raw engine detail line (file names, init functions).
    showDetail: true,

    /* TIME REMAINING --------------------------------------------------
       Estimated from the real rate and deliberately cautious: hidden
       until the rate settles, only ever falls, and suppressed rather
       than counting down the last seconds. A wrong ETA is worse than
       none.
       ----------------------------------------------------------------- */
    showEta: true,
    etaMinPercent: 12,   // do not guess before this — early data is noisy
    etaHideBelow: 8,     // seconds; below this, say nothing

    // Coarse status text, keyed by percentage reached.
    stages: [
      { at: 0,  text: 'CONNECTING TO SERVER' },
      { at: 8,  text: 'DOWNLOADING RESOURCES' },
      { at: 26, text: 'MOUNTING GAME DATA' },
      { at: 44, text: 'LOADING STREAMED ASSETS' },
      { at: 62, text: 'BUILDING THE WORLD' },
      { at: 78, text: 'STARTING SCRIPTS' },
      { at: 90, text: 'JOINING SESSION' },
      { at: 99, text: 'ENTERING LOS SANTOS' },
    ],
  },

  /* ===================================================================
     11b. QUEUE
     ===================================================================
     Push a position in and the screen switches to a queue state: the
     bar goes indeterminate and a card shows the position.

     No dependency either way — your queue script pushes to this one:

         exports['ember-loadscreen-online']:SetQueue(src, 3, 27, 90)
         exports['ember-loadscreen-online']:ClearQueue(src)

     Args are position, total, eta (seconds); only position is needed.
     =================================================================== */
  queue: {
    enabled: true,

    label: 'POSITION IN QUEUE',

    // Shown under the position while waiting.
    message: 'Holding your place. Do not close the game.',

    // Show "of 27" beside the position.
    showTotal: true,

    // Show an estimated wait if the queue script sends one.
    showEta: true,
  },

  /* ===================================================================
     12. OUTRO
     ===================================================================
     The short cinematic that plays at 100% before the screen closes.
     =================================================================== */
  outro: {
    enabled: true,
    title: '',                       // '' = uses server name
    subtitle: 'ENTERING LOS SANTOS',
    hold: 1600,                      // ms on screen
    fade: 900,                       // ms fade to black
  },

  /* ===================================================================
     13. VISUAL EFFECTS
     =================================================================== */
  effects: {
    // Film grain. 0 disables it.
    grain: 0.045,
    grainSpeed: 8,        // frames per second of grain movement

    // Edge darkening.
    vignette: 0.68,

    // GTA-style colour grade: teal shadows, warm highlights.
    grade: true,
    gradeStrength: 0.34,

    // Slight contrast/saturation lift on the backdrop.
    contrast: 1.06,
    saturation: 1.08,

    // Global animation speed multiplier. 1 = normal, 0.5 = half speed,
    // 0 = no animation at all (accessibility / very low-end machines).
    animationSpeed: 1,
  },

  /* ===================================================================
     14. FEATURE TOGGLES
     =================================================================== */
  ui: {
    showBrand: true,
    showServerInfo: true,
    showSlides: true,
    showTips: true,
    showMusic: true,
    showSocials: true,
    showPlayerInfo: true,
    showProgressBar: true,

    // Hide the mouse cursor after this many ms of no movement.
    // 0 keeps it visible.
    hideCursorAfter: 2500,

    // Keyboard shortcuts (M mute, space play/pause, arrows change slide).
    keyboardShortcuts: true,
  },
};

// Make the config available to every module.
window.CONFIG = CONFIG;
