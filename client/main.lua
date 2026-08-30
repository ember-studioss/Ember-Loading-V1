--[[
=======================================================================
  EMBER LOADSCREEN — CLIENT
=======================================================================
  Responsibilities:
    1. Push player + server information into the NUI frame.
    2. Close the loading screen when the UI says its outro has finished.
    3. Guarantee the screen ALWAYS closes, even if the UI dies.

  The raw loading progress (loadProgress / initFunctionInvoking /
  onLogLine / onDataFileEntry ...) is delivered to the NUI frame by the
  game itself — no Lua involvement needed. See web/js/bridge.js.
=======================================================================
]]

local RESOURCE   = GetCurrentResourceName()
local isDown     = false
local uiReady    = false
local startedAt  = GetGameTimer()

-- ---------------------------------------------------------------------
--  MESSAGING
-- ---------------------------------------------------------------------

local function send(payload)
    if isDown then return end
    SendLoadingScreenMessage(json.encode(payload))
end

-- ---------------------------------------------------------------------
--  SHUTDOWN
-- ---------------------------------------------------------------------

local function shutdown(reason)
    if isDown then return end
    isDown = true

    if Config.ShutdownDelay and Config.ShutdownDelay > 0 then
        Wait(Config.ShutdownDelay)
    end

    ShutdownLoadingScreen()
    ShutdownLoadingScreenNui()

    print(('[%s] loading screen closed (%s)'):format(RESOURCE, reason or 'unknown'))
end

-- The UI plays its own outro, then calls this.
RegisterNUICallback('ember:loadscreen:finished', function(_, cb)
    cb({ ok = true })
    CreateThread(function() shutdown('ui finished') end)
end)

-- Let a spawn manager / framework close it early:
--   TriggerEvent('ember-loadscreen:shutdown')
--   exports['ember-loadscreen-online']:Shutdown()
RegisterNetEvent('ember-loadscreen:shutdown', function()
    CreateThread(function() shutdown('external event') end)
end)

AddEventHandler('ember-loadscreen:shutdown', function()
    CreateThread(function() shutdown('external event') end)
end)

exports('Shutdown', function()
    CreateThread(function() shutdown('export') end)
end)

-- Absolute safety net — nothing can strand a player on a black screen.
CreateThread(function()
    local limit = (Config.MaxDuration or 300) * 1000
    while not isDown do
        if GetGameTimer() - startedAt > limit then
            shutdown('safety timeout')
            return
        end
        Wait(1000)
    end
end)

-- ---------------------------------------------------------------------
--  UI HANDSHAKE
-- ---------------------------------------------------------------------
--  The NUI frame can be created slightly after the client script starts,
--  so we announce ourselves until it answers.

RegisterNUICallback('ember:loadscreen:ready', function(_, cb)
    uiReady = true
    cb({ ok = true })
end)

-- ---------------------------------------------------------------------
--  PLAYER INFORMATION
-- ---------------------------------------------------------------------

CreateThread(function()
    local sent = false

    for _ = 1, 400 do -- ~100 seconds
        if isDown then return end

        local pid    = PlayerId()
        local name   = GetPlayerName(pid)
        local server = GetPlayerServerId(pid)

        local haveName = name and name ~= '' and name ~= '**Invalid**'

        if haveName then
            send({
                type     = 'player',
                name     = Config.Player.showName and name or nil,
                serverId = (Config.Player.showServerId and server and server > 0) and server or nil,
            })
            sent = true

            -- A valid server ID means we're fully registered; ask the
            -- server for the character name and live info.
            if server and server > 0 then
                TriggerServerEvent('ember-loadscreen:requestInfo')
                return
            end
        end

        Wait(250)
    end

    if not sent then
        send({ type = 'player', name = nil, serverId = nil })
    end
end)

-- ---------------------------------------------------------------------
--  SERVER INFORMATION (pushed from server/main.lua)
-- ---------------------------------------------------------------------

RegisterNetEvent('ember-loadscreen:info', function(info)
    if type(info) ~= 'table' then return end
    info.type = 'serverInfo'
    send(info)
end)

RegisterNetEvent('ember-loadscreen:character', function(charName)
    if not Config.Player.showCharacterName then return end
    send({ type = 'player', characterName = charName })
end)

-- ---------------------------------------------------------------------
--  QUEUE
-- ---------------------------------------------------------------------
--  Driven by whatever queue resource you run. From the server:
--      exports['ember-loadscreen-online']:SetQueue(src, 3, 27, 90)
--  or directly:
--      TriggerClientEvent('ember-loadscreen:queue', src, { position = 3 })
--
--  Send position 0 or nil to clear it.

RegisterNetEvent('ember-loadscreen:queue', function(data)
    if type(data) ~= 'table' then data = {} end
    send({
        type     = 'queue',
        position = tonumber(data.position) or 0,
        total    = tonumber(data.total),
        eta      = tonumber(data.eta),
        message  = data.message,
    })
end)

-- ---------------------------------------------------------------------
--  SERVER CLOCK  (for backgrounds.timeSource = 'server')
-- ---------------------------------------------------------------------

RegisterNetEvent('ember-loadscreen:time', function(hour)
    send({ type = 'serverTime', hour = tonumber(hour) })
end)

-- ---------------------------------------------------------------------
--  LIVE STATUS LINE
-- ---------------------------------------------------------------------
--  A few coarse milestones the raw loadProgress events don't expose.

CreateThread(function()
    local announced = {}

    local function once(key, status)
        if announced[key] then return end
        announced[key] = true
        send({ type = 'status', text = status })
    end

    while not isDown do
        if NetworkIsSessionStarted() then
            once('session', 'JOINING SESSION')
        end
        if NetworkIsPlayerActive(PlayerId()) then
            once('active', 'ENTERING LOS SANTOS')
            send({ type = 'gameReady' })
            return
        end
        Wait(500)
    end
end)
