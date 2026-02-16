local function tableToString(table)
	local s = ""
	if type(table) == "table" then
		s = s .. "{ "
		for i, v in pairs(table) do
			s = s .. "(" .. tableToString(i) .. " = " .. tableToString(v) .. "), "
		end
		s = s .. "}"
	else
		s = s .. tostring(table)
	end
	return s
end

return {
	tableToString = tableToString,
}