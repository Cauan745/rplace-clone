
# 1. Use the official Go image to build the app
FROM golang:1.26.2-alpine AS builder

# 2. Set the working directory
WORKDIR /app

# 3. Download dependencies (leveraging Docker cache)
COPY go.mod go.sum ./
RUN go mod download

# 4. Copy source code and build the binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/main/main.go

# 5. Use a tiny runtime image (Multi-stage build)
FROM alpine:3.23.4
WORKDIR /root/
COPY --from=builder /app/main .

# 6. Run the app
EXPOSE 9001
CMD ["./main"]

