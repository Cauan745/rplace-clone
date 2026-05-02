package models

import (
	"image"
	"image/color"
	"image/png"
	"log"
	"os"
	"sync"

	"rplace_teste/internal/models/colors"
)

type Canvas struct {
	ColorCount int
	Size       int
	mux        sync.Mutex
	Canvas     [50][50]int8 // 0 means empty
}

func New() *Canvas {
	return &Canvas{
		ColorCount: colors.ColorCount,
		Size:       50,
	}
}

func (c *Canvas) AddPixel(color int8, x int, y int) {
	if !c.isValidCoodinate(x) || !c.isValidCoodinate(y) {
		log.Println("Invalid coordinate:", x, "or", y)
		return
	}

	c.mux.Lock()
	c.Canvas[y][x] = color
	c.mux.Unlock()
}

func (c *Canvas) isValidCoodinate(coord int) bool {
	if coord < 0 || coord > c.Size-1 {
		return false
	}

	return true
}

func (c *Canvas) SaveToPNG(filename string) error {
	c.mux.Lock()
	defer c.mux.Unlock() // Lock while reading to prevent race conditions

	width := 100
	height := 100

	// 1. Create a new blank image
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// 2. Define our r/place color palette
	colorEmpty := color.RGBA{0, 0, 0, 255} // White background for 0
	colorRed := color.RGBA{255, 0, 0, 255} // Solid Red for 1
	// You can easily add colorBlue for 2, colorGreen for 3, etc.

	// 3. Loop through your [y][x] array and paint the pixels
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			pixelValue := c.Canvas[y][x]

			// Map the integer to the actual color
			switch pixelValue {
			case 1:
				img.Set(x, y, colorRed)
			default:
				img.Set(x, y, colorEmpty)
			}
		}
	}

	// 4. Create the output file
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	// 5. Encode the image memory into a PNG file
	return png.Encode(file, img)
}
