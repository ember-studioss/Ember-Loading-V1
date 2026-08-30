--[[
=======================================================================
  EMBER LOADSCREEN — GAME-SIDE CONFIG
=======================================================================
  Timings, player data, framework hooks. Nothing visual.

  Everything you can see  ->  web/js/config.js

  The only thing most servers change here is GetCharacterName.
=======================================================================
]]

Config = {}

-- ---------------------------------------------------------------------
--  TIMING
-- ---------------------------------------------------------------------

-- Hard safety net. No matter what happens in the UI (JS error, missing
-- asset, stuck animation) the loading screen is destroyed this many
-- seconds after the client script starts. Never disable this.
Config.MaxDuration = 300

-- Minimum time the screen stays up once the game reports "done", in ms.
-- Gives the outro cinematic room to breathe. Set 0 to close instantly.
Config.MinOutroTime = 900

-- Extra delay after the UI says it's finished, in ms. Covers the CSS
-- fade-to-black so players never see a hard cut.
Config.ShutdownDelay = 250

-- ---------------------------------------------------------------------
--  PLAYER INFORMATION
-- ---------------------------------------------------------------------

Config.Player = {
    -- Show the connecting player's FiveM name.
    showName = true,

    -- Show their server ID (only available once fully connected).
    showServerId = true,

    -- Look up a character name from your framework (see below).
    showCharacterName = true,
}

-- How often (ms) the server pushes live info (player count, status).
Config.InfoRefresh = 5000

-- ---------------------------------------------------------------------
--  SERVER INFORMATION
-- ---------------------------------------------------------------------
--  Anything left as nil falls back to the value in web/js/config.js.

Config.Server = {
    -- nil = read from the `sv_maxclients` convar automatically.
    maxPlayers = nil,

    -- Shown in the info panel. nil = value from web/js/config.js.
    version = nil,
    framework = nil,
    region = nil,
}

-- ---------------------------------------------------------------------
--  CHARACTER NAME  (server side)
-- ---------------------------------------------------------------------
--  Return the character name for a source, or nil. Uncomment your
--  framework's block. Runs in a pcall and retries a few times, since
--  character data is rarely ready the instant a player connects — a
--  broken lookup can never break the loadscreen.
-- ---------------------------------------------------------------------

Config.GetCharacterName = function(src)
    ------------------------------------------------------------------
    -- ESX
    ------------------------------------------------------------------
    -- local ESX = exports['es_extended']:getSharedObject()
    -- local xPlayer = ESX.GetPlayerFromId(src)
    -- if xPlayer then
    --     return ('%s %s'):format(xPlayer.get('firstName') or '', xPlayer.get('lastName') or '')
    -- end

    ------------------------------------------------------------------
    -- QBCore / QBox
    ------------------------------------------------------------------
    -- local QBCore = exports['qb-core']:GetCoreObject()
    -- local Player = QBCore.Functions.GetPlayer(src)
    -- if Player then
    --     local ci = Player.PlayerData.charinfo
    --     return ('%s %s'):format(ci.firstname, ci.lastname)
    -- end

    ------------------------------------------------------------------
    -- Your own database / cache
    ------------------------------------------------------------------
    -- return MySQL.scalar.await('SELECT name FROM characters WHERE license = ?', { GetLicense(src) })

    return nil
end

-- ---------------------------------------------------------------------
--  SERVER CLOCK
-- ---------------------------------------------------------------------
--  Only used when config.js sets backgrounds.timeSource = 'server'.
--  Return the hour (0-23) the backgrounds should follow. Override if
--  your server runs its own in-game clock.

Config.GetServerHour = function()
    -- Example, if you keep in-game time in a state bag or convar:
    -- return tonumber(GetConvar('server_ingame_hour', '12'))
    return tonumber(os.date('%H'))
end

-- ---------------------------------------------------------------------
--  SERVER STATUS  ->  the coloured pill in the info panel
-- ---------------------------------------------------------------------
--  Return { label = string, tone = 'good' | 'warn' | 'bad' }.

Config.GetServerStatus = function(playerCount, maxPlayers)
    local ratio = maxPlayers > 0 and (playerCount / maxPlayers) or 0

    if ratio >= 0.98 then
        return { label = 'QUEUE ACTIVE', tone = 'warn' }
    elseif ratio >= 0.75 then
        return { label = 'BUSY',         tone = 'warn' }
    end

    return { label = 'ONLINE', tone = 'good' }
end
