# ember-loadscreen-online

A premium, GTA Online-inspired loading screen for FiveM.

Parallax backdrops · rotating promo cards · music player · live server info ·
queue support · real engine progress. One config file, no dependencies, no build
step. Artwork included.

---

## Install

1. Drop the folder into `resources/`
2. `ensure ember-loadscreen-online` in `server.cfg` — **early**, before your framework
3. Stop any other loading screen; only one resource may declare `loadscreen`
4. Edit [`web/js/config.js`](web/js/config.js) — name, tagline, links. Done.

## Configure

Everything is in [`web/js/config.js`](web/js/config.js): one object, numbered
sections, every option commented in place. [`config.lua`](config.lua) holds only
game-side bits — the one thing most servers change there is `GetCharacterName`.

**To see your changes without launching the game, double-click
[`web/preview.html`](web/preview.html).** It runs the real screen with your real
config in a browser, so you can scrub progress, step scenes and slides and toggle
the queue instantly.

## Queue (optional)

Works with any queue script — no dependency either way:

```lua
exports['ember-loadscreen-online']:SetQueue(source, 3, 27, 90)  -- pos, total, eta
exports['ember-loadscreen-online']:ClearQueue(source)
```

---

## Things that will catch you out

Press **F8** while loading — every failure below logs the exact reason.

| Symptom | Cause and fix |
|---------|---------------|
| Edits do nothing | Loadscreen cache. Restart, reconnect, then clear `FiveM Application Data/data/cache/`. |
| No music panel at all | Copying the file in is only half of it — every track must also be listed in `music.tracks`. |
| Track won't play | Path is relative to `web/`. Use MP3 or OGG; WMA and FLAC won't play. |
| Visualiser not reacting | Your tracks are remote URLs — cross-origin audio can't be analysed. Deliberate. |
| My images don't show | Path is relative to `web/` — `assets/backgrounds/x.jpg`, not `web/assets/…` or a disk path. |
| Subject cropped off screen | Keep it out of the outer ~8%; ken burns and parallax crop the edges. |
| Custom font never loads | Never link a CDN — self-host in `assets/fonts/`. Players connect before their network is ready. |
| Buttons and links dead | `loadscreen_cursor` must be `'yes'` in `fxmanifest.lua`. |
| No player count | Server script isn't running. |
| No character name | `Config.GetCharacterName` returns `nil` until you fill it in. |
| Two screens fighting | Only one resource may declare `loadscreen`. |

---

## Notes

- `Config.MaxDuration` (default 300s) force-closes the screen whatever state the
  UI is in, so a script error can never strand a player on a black screen. Don't
  disable it. To close early: `exports['ember-loadscreen-online']:Shutdown()`
- Keyboard: `Space` pause · `M` mute · `←` `→` slides · `H` hide UI
- Included artwork is original vector work — no Rockstar assets are
  redistributed. No music is bundled; add your own.
