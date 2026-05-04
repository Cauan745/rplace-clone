package handlers

import (
	"context"
	"fmt"

	"rplace_teste/internal/grpc"
	"rplace_teste/internal/models"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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

	fmt.Println(h.Canvas.Canvas[0].Pixels)

	fmt.Println(protoCanvas)

	return protoCanvas, nil
}

func (h *Handlers) PlacePixel(context context.Context, pixel *grpc.Pixel) (*grpc.PlacePixelResponse, error) {
	return nil, status.Error(codes.Unimplemented, "method PlacePixel not implemented")
}
