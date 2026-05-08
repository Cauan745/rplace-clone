package handlers

import (
	"context"
	"log"

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
	log.Println("Requisição GetCanvas recebida")

	protoCanvas := &grpc.Canvas{
		Grid: h.Canvas.Canvas,
		Size: int32(h.Canvas.Size),
	}

	return protoCanvas, nil
}

func (h *Handlers) PlacePixel(context context.Context, pixel *grpc.Pixel) (*grpc.PlacePixelResponse, error) {
	log.Println("Requisição PlacePixel recebida")
	err := h.Canvas.AddPixel(uint32(pixel.Color), int(pixel.X), int(pixel.Y))
	if err != nil {
		log.Println("Error", err)
		return nil, err
	}

	response := &grpc.PlacePixelResponse{}

	return response, nil
}
