-- Compiled with roblox-ts v3.0.0
local TS = _G[script]
local exports = {}
local world = TS.import(script, TS.getModule(script, "@rbxts", "jecs").jecs).world
local _services = TS.import(script, TS.getModule(script, "@rbxts", "services"))
local Players = _services.Players
local RunService = _services.RunService
local createHooks = TS.import(script, script.Parent, "hooks").createHooks
local _stringEnums = TS.import(script, script.Parent, "stringEnums")
local Remove = _stringEnums.Remove
local Delete = _stringEnums.Delete
local EventMap = TS.import(script, script.Parent, "dataStructureWithEvents").EventMap
local tableToString = TS.import(script, script.Parent, "tableToString").tableToString
local BIG_PRIORITY = 10000000
for _k, _v in TS.import(script, TS.getModule(script, "@rbxts", "jecs").jecs) or {} do
	exports[_k] = _v
end
-- Map<Entity, Delete | Map<Component, state | Remove>>
-- Map<Component, Map<Entity, state | Remove>>
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
		local logging = _param.logging
		local requestPayloadSend = _param.requestPayloadSend
		local requestPayloadConnect = _param.requestPayloadConnect
		local replicationSend = _param.replicationSend
		local replicationConnect = _param.replicationConnect
		local replicationSendAll = _param.replicationSendAll
		local predictionSend = _param.predictionSend
		local predictionConnect = _param.predictionConnect
		self._world = world()
		self.systems = EventMap.new()
		self.worldChangesForReplication = {}
		self.worldChangesForPrediction = {}
		self.stringfiedComponents = {}
		self.undefinedStringifiedComponents = {}
		self.replicatedStringifiedComponents = {}
		self.predictedStringifiedComponents = {}
		self.loggingStringfiedComponents = {}
		self.stringfiedComponentsToNameMap = {}
		self.started = false
		self.stringifiedComponentSubscribers = {}
		self.stringifiedComponentValidators = {}
		self.clientToServerEntityMap = {}
		self.serverToClientEntityMap = {}
		self.loggingOption = logging
		self.requestPayloadSend = requestPayloadSend
		self.requestPayloadConnect = requestPayloadConnect
		self.replicationSend = replicationSend
		self.replicationConnect = replicationConnect
		self.replicationSendAll = replicationSendAll
		self.predictionSend = predictionSend
		self.predictionConnect = predictionConnect
		self:setupReplication()
		self:setupPrediction()
	end
	function Covenant:getClientEntity(entity)
		local _serverToClientEntityMap = self.serverToClientEntityMap
		local _arg0 = tostring(entity)
		return _serverToClientEntityMap[_arg0]
	end
	function Covenant:getServerEntity(entity)
		local _clientToServerEntityMap = self.clientToServerEntityMap
		local _arg0 = tostring(entity)
		return _clientToServerEntityMap[_arg0]
	end
	function Covenant:setupPredictionClient()
		self:schedule(RunService.Heartbeat, function()
			if next(self.worldChangesForPrediction) == nil then
				return nil
			end
			local currentWorldChanges = self.worldChangesForPrediction
			self.worldChangesForPrediction = {}
			self.predictionSend(currentWorldChanges)
		end, BIG_PRIORITY + 1)
	end
	function Covenant:forEachComponentChanges(player, worldReconciliation, componentChanges, stringifiedComponent)
		local component = tonumber(stringifiedComponent)
		local _stringifiedComponentValidators = self.stringifiedComponentValidators
		local _stringifiedComponent = stringifiedComponent
		local validator = _stringifiedComponentValidators[_stringifiedComponent]
		if not validator then
			return nil
		end
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(state, stringifiedEntity)
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
				local _worldReconciliation = worldReconciliation
				local _stringifiedEntity = stringifiedEntity
				local entityReconciliations = _worldReconciliation[_stringifiedEntity]
				local _arg0 = entityReconciliations ~= Delete
				assert(_arg0)
				if entityReconciliations == nil then
					entityReconciliations = {}
					local _worldReconciliation_1 = worldReconciliation
					local _stringifiedEntity_1 = stringifiedEntity
					local _entityReconciliations = entityReconciliations
					_worldReconciliation_1[_stringifiedEntity_1] = _entityReconciliations
				end
				local _entityReconciliations = entityReconciliations
				local _stringifiedComponent_1 = stringifiedComponent
				local _arg1 = if self:worldHas(entity, component) then self:worldGet(entity, component) else Remove
				_entityReconciliations[_stringifiedComponent_1] = _arg1
			end
		end
		for _k, _v in componentChanges do
			_callback(_v, _k, componentChanges)
		end
		-- ▲ ReadonlyMap.forEach ▲
	end
	function Covenant:setupPredictionServer()
		local changes = {}
		self.predictionConnect(function(player, worldChanges)
			local _arg0 = { player, worldChanges }
			table.insert(changes, _arg0)
		end)
		self:schedule(RunService.Heartbeat, function()
			if #changes == 0 then
				return nil
			end
			-- ▼ ReadonlyArray.forEach ▼
			local _callback = function(_param)
				local player = _param[1]
				local worldChanges = _param[2]
				local worldReconciliation = {}
				-- ▼ ReadonlyMap.forEach ▼
				local _callback_1 = function(componentChanges, stringifiedComponent)
					self:forEachComponentChanges(player, worldReconciliation, componentChanges, stringifiedComponent)
				end
				for _k, _v in worldChanges do
					_callback_1(_v, _k, worldChanges)
				end
				-- ▲ ReadonlyMap.forEach ▲
				if not (next(worldReconciliation) == nil) then
					self.replicationSend(player, worldReconciliation)
				end
			end
			for _k, _v in changes do
				_callback(_v, _k - 1, changes)
			end
			-- ▲ ReadonlyArray.forEach ▲
			table.clear(changes)
		end, BIG_PRIORITY)
	end
	function Covenant:setupPrediction()
		if RunService:IsClient() then
			self:setupPredictionClient()
		end
		if RunService:IsServer() then
			self:setupPredictionServer()
		end
	end
	function Covenant:setupReplicationServer()
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
		end, BIG_PRIORITY + 1)
	end
	function Covenant:setupReplicationPayload()
		self.requestPayloadConnect(function(player)
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
		local changes = {}
		self.replicationConnect(function(worldChanges)
			local _worldChanges = worldChanges
			table.insert(changes, _worldChanges)
		end)
		self:schedule(RunService.Heartbeat, function()
			if #changes == 0 then
				return nil
			end
			-- ▼ ReadonlyArray.forEach ▼
			local _callback = function(worldChanges)
				-- ▼ ReadonlyMap.forEach ▼
				local _callback_1 = function(entityData, stringifiedServerEntity)
					local _serverToClientEntityMap = self.serverToClientEntityMap
					local _stringifiedServerEntity = stringifiedServerEntity
					local entity = _serverToClientEntityMap[_stringifiedServerEntity]
					if entityData == Delete then
						if entity ~= nil then
							self:worldDelete(entity)
						end
						local _serverToClientEntityMap_1 = self.serverToClientEntityMap
						local _stringifiedServerEntity_1 = stringifiedServerEntity
						_serverToClientEntityMap_1[_stringifiedServerEntity_1] = nil
						local _clientToServerEntityMap = self.clientToServerEntityMap
						local _arg0 = tostring(entity)
						_clientToServerEntityMap[_arg0] = nil
						return nil
					end
					if entity == nil then
						entity = self._world:entity()
						local _serverToClientEntityMap_1 = self.serverToClientEntityMap
						local _stringifiedServerEntity_1 = stringifiedServerEntity
						local _entity = entity
						_serverToClientEntityMap_1[_stringifiedServerEntity_1] = _entity
						local _clientToServerEntityMap = self.clientToServerEntityMap
						local _arg0 = tostring(entity)
						local _arg1 = tonumber(stringifiedServerEntity)
						_clientToServerEntityMap[_arg0] = _arg1
					end
					-- ▼ ReadonlyMap.forEach ▼
					local _callback_2 = function(state, stringifiedComponent)
						local component = tonumber(stringifiedComponent)
						if state == Remove then
							self:worldSet(entity, component, nil, true)
						else
							self:worldSet(entity, component, state, true)
						end
					end
					for _k, _v in entityData do
						_callback_2(_v, _k, entityData)
					end
					-- ▲ ReadonlyMap.forEach ▲
				end
				for _k, _v in worldChanges do
					_callback_1(_v, _k, worldChanges)
				end
				-- ▲ ReadonlyMap.forEach ▲
			end
			for _k, _v in changes do
				_callback(_v, _k - 1, changes)
			end
			-- ▲ ReadonlyArray.forEach ▲
			table.clear(changes)
		end, BIG_PRIORITY)
	end
	function Covenant:setupReplication()
		if RunService:IsServer() then
			self:setupReplicationServer()
			self:setupReplicationPayload()
		end
		if RunService:IsClient() then
			self:setupReplicationClient()
		end
	end
	function Covenant:start()
		local _arg0 = not self.started
		assert(_arg0, "Already started")
		if not (next(self.undefinedStringifiedComponents) == nil) then
			-- ▼ ReadonlySet.size ▼
			local _size = 0
			for _ in self.undefinedStringifiedComponents do
				_size += 1
			end
			-- ▲ ReadonlySet.size ▲
			warn(`There are {_size} components that are not defined`)
		end
		self.started = true
		self.systems:forEach(function(systemsOfEvent, event)
			local _systems = self.systems
			local _exp = event
			table.sort(systemsOfEvent, function(a, b)
				return a.priority < b.priority
			end)
			return _systems:set(_exp, systemsOfEvent)
		end)
		self.systems:forEach(function(systemsOfEvent, event)
			event:Connect(function()
				-- ▼ ReadonlyArray.forEach ▼
				local _callback = function(_param)
					local system = _param.system
					system()
				end
				for _k, _v in systemsOfEvent do
					_callback(_v, _k - 1, systemsOfEvent)
				end
				-- ▲ ReadonlyArray.forEach ▲
			end)
		end)
		if RunService:IsClient() then
			self.requestPayloadSend()
		end
	end
	function Covenant:preventPostStartCall()
		local _arg0 = not self.started
		assert(_arg0, "Attempted to schedule system after starting")
	end
	function Covenant:schedule(event, system, priority)
		if priority == nil then
			priority = 0
		end
		self:preventPostStartCall()
		local systemsOfEvent = self.systems:get(event)
		if systemsOfEvent == nil then
			systemsOfEvent = {}
			self.systems:set(event, systemsOfEvent)
		end
		local _systemsOfEvent = systemsOfEvent
		local _arg0 = {
			system = system,
			priority = priority,
		}
		table.insert(_systemsOfEvent, _arg0)
	end
	function Covenant:worldSet(entity, component, newState, doNotReconcile)
		if doNotReconcile == nil then
			doNotReconcile = false
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
		local _condition = RunService:IsStudio() and self.loggingOption ~= "FORCE_OFF"
		if _condition then
			local _condition_1 = self.loggingOption == "FORCE_ON"
			if not _condition_1 then
				local _loggingStringfiedComponents = self.loggingStringfiedComponents
				local _arg0 = tostring(component)
				_condition_1 = _loggingStringfiedComponents[_arg0] ~= nil
			end
			_condition = _condition_1
		end
		if _condition then
			print(`{self:getComponentName(component)}.{entity}.[{if doNotReconcile then "remote" else "local"}]:{tableToString(lastState)}->{tableToString(newState)}`)
		end
		local _stringifiedComponentSubscribers = self.stringifiedComponentSubscribers
		local _arg0 = tostring(component)
		local _result = _stringifiedComponentSubscribers[_arg0]
		if _result ~= nil then
			-- ▼ ReadonlySet.forEach ▼
			local _callback = function(subscriber)
				subscriber(entity, newState, lastState, false)
			end
			for _v in _result do
				_callback(_v, _v, _result)
			end
			-- ▲ ReadonlySet.forEach ▲
		end
		if doNotReconcile then
			return nil
		end
		local _condition_1 = RunService:IsServer()
		if _condition_1 then
			local _replicatedStringifiedComponents = self.replicatedStringifiedComponents
			local _arg0_1 = tostring(component)
			_condition_1 = _replicatedStringifiedComponents[_arg0_1] ~= nil
		end
		if _condition_1 then
			local _worldChangesForReplication = self.worldChangesForReplication
			local _arg0_1 = tostring(entity)
			local entityChanges = _worldChangesForReplication[_arg0_1]
			if entityChanges == nil then
				entityChanges = {}
				local _worldChangesForReplication_1 = self.worldChangesForReplication
				local _arg0_2 = tostring(entity)
				local _entityChanges = entityChanges
				_worldChangesForReplication_1[_arg0_2] = _entityChanges
			end
			if entityChanges ~= Delete then
				local _entityChanges = entityChanges
				local _arg0_2 = tostring(component)
				local _arg1 = if newState ~= nil then newState else Remove
				_entityChanges[_arg0_2] = _arg1
			end
		end
		local _condition_2 = RunService:IsClient()
		if _condition_2 then
			local _predictedStringifiedComponents = self.predictedStringifiedComponents
			local _arg0_1 = tostring(component)
			_condition_2 = _predictedStringifiedComponents[_arg0_1] ~= nil
		end
		if _condition_2 then
			local _worldChangesForPrediction = self.worldChangesForPrediction
			local _arg0_1 = tostring(component)
			local componentChanges = _worldChangesForPrediction[_arg0_1]
			if componentChanges == nil then
				componentChanges = {}
				local _worldChangesForPrediction_1 = self.worldChangesForPrediction
				local _arg0_2 = tostring(component)
				local _componentChanges = componentChanges
				_worldChangesForPrediction_1[_arg0_2] = _componentChanges
			end
			local _clientToServerEntityMap = self.clientToServerEntityMap
			local _arg0_2 = tostring(entity)
			local serverEntity = _clientToServerEntityMap[_arg0_2]
			if serverEntity ~= nil then
				local _componentChanges = componentChanges
				local _arg0_3 = tostring(serverEntity)
				local _arg1 = if newState ~= nil then newState else Remove
				_componentChanges[_arg0_3] = _arg1
			end
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
		local _exp = self.stringfiedComponents
		-- ▼ ReadonlySet.forEach ▼
		local _callback = function(cString)
			local c = tonumber(cString)
			if self:worldHas(entity, c) then
				local lastState = self:worldGet(entity, c)
				local _stringifiedComponentSubscribers = self.stringifiedComponentSubscribers
				local _arg0 = tostring(c)
				local _result = _stringifiedComponentSubscribers[_arg0]
				if _result ~= nil then
					-- ▼ ReadonlySet.forEach ▼
					local _callback_1 = function(subscriber)
						subscriber(entity, nil, lastState, true)
					end
					for _v in _result do
						_callback_1(_v, _v, _result)
					end
					-- ▲ ReadonlySet.forEach ▲
				end
			end
		end
		for _v in _exp do
			_callback(_v, _v, _exp)
		end
		-- ▲ ReadonlySet.forEach ▲
		self._world:delete(entity)
		if RunService:IsServer() then
			local _worldChangesForReplication = self.worldChangesForReplication
			local _arg0 = tostring(entity)
			_worldChangesForReplication[_arg0] = Delete
		end
	end
	function Covenant:worldComponent(name)
		self:preventPostStartCall()
		local c = self._world:component()
		local cStr = tostring(c)
		local _stringfiedComponentsToNameMap = self.stringfiedComponentsToNameMap
		local _name = name
		_stringfiedComponentsToNameMap[cStr] = _name
		self.undefinedStringifiedComponents[cStr] = true
		self.stringfiedComponents[cStr] = true
		return c
	end
	function Covenant:getComponentName(component)
		local _stringfiedComponentsToNameMap = self.stringfiedComponentsToNameMap
		local _arg0 = tostring(component)
		return _stringfiedComponentsToNameMap[_arg0]
	end
	function Covenant:worldTag()
		self:preventPostStartCall()
		local c = self._world:component()
		local _undefinedStringifiedComponents = self.undefinedStringifiedComponents
		local _arg0 = tostring(c)
		_undefinedStringifiedComponents[_arg0] = true
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
	function Covenant:defineComponent(_param)
		local logging = _param.logging
		local component = _param.component
		local queriedComponents = _param.queriedComponents
		local recipe = _param.recipe
		local replicated = _param.replicated
		local predictionValidator = _param.predictionValidator
		self:checkComponentDefined(component)
		self:defineComponentNetworkBehavior(component, replicated, predictionValidator)
		if logging then
			local _loggingStringfiedComponents = self.loggingStringfiedComponents
			local _arg0 = tostring(component)
			_loggingStringfiedComponents[_arg0] = true
		end
		local queryThisComponent = self:worldQuery(component):cached()
		local willUpdate = true
		local function indicateUpdate()
			willUpdate = true
		end
		local hooks = createHooks({
			indicateUpdate = indicateUpdate,
			covenant = self,
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
	function Covenant:defineIdentity(_param)
		local logging = _param.logging
		local identityComponent = _param.identityComponent
		local replicated = _param.replicated
		local lifetime = _param.lifetime
		local factory = _param.factory
		self:checkComponentDefined(identityComponent)
		if logging then
			local _loggingStringfiedComponents = self.loggingStringfiedComponents
			local _arg0 = tostring(identityComponent)
			_loggingStringfiedComponents[_arg0] = true
		end
		self:defineComponentNetworkBehavior(identityComponent, replicated, false)
		factory(function(state)
			local entity = self:worldEntity()
			self:worldSet(entity, identityComponent, state)
			local cleanup = function() end
			cleanup = lifetime(entity, state, function()
				self:worldDelete(entity)
				if cleanup ~= nil then
					cleanup()
				end
			end)
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
exports.Covenant = Covenant
return exports
