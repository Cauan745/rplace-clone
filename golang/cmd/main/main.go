package main

import (
	"flag"
	"log"
	"net"

	"rplace_teste/internal/handlers"
	"rplace_teste/internal/models"

	gr "rplace_teste/internal/grpc"

	"google.golang.org/grpc"
)

func main() {
	const PORT = ":9001"

	canvasSize := flag.Int("size", 50, "canvas size")
	flag.Parse()

	log.Println("Criando canvas de tamanho:", *canvasSize)

	canvas := models.New(*canvasSize)

	// criar listener na porta 9001
	lis, err := net.Listen("tcp", PORT)
	if err != nil {
		log.Fatalf("falha no listen: %v", err)
	}

	grpcServer := grpc.NewServer()

	gr.RegisterCanvasServiceServer(grpcServer, handlers.New(canvas))

	log.Println("servidor gRPC listening na porta", PORT)

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("falha ao servir: %s", err)
	}
}
