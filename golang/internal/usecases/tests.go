package usecases

import (
	"fmt"

	"rplace_teste/internal/models"
)

func DrawSquare(canva *models.Canvas) {
	drawHorizontalLine(5, 10, 10, canva)
	drawHorizontalLine(5, 10, 20, canva)

	drawVerticalLine(10, 20, 5, canva)
	drawVerticalLine(10, 20, 10, canva)
}

func drawHorizontalLine(xInitial int, xFinal int, y int, canvas *models.Canvas) {
	for i := range xFinal - xInitial + 1 {
		fmt.Println(i)
		canvas.AddPixel(1, i+xInitial, y)
	}
}

func drawVerticalLine(yInitial int, yFinal int, x int, canvas *models.Canvas) {
	for i := range yFinal - yInitial + 1 {
		canvas.AddPixel(1, x, i+yInitial)
	}
}
