package colors

var ColorCount int

func GetColors() map[string]int {
	colorMap := make(map[string]int)

	// 0 = vazio
	colorMap["red"] = 1
	colorMap["orange"] = 2
	colorMap["yellow"] = 3
	colorMap["darkGreen"] = 4
	colorMap["lightGreen"] = 5
	colorMap["darkBlue"] = 6
	colorMap["blue"] = 7
	colorMap["lightBlue"] = 8
	colorMap["darkPurple"] = 9
	colorMap["purple"] = 10
	colorMap["lightPink"] = 11
	colorMap["brown"] = 12
	colorMap["black"] = 13
	colorMap["gray"] = 14
	colorMap["lightGray"] = 15
	colorMap["white"] = 16

	ColorCount = len(colorMap)

	return colorMap
}
