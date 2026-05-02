package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"rplace_teste/internal/models"
)

type Handlers struct {
	canvas *models.Canvas
}

func New(c *models.Canvas) *Handlers {
	return &Handlers{
		canvas: c,
	}
}

func (h *Handlers) GetCanvas(w http.ResponseWriter, r *http.Request) {
	data, err := json.Marshal(h.canvas.Canvas)
	if err != nil {
		log.Panic(err)
	}

	w.Header().Set("Content-type", "application/json")
	w.Write(data)
}

func (h *Handlers) PlacePixel(w http.ResponseWriter, r *http.Request) {
	log.Println("Place pixel received")

	pixel := &struct {
		Color int
		X     int
		Y     int
	}{}

	err := json.NewDecoder(r.Body).Decode(pixel)
	if err != nil {
		log.Panic(err)
	}

	fmt.Println("Pixel is like this: %v", pixel)

	h.canvas.AddPixel(int8(pixel.Color), pixel.X, pixel.Y)

	fmt.Println("Pixel placed")

	w.Header().Set("Content-type", "application/json")
	w.Write([]byte(`{message: "success"}`))
}
