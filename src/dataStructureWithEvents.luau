-- Compiled with roblox-ts v3.0.0
local EventMap
do
	EventMap = setmetatable({}, {
		__tostring = function()
			return "EventMap"
		end,
	})
	EventMap.__index = EventMap
	function EventMap.new(...)
		local self = setmetatable({}, EventMap)
		return self:constructor(...) or self
	end
	function EventMap:constructor()
		self.stringifiedEventToValue = {}
		self.stringifiedEventToEvent = {}
	end
	function EventMap:set(key, value)
		local stringifiedEvent = tostring(key)
		local _stringifiedEventToValue = self.stringifiedEventToValue
		local _value = value
		_stringifiedEventToValue[stringifiedEvent] = _value
		local _stringifiedEventToEvent = self.stringifiedEventToEvent
		local _key = key
		_stringifiedEventToEvent[stringifiedEvent] = _key
		return self
	end
	function EventMap:delete(key)
		local stringifiedEvent = tostring(key)
		local _exp = self.stringifiedEventToEvent
		-- ▼ Map.delete ▼
		local _valueExisted = _exp[stringifiedEvent] ~= nil
		_exp[stringifiedEvent] = nil
		-- ▲ Map.delete ▲
		local _condition = _valueExisted
		if _condition then
			local _exp_1 = self.stringifiedEventToValue
			-- ▼ Map.delete ▼
			local _valueExisted_1 = _exp_1[stringifiedEvent] ~= nil
			_exp_1[stringifiedEvent] = nil
			-- ▲ Map.delete ▲
			_condition = _valueExisted_1
		end
		return _condition
	end
	function EventMap:clear()
		table.clear(self.stringifiedEventToEvent)
		table.clear(self.stringifiedEventToValue)
	end
	function EventMap:isEmpty()
		return next(self.stringifiedEventToEvent) == nil and next(self.stringifiedEventToValue) == nil
	end
	function EventMap:forEach(callbackfn)
		local _exp = self.stringifiedEventToValue
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(value, stringifiedEvent)
			local _fn = callbackfn
			local _exp_1 = value
			local _stringifiedEventToEvent = self.stringifiedEventToEvent
			local _stringifiedEvent = stringifiedEvent
			_fn(_exp_1, _stringifiedEventToEvent[_stringifiedEvent])
		end
		for _k, _v in _exp do
			_callback(_v, _k, _exp)
		end
		-- ▲ ReadonlyMap.forEach ▲
	end
	function EventMap:size()
		-- ▼ ReadonlyMap.size ▼
		local _size = 0
		for _ in self.stringifiedEventToValue do
			_size += 1
		end
		-- ▲ ReadonlyMap.size ▲
		-- ▼ ReadonlyMap.size ▼
		local _size_1 = 0
		for _ in self.stringifiedEventToValue do
			_size_1 += 1
		end
		-- ▲ ReadonlyMap.size ▲
		return (_size + _size_1) / 2
	end
	function EventMap:has(key)
		local stringifiedEvent = tostring(key)
		return self.stringifiedEventToEvent[stringifiedEvent] ~= nil and self.stringifiedEventToValue[stringifiedEvent] ~= nil
	end
	function EventMap:get(key)
		local stringifiedEvent = tostring(key)
		return self.stringifiedEventToValue[stringifiedEvent]
	end
