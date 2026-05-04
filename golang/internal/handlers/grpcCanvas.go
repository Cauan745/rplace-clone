package handlers

import (
	"context"

	"rplace_teste/internal/grpc"
	"rplace_teste/internal/models"
)

type Handlers struct {
	grpc.UnimplementedCanvasServiceServer

	Canvas *models.Canvas
}

func New(c *models.Canvas) *Handlers {
	return &Handlers{
		Canvas: c,
	}
}

func (h *Handlers) GetCanvas(context context.Context, request *grpc.GetCanvasRequest) (*grpc.Canvas, error) {
	protoCanvas := &grpc.Canvas{
		Grid: h.Canvas.Canvas,
		Size: int32(h.Canvas.Size),
	}

	return protoCanvas, nil
}

func (h *Handlers) PlacePixel(context context.Context, pixel *grpc.Pixel) (*grpc.PlacePixelResponse, error) {
	h.Canvas.Canvas[pixel.Y].Pixels[pixel.X] = uint32(pixel.Color)

	response := &grpc.PlacePixelResponse{}

	return response, nil
}
