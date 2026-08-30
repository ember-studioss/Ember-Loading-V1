--[[
=======================================================================
  EMBER LOADSCREEN — SERVER
=======================================================================
  Supplies the loading screen with data the client cannot know on its
  own: live player count, max slots, server status and (optionally) the
  character name from your framework.
=======================================================================
]]

local RESOURCE = GetCurrentResourceName()

-- Clients currently sitting on the loading screen.
local watching = {}

-- Forward declaration: the requestInfo handler below is defined before
-- the clock section, and a `local` is only in scope from its own
-- declaration onwards — without this the call would hit a nil global.
local pushHour

-- ---------------------------------------------------------------------
--  HELPERS
-- ---------------------------------------------------------------------

local function getMaxPlayers()
    if Config.Server.maxPlayers then
        return Config.Server.maxPlayers
    end
    return tonumber(GetConvar('sv_maxclients', '48')) or 48
end

local function buildInfo()
    local count = #GetPlayers()
    local max   = getMaxPlayers()

    local ok, status = pcall(Config.GetServerStatus, count, max)
    if not ok or type(status) ~= 'table' then
        status = { label = 'ONLINE', tone = 'good' }
    end

    return {
        players     = count,
        maxPlayers  = max,
        status      = status.label,
        statusTone  = status.tone,
        version     = Config.Server.version,
        framework   = Config.Server.framework,
        region      = Config.Server.region,
        hostname    = GetConvar('sv_projectName', ''),
    }
end

local function pushCharacterName(src)
    if not Config.Player.showCharacterName then return end

    local ok, name = pcall(Config.GetCharacterName, src)
    if not ok then
        print(('[%s] Config.GetCharacterName errored: %s'):format(RESOURCE, tostring(name)))
        return
    end

    if type(name) == 'string' then
        name = name:gsub('^%s+', ''):gsub('%s+$', '')
        if name ~= '' then
            TriggerClientEvent('ember-loadscreen:character', src, name)
        end
    end
end

-- ---------------------------------------------------------------------
--  CLIENT REQUESTS
-- ---------------------------------------------------------------------

RegisterNetEvent('ember-loadscreen:requestInfo', function()
    local src = source
    watching[src] = true

    TriggerClientEvent('ember-loadscreen:info', src, buildInfo())
    pushHour(src)

    -- Character data usually is not ready the instant a player connects,
    -- so try immediately and then a couple more times.
    CreateThread(function()
        for _ = 1, 12 do
            if not watching[src] then return end
            pushCharacterName(src)
            Wait(2500)
        end
    end)
end)

-- ---------------------------------------------------------------------
--  LIVE REFRESH
-- ---------------------------------------------------------------------

CreateThread(function()
    local interval = math.max(1000, Config.InfoRefresh or 5000)

    while true do
        Wait(interval)

        local anyone = false
        for _ in pairs(watching) do anyone = true break end
        if anyone then
            local info = buildInfo()
            for src in pairs(watching) do
                TriggerClientEvent('ember-loadscreen:info', src, info)
            end
        end
    end
end)

-- ---------------------------------------------------------------------
--  QUEUE  (called by your queue resource — no dependency either way)
-- ---------------------------------------------------------------------
--
--    exports['ember-loadscreen-online']:SetQueue(src, position, total, eta)
--
--  position : 1-based place in the queue. 0 or nil clears the state.
--  total    : optional, size of the queue.
--  eta      : optional, estimated wait in SECONDS.
--
--  Safe to call every tick — it is a single event per call, and the UI
--  ignores repeats of the same value.

local function setQueue(src, position, total, eta, message)
    src = tonumber(src)
    if not src then return false end

    TriggerClientEvent('ember-loadscreen:queue', src, {
        position = tonumber(position) or 0,
        total    = tonumber(total),
        eta      = tonumber(eta),
        message  = message,
    })
    return true
end

exports('SetQueue', setQueue)
exports('ClearQueue', function(src) return setQueue(src, 0) end)

-- Also available as an event, for queue scripts that prefer them.
RegisterNetEvent('ember-loadscreen:setQueue', function(position, total, eta, message)
    setQueue(source, position, total, eta, message)
end)

-- ---------------------------------------------------------------------
--  SERVER CLOCK
-- ---------------------------------------------------------------------
--  Only used when web/js/config.js has backgrounds.timeSource = 'server'.
--  Override Config.GetServerHour in config.lua if your server runs its
--  own in-game clock.

pushHour = function(src)
    local ok, hour = pcall(function()
        if Config.GetServerHour then return Config.GetServerHour() end
        return tonumber(os.date('%H'))
    end)
    if ok and tonumber(hour) then
        TriggerClientEvent('ember-loadscreen:time', src, tonumber(hour))
    end
end

-- ---------------------------------------------------------------------
--  CLEANUP
-- ---------------------------------------------------------------------

AddEventHandler('playerDropped', function()
    watching[source] = nil
end)

-- Stop pushing once the player is actually in game.
RegisterNetEvent('ember-loadscreen:done', function()
    watching[source] = nil
end)