end
local EventMapWithInstance
do
	EventMapWithInstance = setmetatable({}, {
		__tostring = function()
			return "EventMapWithInstance"
		end,
	})
	EventMapWithInstance.__index = EventMapWithInstance
	function EventMapWithInstance.new(...)
		local self = setmetatable({}, EventMapWithInstance)
		return self:constructor(...) or self
	end
	function EventMapWithInstance:constructor()
		self.instanceEventMaps = {}
	end
	function EventMapWithInstance:set(instance, key, value)
		local _instanceEventMaps = self.instanceEventMaps
		local _instance = instance
		local eventMap = _instanceEventMaps[_instance]
		if eventMap == nil then
			eventMap = EventMap.new()
			local _instanceEventMaps_1 = self.instanceEventMaps
			local _instance_1 = instance
			local _eventMap = eventMap
			_instanceEventMaps_1[_instance_1] = _eventMap
		end
		eventMap:set(key, value)
		return self
	end
	function EventMapWithInstance:delete(instance, key)
		local _instanceEventMaps = self.instanceEventMaps
		local _instance = instance
		local eventMap = _instanceEventMaps[_instance]
		if eventMap == nil then
			return false
		end
		return eventMap:delete(key)
	end
	function EventMapWithInstance:clear()
		table.clear(self.instanceEventMaps)
	end
	function EventMapWithInstance:deletedInstance(instance)
		local _instanceEventMaps = self.instanceEventMaps
		local _instance = instance
		-- ▼ Map.delete ▼
		local _valueExisted = _instanceEventMaps[_instance] ~= nil
		_instanceEventMaps[_instance] = nil
		-- ▲ Map.delete ▲
		return _valueExisted
	end
	function EventMapWithInstance:isEmpty()
		return next(self.instanceEventMaps) == nil
	end
	function EventMapWithInstance:isInstanceEmpty(instance)
		local _instanceEventMaps = self.instanceEventMaps
		local _instance = instance
		local eventMap = _instanceEventMaps[_instance]
		if eventMap == nil then
			return true
		end
		return eventMap:isEmpty()
	end
	function EventMapWithInstance:forEach(callbackfn)
		local _exp = self.instanceEventMaps
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(eventMap)
			eventMap:forEach(function(value, event)
				callbackfn(value, event)
			end)
		end
		for _k, _v in _exp do
			_callback(_v, _k, _exp)
		end
		-- ▲ ReadonlyMap.forEach ▲
	end
	function EventMapWithInstance:size()
		local size = 0
		local _exp = self.instanceEventMaps
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(eventMap)
			size += eventMap:size()
		end
		for _k, _v in _exp do
			_callback(_v, _k, _exp)
		end
		-- ▲ ReadonlyMap.forEach ▲
		return size
	end
	function EventMapWithInstance:has(instance, key)
		local _instanceEventMaps = self.instanceEventMaps
		local _instance = instance
		local eventMap = _instanceEventMaps[_instance]
		if eventMap == nil then
			return false
		end
		return eventMap:has(key)
	end
	function EventMapWithInstance:get(instance, key)
		local _instanceEventMaps = self.instanceEventMaps
		local _instance = instance
		local eventMap = _instanceEventMaps[_instance]
		if eventMap == nil then
			return nil
		end
		return eventMap:get(key)
	end
end
local EventSet
do
	EventSet = setmetatable({}, {
		__tostring = function()
			return "EventSet"
		end,
	})
	EventSet.__index = EventSet
	function EventSet.new(...)
		local self = setmetatable({}, EventSet)
		return self:constructor(...) or self
	end
	function EventSet:constructor()
		self.stringifiedEventToEvent = {}
	end
	function EventSet:add(value)
		local stringifiedEvent = tostring(value)
		if not (self.stringifiedEventToEvent[stringifiedEvent] ~= nil) then
			local _stringifiedEventToEvent = self.stringifiedEventToEvent
			local _value = value
			_stringifiedEventToEvent[stringifiedEvent] = _value
		end
		return self
	end
	function EventSet:delete(value)
		local stringifiedEvent = tostring(value)
		local _exp = self.stringifiedEventToEvent
		-- ▼ Map.delete ▼
		local _valueExisted = _exp[stringifiedEvent] ~= nil
		_exp[stringifiedEvent] = nil
		-- ▲ Map.delete ▲
		return _valueExisted
	end
	function EventSet:clear()
		table.clear(self.stringifiedEventToEvent)
	end
	function EventSet:isEmpty()
		return next(self.stringifiedEventToEvent) == nil
	end
	function EventSet:forEach(callbackfn)
		local _exp = self.stringifiedEventToEvent
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(event)
			callbackfn(event)
		end
		for _k, _v in _exp do
			_callback(_v, _k, _exp)
		end
		-- ▲ ReadonlyMap.forEach ▲
	end
	function EventSet:size()
		-- ▼ ReadonlyMap.size ▼
		local _size = 0
		for _ in self.stringifiedEventToEvent do
			_size += 1
		end
		-- ▲ ReadonlyMap.size ▲
		return _size
	end
	function EventSet:has(value)
		local stringifiedEvent = tostring(value)
		return self.stringifiedEventToEvent[stringifiedEvent] ~= nil
	end
