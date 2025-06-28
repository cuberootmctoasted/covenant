-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _dataStructureWithEvents = TS.import(script, script.Parent, "dataStructureWithEvents")
local EventMap = _dataStructureWithEvents.EventMap
local EventSet = _dataStructureWithEvents.EventSet
local function createUseEvent(_param)
	local indicateUpdate = _param.indicateUpdate
	local queues = EventMap.new()
	local watchedEvents = EventSet.new()
	local caches = EventMap.new()
	local lastUpdateId = -1
	return function(updateId, event)
		if lastUpdateId ~= updateId then
			caches:clear()
			lastUpdateId = updateId
		end
		local cache = caches:get(event)
		if cache ~= nil then
			return cache
		end
		if not watchedEvents:has(event) then
			watchedEvents:add(event)
			queues:set(event, {})
			event:Connect(function(...)
				local args = { ... }
				local _exp = queues:get(event)
				local _args = args
				table.insert(_exp, _args)
				indicateUpdate()
			end)
			caches:set(event, {})
			return {}
		end
		local queue = queues:get(event)
		if not (#queue == 0) then
			queues:set(event, {})
		end
		caches:set(event, queue)
		return queue
	end
end
local function createUseEventImmediately(_param)
	local indicateUpdate = _param.indicateUpdate
	local queues = EventMap.new()
	local watchedEvents = EventSet.new()
	local caches = EventMap.new()
	local lastUpdateId = -1
	return function(updateId, event, callback)
		if lastUpdateId ~= updateId then
			caches:clear()
			lastUpdateId = updateId
		end
		local cache = caches:get(event)
		if cache ~= nil then
			return cache
		end
		if not watchedEvents:has(event) then
			watchedEvents:add(event)
			queues:set(event, {})
			event:Connect(function(...)
				local args = { ... }
				local _exp = queues:get(event)
				local _arg0 = callback(unpack(args))
				table.insert(_exp, _arg0)
				indicateUpdate()
			end)
			caches:set(event, {})
			return {}
		end
		local queue = queues:get(event)
		if not (#queue == 0) then
			queues:set(event, {})
		end
		caches:set(event, queue)
		return queue
	end
end
local function createUseComponentChange(_param)
	local subscribeComponent = _param.subscribeComponent
	local update = _param.indicateUpdate
	local queues = {}
	local watchedStringifiedComponents = {}
	local caches = {}
	local lastUpdateId = -1
	return function(updateId, component)
		if lastUpdateId ~= updateId then
			table.clear(caches)
			lastUpdateId = updateId
		end
		local stringifiedComponent = tostring(component)
		local cache = caches[stringifiedComponent]
		if cache ~= nil then
			return cache
		end
		if not (watchedStringifiedComponents[stringifiedComponent] ~= nil) then
			watchedStringifiedComponents[stringifiedComponent] = true
			queues[stringifiedComponent] = {}
			subscribeComponent(component, function(entity, state, previousState)
				local _exp = queues[stringifiedComponent]
				local _arg0 = {
					entity = entity,
					state = state,
					previousState = previousState,
				}
				table.insert(_exp, _arg0)
				update()
			end)
			caches[stringifiedComponent] = {}
			return {}
		end
		local queue = queues[stringifiedComponent]
		if not (#queue == 0) then
			queues[stringifiedComponent] = {}
		end
		caches[stringifiedComponent] = queue
		return queue
	end
end
local function equalsDependencies(a, b)
	if a == b then
		return true
	end
	if #a ~= #b then
		return false
	end
	for i = 0, #a - 1 do
		if a[i + 1] ~= b[i + 1] then
			return false
		end
	end
	return true
end
local function executeThread(res, asnycFn, update)
	res.completed = false
	local sucess, errMsg = pcall(function()
		res.value = asnycFn()
	end)
	if not sucess and type(errMsg) == "string" then
		res.errorMessage = errMsg
	end
	res.completed = true
	update()
end
local function createUseAsync(_param)
	local indicateUpdate = _param.indicateUpdate
	local storage = {}
	local caches = {}
	local lastUpdateId = -1
	return function(updateId, asnycFactory, dependencies, discriminator)
		if lastUpdateId ~= updateId then
			table.clear(caches)
			lastUpdateId = updateId
		end
		local _discriminator = discriminator
		local cache = caches[_discriminator]
		if cache ~= nil then
			return cache
		end
		local _discriminator_1 = discriminator
		if not (storage[_discriminator_1] ~= nil) then
			local newResult = {
				completed = false,
				value = nil,
			}
			local thread = coroutine.create(executeThread)
			coroutine.resume(thread, newResult, asnycFactory, indicateUpdate)
			local _discriminator_2 = discriminator
			local _arg1 = {
				lastDependencies = dependencies,
				thread = thread,
				result = newResult,
			}
			storage[_discriminator_2] = _arg1
			local _discriminator_3 = discriminator
			caches[_discriminator_3] = newResult
			return newResult
		end
		local _discriminator_2 = discriminator
		local state = storage[_discriminator_2]
		if equalsDependencies(state.lastDependencies, dependencies) then
			local _discriminator_3 = discriminator
			local _result = state.result
			caches[_discriminator_3] = _result
			return state.result
		else
			coroutine.close(state.thread)
			local newResult = {
				completed = false,
				value = nil,
			}
			local newThread = coroutine.create(executeThread)
			coroutine.resume(newThread, newResult, asnycFactory, indicateUpdate)
			local _discriminator_3 = discriminator
			local _arg1 = {
				lastDependencies = dependencies,
				thread = newThread,
				result = newResult,
			}
			storage[_discriminator_3] = _arg1
			local _discriminator_4 = discriminator
			caches[_discriminator_4] = newResult
			return newResult
		end
	end
end
local function createUseImperative(_param)
	local indicateUpdate = _param.indicateUpdate
	local storage = {}
	local caches = {}
	local lastUpdateId = -1
	return function(updateId, dirtyFactory, dependencies, discriminator)
		if lastUpdateId ~= updateId then
			table.clear(caches)
			lastUpdateId = updateId
		end
		local _discriminator = discriminator
		local cache = caches[_discriminator]
		if cache ~= nil then
			return cache
		end
		local _discriminator_1 = discriminator
		if not (storage[_discriminator_1] ~= nil) then
			local _binding = dirtyFactory(indicateUpdate)
			local value = _binding.value
			local cleanup = _binding.cleanup
			local _discriminator_2 = discriminator
			local _arg1 = {
				cache = value,
				cleanup = cleanup,
				lastDependencies = dependencies,
			}
			storage[_discriminator_2] = _arg1
			local _discriminator_3 = discriminator
			caches[_discriminator_3] = value
			return value
		end
		local _discriminator_2 = discriminator
		local state = storage[_discriminator_2]
		if equalsDependencies(state.lastDependencies, dependencies) then
			local _discriminator_3 = discriminator
			local _cache = state.cache
			caches[_discriminator_3] = _cache
			return state.cache
		else
			if state.cleanup ~= nil then
				state.cleanup()
			end
			local _binding = dirtyFactory(indicateUpdate)
			local value = _binding.value
			local cleanup = _binding.cleanup
			local _discriminator_3 = discriminator
			local _arg1 = {
				cache = value,
				cleanup = cleanup,
				lastDependencies = dependencies,
			}
			storage[_discriminator_3] = _arg1
			local _discriminator_4 = discriminator
			caches[_discriminator_4] = value
			return value
		end
	end
end
local function createUseChange()
	local dependenciesStorage = {}
	local caches = {}
	local lastUpdateId = -1
	return function(updateId, dependencies, discriminator)
		if lastUpdateId ~= updateId then
			table.clear(caches)
			lastUpdateId = updateId
		end
		local _discriminator = discriminator
		local cache = caches[_discriminator]
		if cache ~= nil then
			return cache
		end
		local _discriminator_1 = discriminator
		if not (dependenciesStorage[_discriminator_1] ~= nil) then
			local _discriminator_2 = discriminator
			local _dependencies = dependencies
			dependenciesStorage[_discriminator_2] = _dependencies
			local _discriminator_3 = discriminator
			caches[_discriminator_3] = true
			return true
		end
		local _discriminator_2 = discriminator
		local lastDependencies = dependenciesStorage[_discriminator_2]
		if equalsDependencies(lastDependencies, dependencies) then
			local _discriminator_3 = discriminator
			caches[_discriminator_3] = false
			return false
		else
			local _discriminator_3 = discriminator
			local _dependencies = dependencies
			dependenciesStorage[_discriminator_3] = _dependencies
			local _discriminator_4 = discriminator
			caches[_discriminator_4] = true
			return true
		end
	end
end
local function createUseInterval(_param)
	local indicateUpdate = _param.indicateUpdate
	local nextClocks = {}
	local caches = {}
	local lastUpdateId = -1
	return function(updateId, seconds, trueOnInit, discriminator)
		if lastUpdateId ~= updateId then
			table.clear(caches)
			lastUpdateId = updateId
		end
		local _discriminator = discriminator
		local cache = caches[_discriminator]
		if cache ~= nil then
			return cache
		end
		local _discriminator_1 = discriminator
		if not (nextClocks[_discriminator_1] ~= nil) then
			local _discriminator_2 = discriminator
			local _arg1 = os.clock() + seconds
			nextClocks[_discriminator_2] = _arg1
			task.delay(seconds, indicateUpdate)
			local _discriminator_3 = discriminator
			local _trueOnInit = trueOnInit
			caches[_discriminator_3] = _trueOnInit
			return trueOnInit
		end
		local _discriminator_2 = discriminator
		local nextClock = nextClocks[_discriminator_2]
		if nextClock > os.clock() then
			local _discriminator_3 = discriminator
			caches[_discriminator_3] = false
			return false
		else
			local _discriminator_3 = discriminator
			local _arg1 = os.clock() + seconds
			nextClocks[_discriminator_3] = _arg1
			task.delay(seconds, indicateUpdate)
			local _discriminator_4 = discriminator
			caches[_discriminator_4] = true
			return true
		end
	end
end
local function createHooks(props)
	return {
		useEvent = createUseEvent(props),
		useEventImmediately = createUseEventImmediately(props),
		useComponentChange = createUseComponentChange(props),
		useAsync = createUseAsync(props),
		useImperative = createUseImperative(props),
		useChange = createUseChange(),
		useInterval = createUseInterval(props),
	}
end
return {
	createHooks = createHooks,
}
