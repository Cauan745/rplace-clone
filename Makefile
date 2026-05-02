build_proto:
	protoc --go_out="/home/syl/Documents/Faculdade/Sistemas Distribuidos/trabalho_2_grpc/rplace_clone/golang/internal/" \
		--go-grpc_out="/home/syl/Documents/Faculdade/Sistemas Distribuidos/trabalho_2_grpc/rplace_clone/golang/internal/" \
		./rplace.proto
