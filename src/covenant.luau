-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local _jecs = TS.import(script, TS.getModule(script, "@rbxts", "jecs").jecs)
local ChildOf = _jecs.ChildOf
local pair = _jecs.pair
local World = _jecs.World
local _services = TS.import(script, TS.getModule(script, "@rbxts", "services"))
local Players = _services.Players
local RunService = _services.RunService
local createHooks = TS.import(script, script.Parent, "hooks").createHooks
local _stringEnums = TS.import(script, script.Parent, "stringEnums")
local Remove = _stringEnums.Remove
local Delete = _stringEnums.Delete
local _helpers = TS.import(script, script.Parent, "helpers")
local compareMaps = _helpers.compareMaps
local turnArrayWithIdentifierToMap = _helpers.turnArrayWithIdentifierToMap
-- Map<Entity, Delete | Map<Component, state | Remove>>
-- Map<Component, Map<Entity, state | Remove>>
local function createWorldWithRange(minClientEntity, maxClientEntity)
	local world = World.new()
	if RunService:IsClient() then
		world:range(minClientEntity, maxClientEntity)
	end
	if RunService:IsServer() then
		world:range(maxClientEntity)
	end
	return world
end
local Covenant
do
	Covenant = setmetatable({}, {
		__tostring = function()
			return "Covenant"
		end,
	})
	Covenant.__index = Covenant
	function Covenant.new(...)
		local self = setmetatable({}, Covenant)
		return self:constructor(...) or self
	end
	function Covenant:constructor(_param)
		local replicationSend = _param.replicationSend
		local replicationConnect = _param.replicationConnect
		local replicationSendAll = _param.replicationSendAll
		local predictionSend = _param.predictionSend
		local predictionConnect = _param.predictionConnect
		self._world = createWorldWithRange(1000, 20000)
		self.systems = {}
		self.worldChangesForReplication = {}
		self.worldChangesForPrediction = {}
		self.undefinedStringifiedComponents = {}
		self.replicatedStringifiedComponents = {}
		self.predictedStringifiedComponents = {}
		self.started = false
		self.stringifiedComponentSubscribers = {}
		self.stringifiedComponentValidators = {}
		self.replicationSend = replicationSend
		self.replicationConnect = replicationConnect
		self.replicationSendAll = replicationSendAll
		self.predictionSend = predictionSend
		self.predictionConnect = predictionConnect
		self:setupReplication()
		self:setupPrediction()
	end
	function Covenant:setupPredictionClient()
		self:schedule(RunService.Heartbeat, function()
			if next(self.worldChangesForPrediction) == nil then
				return nil
			end
			local currentWorldChanges = self.worldChangesForPrediction
			self.worldChangesForPrediction = {}
			self.predictionSend(currentWorldChanges)
		end, math.huge)
	end
	function Covenant:setupPredictionServer()
		self.predictionConnect(function(player, worldChanges)
			local worldReconciliation = {}
			-- ▼ ReadonlyMap.forEach ▼
			local _callback = function(componentChanges, stringifiedComponent)
				local component = tonumber(stringifiedComponent)
				local _stringifiedComponentValidators = self.stringifiedComponentValidators
				local _stringifiedComponent = stringifiedComponent
				local validator = _stringifiedComponentValidators[_stringifiedComponent]
				if not validator then
					return nil
				end
				-- ▼ ReadonlyMap.forEach ▼
				local _callback_1 = function(state, stringifiedEntity)
					local entity = tonumber(stringifiedEntity)
					if not self:worldContains(entity) then
						return nil
					end
					local newState = if state == Remove then nil else state
					local lastState = self:worldGet(entity, component)
					local valid = validator(player, entity, newState, lastState)
					if valid then
						self:worldSet(entity, component, newState)
					else
						local _stringifiedEntity = stringifiedEntity
						local entityReconciliations = worldReconciliation[_stringifiedEntity]
						local _arg0 = entityReconciliations ~= Delete
						assert(_arg0)
						if entityReconciliations == nil then
							entityReconciliations = {}
							local _stringifiedEntity_1 = stringifiedEntity
							local _entityReconciliations = entityReconciliations
							worldReconciliation[_stringifiedEntity_1] = _entityReconciliations
						end
						local _entityReconciliations = entityReconciliations
						local _exp = stringifiedComponent
						local _condition = self:worldGet(entity, component)
						if _condition == nil then
							_condition = Remove
						end
						_entityReconciliations[_exp] = _condition
					end
				end
				for _k, _v in componentChanges do
					_callback_1(_v, _k, componentChanges)
				end
				-- ▲ ReadonlyMap.forEach ▲
			end
			for _k, _v in worldChanges do
				_callback(_v, _k, worldChanges)
			end
			-- ▲ ReadonlyMap.forEach ▲
			if not (next(worldReconciliation) == nil) then
				self.replicationSend(player, worldReconciliation)
			end
		end)
	end
	function Covenant:setupPrediction()
		if RunService:IsClient() then
			self:setupPredictionClient()
		end
		if RunService:IsServer() then
			self:setupPredictionServer()
		end
	end
	function Covenant:setupRelicationServer()
		self:schedule(RunService.Heartbeat, function()
			if next(self.worldChangesForReplication) == nil then
				return nil
			end
			local currentWorldChanges = self.worldChangesForReplication
			self.worldChangesForReplication = {}
			if self.replicationSendAll ~= nil then
				self.replicationSendAll(currentWorldChanges)
			else
				local _exp = Players:GetPlayers()
				-- ▼ ReadonlyArray.forEach ▼
				local _callback = function(player)
					self.replicationSend(player, currentWorldChanges)
				end
				for _k, _v in _exp do
					_callback(_v, _k - 1, _exp)
				end
				-- ▲ ReadonlyArray.forEach ▲
			end
		end, math.huge)
	end
	function Covenant:setupReplicationPayload()
		Players.PlayerAdded:Connect(function(player)
			task.defer(function()
				if not player:IsDescendantOf(Players) then
					return nil
				end
				local worldPayload = {}
				local _exp = self.replicatedStringifiedComponents
				-- ▼ ReadonlySet.forEach ▼
				local _callback = function(stringifiedComponent)
					local component = tonumber(stringifiedComponent)
					for entity, state in self:worldQuery(component) do
						local _arg0 = tostring(entity)
						local entityData = worldPayload[_arg0]
						if entityData == nil then
							entityData = {}
							local _arg0_1 = tostring(entity)
							local _entityData = entityData
							worldPayload[_arg0_1] = _entityData
						end
						local _arg0_1 = entityData ~= Delete
						assert(_arg0_1)
						local _entityData = entityData
						local _stringifiedComponent = stringifiedComponent
						_entityData[_stringifiedComponent] = state
					end
				end
				for _v in _exp do
					_callback(_v, _v, _exp)
				end
				-- ▲ ReadonlySet.forEach ▲
				self.replicationSend(player, worldPayload)
			end)
		end)
	end
	function Covenant:setupReplicationClient()
		self.replicationConnect(function(worldChanges)
			-- ▼ ReadonlyMap.forEach ▼
			local _callback = function(entityData, stringifiedEntity)
				local entity = tonumber(stringifiedEntity)
				if entityData == Delete then
					self:worldDelete(entity)
					return nil
				end
				-- ▼ ReadonlyMap.forEach ▼
				local _callback_1 = function(state, stringifiedComponent)
					local component = tonumber(stringifiedComponent)
					if state == Remove then
						self:worldSet(entity, component, nil, true)
					else
						self:worldSet(entity, component, state, true)
					end
				end
				for _k, _v in entityData do
					_callback_1(_v, _k, entityData)
				end
				-- ▲ ReadonlyMap.forEach ▲
			end
			for _k, _v in worldChanges do
				_callback(_v, _k, worldChanges)
			end
			-- ▲ ReadonlyMap.forEach ▲
		end)
	end
	function Covenant:setupReplication()
		if RunService:IsServer() then
			self:setupRelicationServer()
			self:setupReplicationPayload()
		end
		if RunService:IsClient() then
			self:setupReplicationClient()
		end
	end
	function Covenant:start()
		local _arg0 = not self.started
		assert(_arg0, "Already started")
		local _exp = next(self.undefinedStringifiedComponents) == nil
		-- ▼ ReadonlySet.size ▼
		local _size = 0
		for _ in self.undefinedStringifiedComponents do
			_size += 1
		end
		-- ▲ ReadonlySet.size ▲
		local _arg1 = `There are {_size} components that are not defined`
		assert(_exp, _arg1)
		self.started = true
		local _exp_1 = self.systems
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(systemsOfEvent, event)
			local _systems = self.systems
			local _exp_2 = event
			table.sort(systemsOfEvent, function(a, b)
				return a.priority < b.priority
			end)
			local _systemsOfEvent = systemsOfEvent
			_systems[_exp_2] = _systemsOfEvent
			return _systems
		end
		for _k, _v in _exp_1 do
			_callback(_v, _k, _exp_1)
		end
		-- ▲ ReadonlyMap.forEach ▲
		local _exp_2 = self.systems
		-- ▼ ReadonlyMap.forEach ▼
		local _callback_1 = function(systemsOfEvent, event)
			event:Connect(function()
				-- ▼ ReadonlyArray.forEach ▼
				local _callback_2 = function(_param)
					local system = _param.system
					system()
				end
				for _k, _v in systemsOfEvent do
					_callback_2(_v, _k - 1, systemsOfEvent)
				end
				-- ▲ ReadonlyArray.forEach ▲
			end)
		end
		for _k, _v in _exp_2 do
			_callback_1(_v, _k, _exp_2)
		end
		-- ▲ ReadonlyMap.forEach ▲
	end
	function Covenant:schedule(event, system, priority)
		if priority == nil then
			priority = 0
		end
		local _arg0 = not self.started
		assert(_arg0, "Attempted to schedule system after starting")
		local _systems = self.systems
		local _event = event
		local systemsOfEvent = _systems[_event]
		if systemsOfEvent == nil then
			systemsOfEvent = {}
			local _systems_1 = self.systems
			local _event_1 = event
			local _systemsOfEvent = systemsOfEvent
			_systems_1[_event_1] = _systemsOfEvent
		end
		local _systemsOfEvent = systemsOfEvent
		local _arg0_1 = {
			system = system,
			priority = priority,
		}
		table.insert(_systemsOfEvent, _arg0_1)
	end
	function Covenant:worldSet(entity, component, newState, doNotReconcile)
		if doNotReconcile == nil then
			doNotReconcile = false
		end
		if not self:worldContains(entity) then
			self._world:entity(entity)
		end
		local lastState = self:worldGet(entity, component)
		if newState == lastState then
			return nil
		end
		if newState == nil then
			self._world:remove(entity, component)
		else
			self._world:set(entity, component, newState)
		end
		local _stringifiedComponentSubscribers = self.stringifiedComponentSubscribers
		local _arg0 = tostring(component)
		local _result = _stringifiedComponentSubscribers[_arg0]
		if _result ~= nil then
			-- ▼ ReadonlySet.forEach ▼
			local _callback = function(subscriber)
				subscriber(entity, newState, lastState)
			end
			for _v in _result do
				_callback(_v, _v, _result)
			end
			-- ▲ ReadonlySet.forEach ▲
		end
		if doNotReconcile then
			return nil
		end
		local _replicatedStringifiedComponents = self.replicatedStringifiedComponents
		local _arg0_1 = tostring(component)
		if _replicatedStringifiedComponents[_arg0_1] ~= nil then
			local _worldChangesForReplication = self.worldChangesForReplication
			local _arg0_2 = tostring(entity)
			local entityChanges = _worldChangesForReplication[_arg0_2]
			if entityChanges == nil then
				entityChanges = {}
				local _worldChangesForReplication_1 = self.worldChangesForReplication
				local _arg0_3 = tostring(entity)
				local _entityChanges = entityChanges
				_worldChangesForReplication_1[_arg0_3] = _entityChanges
			end
			if entityChanges ~= Delete then
				local _entityChanges = entityChanges
				local _exp = tostring(component)
				local _condition = newState
				if _condition == nil then
					_condition = Remove
				end
				_entityChanges[_exp] = _condition
			end
		end
		local _condition = RunService:IsClient()
		if _condition then
			local _predictedStringifiedComponents = self.predictedStringifiedComponents
			local _arg0_2 = tostring(component)
			_condition = _predictedStringifiedComponents[_arg0_2] ~= nil
		end
		if _condition then
			local _worldChangesForPrediction = self.worldChangesForPrediction
			local _arg0_2 = tostring(component)
			local componentChanges = _worldChangesForPrediction[_arg0_2]
			if componentChanges == nil then
				componentChanges = {}
				local _worldChangesForPrediction_1 = self.worldChangesForPrediction
				local _arg0_3 = tostring(component)
				local _componentChanges = componentChanges
				_worldChangesForPrediction_1[_arg0_3] = _componentChanges
			end
			local _componentChanges = componentChanges
			local _exp = tostring(entity)
			local _condition_1 = newState
			if _condition_1 == nil then
				_condition_1 = Remove
			end
			_componentChanges[_exp] = _condition_1
		end
	end
	function Covenant:subscribeComponent(component, subscriber)
		local _stringifiedComponentSubscribers = self.stringifiedComponentSubscribers
		local _arg0 = tostring(component)
		local subscribers = _stringifiedComponentSubscribers[_arg0]
		if subscribers == nil then
			subscribers = {}
			local _stringifiedComponentSubscribers_1 = self.stringifiedComponentSubscribers
			local _arg0_1 = tostring(component)
			local _subscribers = subscribers
			_stringifiedComponentSubscribers_1[_arg0_1] = _subscribers
		end
		local subscriberElement = subscriber
		subscribers[subscriberElement] = true
		return function()
			subscribers[subscriberElement] = nil
		end
	end
	function Covenant:worldDelete(entity)
		if not self:worldContains(entity) then
			return nil
		end
		local toDelete = { entity }
		local processed = {}
		while #toDelete > 0 do
			-- ▼ Array.pop ▼
			local _length = #toDelete
			local _result = toDelete[_length]
			toDelete[_length] = nil
			-- ▲ Array.pop ▲
			local currentEntity = _result
			if processed[currentEntity] ~= nil or not self:worldContains(currentEntity) then
				continue
			end
			processed[currentEntity] = true
			for childEntity in self:worldQuery(pair(ChildOf, currentEntity)) do
				table.insert(toDelete, childEntity)
			end
		end
		-- ▼ ReadonlySet.forEach ▼
		local _callback = function(entityToDelete)
			self._world:delete(entityToDelete)
			local _worldChangesForReplication = self.worldChangesForReplication
			local _arg0 = tostring(entityToDelete)
			_worldChangesForReplication[_arg0] = Delete
		end
		for _v in processed do
			_callback(_v, _v, processed)
		end
		-- ▲ ReadonlySet.forEach ▲
	end
	function Covenant:worldComponent()
		local c = self._world:component()
		return c
	end
	function Covenant:checkComponentDefined(component)
		local _undefinedStringifiedComponents = self.undefinedStringifiedComponents
		local _arg0 = tostring(component)
		local _arg0_1 = _undefinedStringifiedComponents[_arg0] ~= nil
		local _arg1 = `Component {component} is already defined`
		assert(_arg0_1, _arg1)
		local _undefinedStringifiedComponents_1 = self.undefinedStringifiedComponents
		local _arg0_2 = tostring(component)
		_undefinedStringifiedComponents_1[_arg0_2] = nil
	end
	function Covenant:defineComponentNetworkBehavior(component, replicated, predictionValidator)
		if replicated then
			local _replicatedStringifiedComponents = self.replicatedStringifiedComponents
			local _arg0 = tostring(component)
			_replicatedStringifiedComponents[_arg0] = true
		end
		if predictionValidator then
			local _predictedStringifiedComponents = self.predictedStringifiedComponents
			local _arg0 = tostring(component)
			_predictedStringifiedComponents[_arg0] = true
			local _stringifiedComponentValidators = self.stringifiedComponentValidators
			local _arg0_1 = tostring(component)
			local _predictionValidator = predictionValidator
			_stringifiedComponentValidators[_arg0_1] = _predictionValidator
		end
	end
	function Covenant:defineComputedComponent(_param)
		local component = _param.component
		local queriedComponents = _param.queriedComponents
		local recipe = _param.recipe
		local replicated = _param.replicated
		local predictionValidator = _param.predictionValidator
		self:checkComponentDefined(component)
		self:defineComponentNetworkBehavior(component, replicated, predictionValidator)
		local queryThisComponent = self:worldQuery(component):cached()
		local willUpdate = true
		local function indicateUpdate()
			willUpdate = true
		end
		local hooks = createHooks({
			indicateUpdate = indicateUpdate,
			subscribeComponent = function(component, subscriber)
				self:subscribeComponent(component, subscriber)
			end,
		})
		-- ▼ ReadonlyArray.map ▼
		local _newValue = table.create(#queriedComponents)
		local _callback = function(components)
			return self:worldQuery(unpack(components)):cached()
		end
		for _k, _v in queriedComponents do
			_newValue[_k] = _callback(_v, _k - 1, queriedComponents)
		end
		-- ▲ ReadonlyArray.map ▲
		local queries = _newValue
		local _array = {}
		local _length = #_array
		-- ▼ ReadonlyArray.reduce ▼
		local _result = {}
		local _callback_1 = function(accum, components)
			-- ▼ ReadonlyArray.forEach ▼
			local _callback_2 = function(component)
				local stringifiedComponent = tostring(component)
				accum[stringifiedComponent] = true
			end
			for _k, _v in components do
				_callback_2(_v, _k - 1, components)
			end
			-- ▲ ReadonlyArray.forEach ▲
			return accum
		end
		for _i = 1, #queriedComponents do
			_result = _callback_1(_result, queriedComponents[_i], _i - 1, queriedComponents)
		end
		-- ▲ ReadonlyArray.reduce ▲
		for _v in _result do
			_length += 1
			_array[_length] = _v
		end
		-- ▼ ReadonlyArray.map ▼
		local _newValue_1 = table.create(#_array)
		local _callback_2 = function(stringifiedComponent)
			return tonumber(stringifiedComponent)
		end
		for _k, _v in _array do
			_newValue_1[_k] = _callback_2(_v, _k - 1, _array)
		end
		-- ▲ ReadonlyArray.map ▲
		-- ▼ ReadonlyArray.forEach ▼
		local _callback_3 = function(component)
			self:subscribeComponent(component, indicateUpdate)
		end
		for _k, _v in _newValue_1 do
			_callback_3(_v, _k - 1, _newValue_1)
		end
		-- ▲ ReadonlyArray.forEach ▲
		local lastUpdateId = 0
		local updater = function()
			lastUpdateId += 1
			local updateId = lastUpdateId
			local unhandledStringifiedEntities = {}
			local handledStringifiedEntities = {}
			for entity in queryThisComponent do
				local _arg0 = tostring(entity)
				unhandledStringifiedEntities[_arg0] = true
			end
			-- ▼ ReadonlyArray.forEach ▼
			local _callback_4 = function(query)
				for entity in query do
					local stringifiedEntity = tostring(entity)
					if handledStringifiedEntities[stringifiedEntity] ~= nil then
						continue
					end
					handledStringifiedEntities[stringifiedEntity] = true
					unhandledStringifiedEntities[stringifiedEntity] = nil
					local lastState = self:worldGet(entity, component)
					local newState = recipe(entity, lastState, updateId, hooks)
					self:worldSet(entity, component, newState)
				end
			end
			for _k, _v in queries do
				_callback_4(_v, _k - 1, queries)
			end
			-- ▲ ReadonlyArray.forEach ▲
			-- ▼ ReadonlySet.forEach ▼
			local _callback_5 = function(stringifiedEntity)
				local entity = tonumber(stringifiedEntity)
				self:worldSet(entity, component, nil)
			end
			for _v in unhandledStringifiedEntities do
				_callback_5(_v, _v, unhandledStringifiedEntities)
			end
			-- ▲ ReadonlySet.forEach ▲
		end
		self:schedule(RunService.Heartbeat, function()
			if not willUpdate then
				return nil
			end
			willUpdate = false
			updater()
		end)
	end
	function Covenant:defineManagedChildren(_param)
		local parentComponent = _param.parentComponent
		local parentEntityTrackerComponent = _param.parentEntityTrackerComponent
		local childIdentityComponent = _param.childIdentityComponent
		local getIdentifier = _param.getIdentifier
		local queriedComponents = _param.queriedComponents
		local recipe = _param.recipe
		local replicated = _param.replicated
		local predictionValidator = _param.predictionValidator
		self:checkComponentDefined(parentComponent)
		self:checkComponentDefined(parentEntityTrackerComponent)
		self:checkComponentDefined(childIdentityComponent)
		self:defineComponentNetworkBehavior(parentComponent, replicated, predictionValidator)
		local queryParentComponent = self:worldQuery(parentComponent):cached()
		local willUpdate = true
		local function indicateUpdate()
			willUpdate = true
		end
		local hooks = createHooks({
			indicateUpdate = indicateUpdate,
			subscribeComponent = function(component, subscriber)
				self:subscribeComponent(component, subscriber)
			end,
		})
		-- ▼ ReadonlyArray.map ▼
		local _newValue = table.create(#queriedComponents)
		local _callback = function(components)
			return self:worldQuery(unpack(components)):cached()
		end
		for _k, _v in queriedComponents do
			_newValue[_k] = _callback(_v, _k - 1, queriedComponents)
		end
		-- ▲ ReadonlyArray.map ▲
		local queries = _newValue
		local _array = {}
		local _length = #_array
		-- ▼ ReadonlyArray.reduce ▼
		local _result = {}
		local _callback_1 = function(accum, components)
			-- ▼ ReadonlyArray.forEach ▼
			local _callback_2 = function(component)
				local stringifiedComponent = tostring(component)
				accum[stringifiedComponent] = true
			end
			for _k, _v in components do
				_callback_2(_v, _k - 1, components)
			end
			-- ▲ ReadonlyArray.forEach ▲
			return accum
		end
		for _i = 1, #queriedComponents do
			_result = _callback_1(_result, queriedComponents[_i], _i - 1, queriedComponents)
		end
		-- ▲ ReadonlyArray.reduce ▲
		for _v in _result do
			_length += 1
			_array[_length] = _v
		end
		-- ▼ ReadonlyArray.map ▼
		local _newValue_1 = table.create(#_array)
		local _callback_2 = function(stringifiedComponent)
			return tonumber(stringifiedComponent)
		end
		for _k, _v in _array do
			_newValue_1[_k] = _callback_2(_v, _k - 1, _array)
		end
		-- ▲ ReadonlyArray.map ▲
		-- ▼ ReadonlyArray.forEach ▼
		local _callback_3 = function(component)
			self:subscribeComponent(component, indicateUpdate)
		end
		for _k, _v in _newValue_1 do
			_callback_3(_v, _k - 1, _newValue_1)
		end
		-- ▲ ReadonlyArray.forEach ▲
		local lastUpdateId = 0
		local updater = function()
			lastUpdateId += 1
			local updateId = lastUpdateId
			local unhandledStringifiedEntities = {}
			local handledStringifiedEntities = {}
			for entity in queryParentComponent do
				local _arg0 = tostring(entity)
				unhandledStringifiedEntities[_arg0] = true
			end
			-- ▼ ReadonlyArray.forEach ▼
			local _callback_4 = function(query)
				for entity in query do
					local stringifiedEntity = tostring(entity)
					if handledStringifiedEntities[stringifiedEntity] ~= nil then
						continue
					end
					handledStringifiedEntities[stringifiedEntity] = true
					unhandledStringifiedEntities[stringifiedEntity] = nil
					local entityTracker = self:worldGet(entity, parentEntityTrackerComponent)
					if entityTracker == nil then
						entityTracker = {}
						self:worldSet(entity, parentEntityTrackerComponent, entityTracker)
					end
					local lastState = self:worldGet(entity, parentComponent) or {}
					local newState = recipe(entity, lastState, updateId, hooks)
					self:worldSet(entity, parentComponent, newState)
					local lastStateMap = turnArrayWithIdentifierToMap(lastState, getIdentifier)
					local newStateMap = turnArrayWithIdentifierToMap(newState, getIdentifier)
					local _binding = compareMaps(lastStateMap, newStateMap)
					local entriesChanged = _binding.entriesChanged
					local entriesAdded = _binding.entriesAdded
					local keysRemoved = _binding.keysRemoved
					-- ▼ ReadonlyArray.forEach ▼
					local _callback_5 = function(_param_1)
						local key = _param_1.key
						local value = _param_1.value
						local childEntity = self:worldEntity()
						entityTracker[key] = childEntity
						self:worldSet(childEntity, childIdentityComponent, value)
						self._world:add(childEntity, pair(ChildOf, entity))
					end
					for _k, _v in entriesAdded do
						_callback_5(_v, _k - 1, entriesAdded)
					end
					-- ▲ ReadonlyArray.forEach ▲
					-- ▼ ReadonlyArray.forEach ▼
					local _callback_6 = function(_param_1)
						local key = _param_1.key
						local value = _param_1.value
						local childEntity = entityTracker[key]
						assert(childEntity ~= 0 and childEntity == childEntity and childEntity)
						local _arg0 = self:worldContains(childEntity)
						assert(_arg0)
						self:worldSet(childEntity, childIdentityComponent, value)
					end
					for _k, _v in entriesChanged do
						_callback_6(_v, _k - 1, entriesChanged)
					end
					-- ▲ ReadonlyArray.forEach ▲
					-- ▼ ReadonlyArray.forEach ▼
					local _callback_7 = function(key)
						local _entityTracker = entityTracker
						local _key = key
						local childEntity = _entityTracker[_key]
						assert(childEntity ~= 0 and childEntity == childEntity and childEntity)
						local _arg0 = self:worldContains(childEntity)
						assert(_arg0)
						self:worldDelete(childEntity)
						local _entityTracker_1 = entityTracker
						local _key_1 = key
						_entityTracker_1[_key_1] = nil
					end
					for _k, _v in keysRemoved do
						_callback_7(_v, _k - 1, keysRemoved)
					end
					-- ▲ ReadonlyArray.forEach ▲
				end
			end
			for _k, _v in queries do
				_callback_4(_v, _k - 1, queries)
			end
			-- ▲ ReadonlyArray.forEach ▲
			-- ▼ ReadonlySet.forEach ▼
			local _callback_5 = function(stringifiedEntity)
				local entity = tonumber(stringifiedEntity)
				local children = self:worldGet(entity, parentEntityTrackerComponent)
				if children ~= nil then
					-- ▼ ReadonlyMap.forEach ▼
					local _callback_6 = function(childEntity)
						self:worldDelete(childEntity)
					end
					for _k, _v in children do
						_callback_6(_v, _k, children)
					end
					-- ▲ ReadonlyMap.forEach ▲
				end
				self:worldSet(entity, parentComponent, nil)
				self:worldSet(entity, parentEntityTrackerComponent, nil)
			end
			for _v in unhandledStringifiedEntities do
				_callback_5(_v, _v, unhandledStringifiedEntities)
			end
			-- ▲ ReadonlySet.forEach ▲
		end
		self:schedule(RunService.Heartbeat, function()
			if not willUpdate then
				return nil
			end
			willUpdate = false
			updater()
		end)
	end
	function Covenant:defineEntitySource(_param)
		local identityComponent = _param.identityComponent
		local recipe = _param.recipe
		local replicated = _param.replicated
		self:checkComponentDefined(identityComponent)
		self:defineComponentNetworkBehavior(identityComponent, replicated, false)
		local willUpdate = true
		local function indicateUpdate()
			willUpdate = true
		end
		local hooks = createHooks({
			indicateUpdate = indicateUpdate,
			subscribeComponent = function(component, subscriber)
				self:subscribeComponent(component, subscriber)
			end,
		})
		local lastUpdateId = 0
		local updater = function()
			lastUpdateId += 1
			local _binding = recipe(lastUpdateId, hooks)
			local statesToCreate = _binding.statesToCreate
			local entitiesToDelete = _binding.entitiesToDelete
			local _result = statesToCreate
			if _result ~= nil then
				-- ▼ ReadonlyArray.forEach ▼
				local _callback = function(state)
					local entity = self:worldEntity()
					self:worldSet(entity, identityComponent, state)
				end
				for _k, _v in _result do
					_callback(_v, _k - 1, _result)
				end
				-- ▲ ReadonlyArray.forEach ▲
			end
			local _result_1 = entitiesToDelete
			if _result_1 ~= nil then
				-- ▼ ReadonlyArray.forEach ▼
				local _callback = function(entity)
					self:worldDelete(entity)
				end
				for _k, _v in _result_1 do
					_callback(_v, _k - 1, _result_1)
				end
				-- ▲ ReadonlyArray.forEach ▲
			end
		end
		self:schedule(RunService.Heartbeat, function()
			if not willUpdate then
				return nil
			end
			willUpdate = false
			updater()
		end)
	end
	function Covenant:worldEntity()
		return self._world:entity()
	end
	function Covenant:worldQuery(...)
		local components = { ... }
		return self._world:query(unpack(components))
	end
	function Covenant:worldHas(entity, ...)
		local components = { ... }
		return self._world:has(entity, unpack(components))
	end
	function Covenant:worldGet(entity, ...)
		local components = { ... }
		return self._world:get(entity, unpack(components))
	end
	function Covenant:worldContains(entity)
		return self._world:contains(entity)
	end
end
return {
	Covenant = Covenant,
}
