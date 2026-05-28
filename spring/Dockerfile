# Stage 1: Build the application (Using Debian to support the grpc compiler)
FROM --platform=$BUILDPLATFORM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 1. Copy the shared proto folder into the container
COPY proto/ ./proto/
# 2. Copy the spring project into the container
COPY spring/ ./spring/

# 3. Move into the spring folder to run Maven
WORKDIR /app/spring
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Note the updated path to copy the jar from /app/spring/target
COPY --from=build /app/spring/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
