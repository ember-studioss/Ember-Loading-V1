=======================================================================
  ASSETS
=======================================================================
  Nothing here is required. Delete anything and the screen falls back
  to gradients without complaint.

  Paths in config.js are relative to web/  ->  'assets/music/01.mp3'


ALREADY INCLUDED
-----------------------------------------------------------------------
  backgrounds/   5 Los Santos scenes, 3 layers each
  slides/        4 featured-card artworks

  Original vector artwork drawn for this resource: ~2 KB a layer, sharp
  at any resolution. Deliberately NOT Rockstar assets -- official GTA
  artwork and screenshots are copyrighted and cannot be redistributed
  inside a resource. Use your own screenshots for real imagery.


FOLDER LAYOUT
-----------------------------------------------------------------------
  assets/
    logo.png                  transparent PNG or SVG, ~512px tall
    backgrounds/
      01-downtown-dusk/       a layered scene = a folder
        far.svg               sky, sun, distant ridges
        mid.svg               the skyline or main subject
        near.svg              ground and foreground props
      mine.jpg                a flat image works too
    slides/     16:9 artwork for the featured cards
    music/      the loading soundtrack
    video/      optional background video
    fonts/      optional self-hosted font


SPECS
-----------------------------------------------------------------------
  BACKGROUNDS   JPG (or WebP) · 2560x1440 ideal, 1920x1080 min
                q75-q82, under 600 KB each · 4-8 of them

  SLIDE ART     JPG or PNG · 16:9 (1280x720) · under 300 KB

  MUSIC         MP3 or OGG · 128-160 kbps · 2-4 min
                (WMA and FLAC will not play)

  VIDEO         H.264 MP4 (yuv420p) or WebM · 1920x1080
                10-25s, looping, under 15 MB

  FONTS         WOFF2 preferred; WOFF/TTF/OTF also work


COMPOSITION RULES
-----------------------------------------------------------------------
  * Keep subjects out of the OUTER ~8% of the frame. Ken burns zooms to
    1.14 and parallax shifts further, so edge content gets cropped.

  * Keep the lower-left and lower-right thirds quiet -- the promo card
    and music player sit there. Sky, skyline and horizons read best.

  * Building your own layered scene: match far/mid/near on the same
    1920x1080 canvas, transparent background on everything except far,
    then point config.js at the folder with `scene:`.


THINGS THAT WILL BITE YOU
-----------------------------------------------------------------------
  * Every megabyte here is downloaded before the game can finish
    loading. Compress aggressively.

  * Adding a music file is only HALF the job -- it must also be listed
    in music.tracks in web/js/config.js. The player cannot list a
    directory. This is the single most common setup mistake.

  * Do NOT link Google Fonts or any CDN. Many players connect before
    their network stack is ready and the font simply never arrives.
    Self-host it here instead.

  * Do not ship copyrighted music on a public server.

  * fxmanifest.lua already globs every common media extension anywhere
    under web/, so new files are picked up automatically. Restart the
    resource, and clear the FiveM cache if an old asset sticks.
