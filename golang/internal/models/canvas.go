package models

import (
	"fmt"
	"sync"

	"rplace_teste/internal/grpc"
	"rplace_teste/internal/models/colors"
)

type Canvas struct {
	ColorCount int
	Size       int
	mux        sync.Mutex
	Canvas     []*grpc.Row // 0 = vazio
}

func New(size int) *Canvas {
	grid := make([]*grpc.Row, size)

	for i := range grid {
		grid[i] = &grpc.Row{
			Pixels: make([]uint32, size),
		}
	}

	return &Canvas{
		ColorCount: colors.ColorCount,
		Size:       size,
		Canvas:     grid,
	}
}

func (c *Canvas) AddPixel(color uint32, x int, y int) error {
	if !c.isValidCoodinate(x) || !c.isValidCoodinate(y) {
		return fmt.Errorf("coordenada inválida: %d ou %d", x, y)
	}

	c.mux.Lock()
	c.Canvas[y].Pixels[x] = color
	c.mux.Unlock()
	return nil
}

func (c *Canvas) isValidCoodinate(coord int) bool {
	if coord < 0 || coord > c.Size-1 {
		return false
	}

	return true
}
