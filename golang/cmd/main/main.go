package main

import (
	"net/http"

	"rplace_teste/internal/handlers"
	"rplace_teste/internal/models"
	"rplace_teste/internal/usecases"
)

func main() {
	canvas := models.New()
	handlers := handlers.New(canvas)

	server := http.NewServeMux()

	usecases.DrawSquare(canvas)

	server.HandleFunc("GET /", handlers.GetCanvas)
	server.HandleFunc("POST /", handlers.PlacePixel)

	http.ListenAndServe(":8000", server)
}
