fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'ember-loadscreen-online'
author 'Ember Studios'
version '1.0.0'
description 'A premium, GTA Online-inspired cinematic loading screen for FiveM'

-- =====================================================================
--  LOADING SCREEN
-- =====================================================================
--  loadscreen_manual_shutdown : we close the screen ourselves so the
--      "100% -> outro -> fade" cinematic can finish playing. client/main.lua
--      ALWAYS force-closes after Config.MaxDuration, so a JS error can never
--      strand a player on a black screen.
--
--  loadscreen_cursor : required for the music controls, promo buttons and
--      social links to be clickable. Set to 'no' if you want a purely
--      passive screen (buttons/links then do nothing).
-- =====================================================================
loadscreen 'web/index.html'
loadscreen_manual_shutdown 'yes'
loadscreen_cursor 'yes'

files {
    'web/index.html',
    'web/css/style.css',

    'web/js/config.js',
    'web/js/util.js',
    'web/js/backdrop.js',
    'web/js/slides.js',
    'web/js/tips.js',
    'web/js/music.js',
    'web/js/progress.js',
    'web/js/bridge.js',
    'web/js/app.js',

    -- User-supplied media. Everything here is optional: missing files
    -- degrade gracefully (gradient backdrops, wordmark logo, no music).
    --
    -- Both a top-level and a recursive glob for each type, so a file
    -- dropped straight into web/ is served just the same as one filed
    -- neatly under web/assets/. A media file that is NOT matched here
    -- is never sent to the client and 404s in the UI, which is a
    -- miserable thing to debug.
    'web/*.png',   'web/**/*.png',
    'web/*.jpg',   'web/**/*.jpg',
    'web/*.jpeg',  'web/**/*.jpeg',
    'web/*.webp',  'web/**/*.webp',
    'web/*.avif',  'web/**/*.avif',
    'web/*.svg',   'web/**/*.svg',
    'web/*.gif',   'web/**/*.gif',
    'web/*.mp4',   'web/**/*.mp4',
    'web/*.webm',  'web/**/*.webm',
    'web/*.mp3',   'web/**/*.mp3',
    'web/*.ogg',   'web/**/*.ogg',
    'web/*.m4a',   'web/**/*.m4a',
    'web/*.wav',   'web/**/*.wav',
    'web/*.woff',  'web/**/*.woff',
    'web/*.woff2', 'web/**/*.woff2',
    'web/*.ttf',   'web/**/*.ttf',
    'web/*.otf',   'web/**/*.otf',
}

shared_script 'config.lua'
client_script 'client/main.lua'
server_script 'server/main.lua'

provides {
    'ember-loadscreen-online',
}
