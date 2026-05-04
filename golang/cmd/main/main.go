package main

import (
	"log"
	"net"

	"rplace_teste/internal/handlers"
	"rplace_teste/internal/models"

	gr "rplace_teste/internal/grpc"

	"google.golang.org/grpc"
)

func main() {
	canvas := models.New(50)
	// handlers := handlers.New(canvas)
	//
	// server := http.NewServeMux()
	//
	// usecases.DrawSquare(canvas)
	//
	// server.HandleFunc("GET /", handlers.GetCanvas)
	// server.HandleFunc("POST /", handlers.PlacePixel)
	//
	// http.ListenAndServe(":8000", server)

	// setup a listener on port 9001
	lis, err := net.Listen("tcp", ":9001")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// create a new grpc server
	grpcServer := grpc.NewServer()

	// register our server struct as a handle for the CoffeeShopService rpc calls that come in through grpcServer
	gr.RegisterCanvasServiceServer(grpcServer, handlers.New(canvas))

	// Serve traffic
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %s", err)
	}
}
