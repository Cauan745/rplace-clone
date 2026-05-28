# r/place clone

Um canvas colaborativo em tempo real inspirado no [r/place](https://en.wikipedia.org/wiki/R/place) do Reddit, feito como trabalho da disciplina de Sistemas Distribuídos.

A ideia principal do projeto é demonstrar comunicação entre serviços usando **gRPC** e **WebSockets**: o estado do canvas fica num servidor Go, um backend Spring Boot faz a ponte entre o front e o Go via gRPC, e o frontend se conecta por WebSocket (STOMP/SockJS) para receber e enviar atualizações de pixel em tempo real.

## Arquitetura

- **Go Server**: mantém o estado do canvas em memória (grid NxN protegido por mutex) e expõe dois RPCs: `GetCanvas` e `PlacePixel`.
- **Spring Boot**: atua como BFF: recebe WebSockets do frontend, converte para chamadas gRPC ao Go, e faz broadcast dos pixels colocados para todos os clientes conectados via `/topic/update`.
- **Frontend**: canvas com rendering via `ImageData` + `requestAnimationFrame`, zoom (scroll + pinch), pan, paleta de 32 cores e cooldown entre colocações.

## Stack

- HTML/CSS/JS vanilla, STOMP.js, SockJS 
- Spring Boot 4, Spring WebSocket, grpc-spring-boot-starter 
- Go 1.26, gRPC 
- Protocolo  Protocol Buffers 3 (proto compartilhado em `proto/`) 
- Infra  Docker (multi-stage builds), tmux para dev 

## Como rodar

### Dev (local)

Precisa de Go, Java 21+ (Maven) e algum server HTTP estático (o script usa `python3 -m http.server`).

O jeito mais rápido é abrir um tmux e rodar:

```bash
./run_all_tmux.sh
```

Isso abre 3 painéis:
1. `go run cmd/main/main.go` na porta 9001
2. `mvn spring-boot:run` na porta 8080
3. `python3 -m http.server 8765` para o front

Ou manualmente:

```bash
# Terminal 1 — Go (gRPC server)
cd golang
go run cmd/main/main.go --size 50

# Terminal 2 — Spring Boot (WebSocket + gRPC client)
cd spring
mvn spring-boot:run

# Terminal 3 — Frontend
cd front
python3 -m http.server 8765
```

Acesse `http://localhost:8765`.

### Docker

Cada serviço tem seu Dockerfile. Os builds do Go e do Spring são multi-stage para manter as imagens pequenas.

```bash
# Go
cd golang && docker build -t rplace-go .

# Spring (precisa do diretório proto junto)
docker build -f spring/Dockerfile -t rplace-spring .

# Front
cd front && docker build -t rplace-front .
```

## Protobuf

O contrato entre Go e Spring fica no arquivo `proto/rplace.proto`:

```protobuf
service CanvasService {
  rpc GetCanvas(GetCanvasRequest) returns (Canvas);
  rpc PlacePixel(Pixel) returns (PlacePixelResponse);
}
```

Para regenerar o código Go:

```bash
make build_proto
```
