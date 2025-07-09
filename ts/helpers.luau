-- Compiled with roblox-ts v3.0.0
-- Manually modified
local function turnArrayWithIdentifierToMap(array, getIdentifier)
	local newMap = {}
	-- ▼ ReadonlyArray.forEach ▼
	local _callback = function(value)
		local identifier = getIdentifier(value)
		local _value = value
		newMap[identifier] = _value
	end
	for _k, _v in array do
		_callback(_v)
	end
	-- ▲ ReadonlyArray.forEach ▲
	return newMap
end
local function compareMaps(previousMap, newMap)
	local entriesAdded = {}
	local entriesChanged = {}
	local keysRemoved = {}
	-- ▼ ReadonlyMap.forEach ▼
	local _callback = function(value, key)
		local _previousMap = previousMap
		local _key = key
		if not (_previousMap[_key] ~= nil) then
			local _arg0 = {
				key = key,
				value = value,
			}
			table.insert(entriesAdded, _arg0)
		else
			local _previousMap_1 = previousMap
			local _key_1 = key
			local previousValue = _previousMap_1[_key_1]
			if previousValue ~= value then
				local _arg0 = {
					key = key,
					value = value,
					previousValue = previousValue,
				}
				table.insert(entriesChanged, _arg0)
			end
		end
	end
	for _k, _v in newMap do
		_callback(_v, _k, newMap)
	end
	-- ▲ ReadonlyMap.forEach ▲
	-- ▼ ReadonlyMap.forEach ▼
	local _callback_1 = function(_, key)
		local _newMap = newMap
		local _key = key
		if not (_newMap[_key] ~= nil) then
			local _key_1 = key
			table.insert(keysRemoved, _key_1)
		end
	end
	for _k, _v in previousMap do
		_callback_1(_v, _k, previousMap)
	end
	-- ▲ ReadonlyMap.forEach ▲
	return {
		entriesAdded = entriesAdded,
		entriesChanged = entriesChanged,
		keysRemoved = keysRemoved,
	}
end
return {
	turnArrayWithIdentifierToMap = turnArrayWithIdentifierToMap,
	compareMaps = compareMaps,
}
