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
	const PORT = ":9001"

	canvas := models.New(100)

	// setup a listener on port 9001
	lis, err := net.Listen("tcp", PORT)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// create a new grpc server
	grpcServer := grpc.NewServer()

	// register our server struct as a handle for the CanvasService rpc calls that come in through grpcServer
	gr.RegisterCanvasServiceServer(grpcServer, handlers.New(canvas))

	log.Println("gRPC server listening on port", PORT)

	// Serve traffic
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %s", err)
	}
}
