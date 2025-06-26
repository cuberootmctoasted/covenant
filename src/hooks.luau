-- Compiled with roblox-ts v3.0.0
-- eslint-disable-next-line @typescript-eslint/no-explicit-any
local function withUpdateId(fn)
	local cache = nil
	local lastUpdateId = -1
	return function(id, ...)
		local args = { ... }
		if lastUpdateId ~= id then
			cache = nil
			lastUpdateId = id
		end
		if cache == nil then
			cache = fn(unpack(args))
		end
		return cache
	end
end
local function createUseEvent(_param)
	local indicateUpdate = _param.indicateUpdate
	local queues = {}
	local watchedEvents = {}
	local hook = function(event)
		local _event = event
		if not (watchedEvents[_event] ~= nil) then
			local _event_1 = event
			watchedEvents[_event_1] = true
			local _event_2 = event
			queues[_event_2] = {}
			event:Connect(function(...)
				local args = { ... }
				local _event_3 = event
				local _exp = queues[_event_3]
				local _args = args
				table.insert(_exp, _args)
				indicateUpdate()
			end)
			return {}
		end
		local _event_1 = event
		local queue = queues[_event_1]
		if not (#queue == 0) then
			local _event_2 = event
			queues[_event_2] = {}
		end
		return queue
	end
	return withUpdateId(hook)
end
local function createUseEventImmediately(_param)
	local indicateUpdate = _param.indicateUpdate
	local queues = {}
	local watchedEvents = {}
	local hook = function(event, callback)
		local _event = event
		if not (watchedEvents[_event] ~= nil) then
			local _event_1 = event
			watchedEvents[_event_1] = true
			local _event_2 = event
			queues[_event_2] = {}
			event:Connect(function(...)
				local args = { ... }
				local _event_3 = event
				local _exp = queues[_event_3]
				local _arg0 = callback(unpack(args))
				table.insert(_exp, _arg0)
				indicateUpdate()
			end)
			return {}
		end
		local _event_1 = event
		local queue = queues[_event_1]
		if not (#queue == 0) then
			local _event_2 = event
			queues[_event_2] = {}
		end
		return queue
	end
	return withUpdateId(hook)
end
local function createUseComponentChange(_param)
	local subscribeComponent = _param.subscribeComponent
	local update = _param.indicateUpdate
	local queues = {}
	local watchedStringifiedComponents = {}
	local hook = function(component)
		local stringifiedComponent = tostring(component)
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
			return {}
		end
		local queue = queues[stringifiedComponent]
		if not (#queue == 0) then
			queues[stringifiedComponent] = {}
		end
		return queue
	end
	return withUpdateId(hook)
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
	local hook = function(asnycFactory, dependencies, discriminator)
		local _discriminator = discriminator
		if not (storage[_discriminator] ~= nil) then
			local newResult = {
				completed = false,
				value = nil,
			}
			local thread = coroutine.create(executeThread)
			coroutine.resume(thread, newResult, asnycFactory, indicateUpdate)
			local _discriminator_1 = discriminator
			local _arg1 = {
				lastDependencies = dependencies,
				thread = thread,
				result = newResult,
			}
			storage[_discriminator_1] = _arg1
			return newResult
		end
		local _discriminator_1 = discriminator
		local state = storage[_discriminator_1]
		if equalsDependencies(state.lastDependencies, dependencies) then
			return state.result
		else
			coroutine.yield(state.thread)
			coroutine.close(state.thread)
			local newResult = {
				completed = false,
				value = nil,
			}
			local newThread = coroutine.create(executeThread)
			coroutine.resume(newThread, newResult, asnycFactory, indicateUpdate)
			local _discriminator_2 = discriminator
			local _arg1 = {
				lastDependencies = dependencies,
				thread = newThread,
				result = newResult,
			}
			storage[_discriminator_2] = _arg1
			return newResult
		end
	end
	return withUpdateId(hook)
end
local function createUseImperative(_param)
	local indicateUpdate = _param.indicateUpdate
	local storage = {}
	local hook = function(dirtyFactory, dependencies, discriminator)
		local _discriminator = discriminator
		if not (storage[_discriminator] ~= nil) then
			local _binding = dirtyFactory(indicateUpdate)
			local value = _binding.value
			local cleanup = _binding.cleanup
			local _discriminator_1 = discriminator
			local _arg1 = {
				cache = value,
				cleanup = cleanup,
				lastDependencies = dependencies,
			}
			storage[_discriminator_1] = _arg1
			return value
		end
		local _discriminator_1 = discriminator
		local state = storage[_discriminator_1]
		if equalsDependencies(state.lastDependencies, dependencies) then
			return state.cache
		else
			if state.cleanup ~= nil then
				state.cleanup()
			end
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
			return value
		end
	end
	return withUpdateId(hook)
end
local function createUseChange()
	local dependenciesStorage = {}
	local hook = function(dependencies, discriminator)
		local _discriminator = discriminator
		if not (dependenciesStorage[_discriminator] ~= nil) then
			local _discriminator_1 = discriminator
			local _dependencies = dependencies
			dependenciesStorage[_discriminator_1] = _dependencies
			return true
		end
		local _discriminator_1 = discriminator
		local lastDependencies = dependenciesStorage[_discriminator_1]
		if equalsDependencies(lastDependencies, dependencies) then
			return false
		else
			local _discriminator_2 = discriminator
			local _dependencies = dependencies
			dependenciesStorage[_discriminator_2] = _dependencies
			return true
		end
	end
	return withUpdateId(hook)
end
local function createUseInterval(_param)
	local indicateUpdate = _param.indicateUpdate
	local nextClocks = {}
	local hook = function(seconds, trueOnInit, discriminator)
		local _discriminator = discriminator
		if not (nextClocks[_discriminator] ~= nil) then
			local _discriminator_1 = discriminator
			local _arg1 = os.clock() + seconds
			nextClocks[_discriminator_1] = _arg1
			task.delay(seconds, indicateUpdate)
			return trueOnInit
		end
		local _discriminator_1 = discriminator
		local nextClock = nextClocks[_discriminator_1]
		if nextClock < os.clock() then
			return false
		else
			local _discriminator_2 = discriminator
			local _arg1 = os.clock() + seconds
			nextClocks[_discriminator_2] = _arg1
			task.delay(seconds, indicateUpdate)
			return true
		end
	end
	return withUpdateId(hook)
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