end
local EventSetWithInstance
do
	EventSetWithInstance = setmetatable({}, {
		__tostring = function()
			return "EventSetWithInstance"
		end,
	})
	EventSetWithInstance.__index = EventSetWithInstance
	function EventSetWithInstance.new(...)
		local self = setmetatable({}, EventSetWithInstance)
		return self:constructor(...) or self
	end
	function EventSetWithInstance:constructor()
		self.instanceEventSets = {}
	end
	function EventSetWithInstance:add(instance, value)
		local _instanceEventSets = self.instanceEventSets
		local _instance = instance
		local eventSet = _instanceEventSets[_instance]
		if eventSet == nil then
			eventSet = EventSet.new()
			local _instanceEventSets_1 = self.instanceEventSets
			local _instance_1 = instance
			local _eventSet = eventSet
			_instanceEventSets_1[_instance_1] = _eventSet
		end
		eventSet:add(value)
		return self
	end
	function EventSetWithInstance:delete(instance, value)
		local _instanceEventSets = self.instanceEventSets
		local _instance = instance
		local eventSet = _instanceEventSets[_instance]
		if eventSet == nil then
			return false
		end
		return eventSet:delete(value)
	end
	function EventSetWithInstance:deleteInstance(instance)
		local _instanceEventSets = self.instanceEventSets
		local _instance = instance
		-- ▼ Map.delete ▼
		local _valueExisted = _instanceEventSets[_instance] ~= nil
		_instanceEventSets[_instance] = nil
		-- ▲ Map.delete ▲
		return _valueExisted
	end
	function EventSetWithInstance:clear()
		table.clear(self.instanceEventSets)
	end
	function EventSetWithInstance:isEmpty()
		return next(self.instanceEventSets) == nil
	end
	function EventSetWithInstance:isInstanceEmpty(instance)
		local _instanceEventSets = self.instanceEventSets
		local _instance = instance
		local eventSet = _instanceEventSets[_instance]
		if eventSet == nil then
			return true
		end
		return eventSet:isEmpty()
	end
	function EventSetWithInstance:forEach(callbackfn)
		local _exp = self.instanceEventSets
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(eventSet)
			eventSet:forEach(function(event)
				callbackfn(event)
			end)
		end
		for _k, _v in _exp do
			_callback(_v, _k, _exp)
		end
		-- ▲ ReadonlyMap.forEach ▲
	end
	function EventSetWithInstance:size()
		local size = 0
		local _exp = self.instanceEventSets
		-- ▼ ReadonlyMap.forEach ▼
		local _callback = function(eventSet)
			size += eventSet:size()
		end
		for _k, _v in _exp do
			_callback(_v, _k, _exp)
		end
		-- ▲ ReadonlyMap.forEach ▲
		return size
	end
	function EventSetWithInstance:has(instance, value)
		local _instanceEventSets = self.instanceEventSets
		local _instance = instance
		local eventSet = _instanceEventSets[_instance]
		if eventSet == nil then
			return false
		end
		return eventSet:has(value)
	end
end
return {
	EventMap = EventMap,
	EventMapWithInstance = EventMapWithInstance,
	EventSet = EventSet,
	EventSetWithInstance = EventSetWithInstance,
}
