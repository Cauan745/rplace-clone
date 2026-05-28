# Use a lightweight Python base image
FROM --platform=linux/arm64 python:3-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the static files from the local directory to the container
COPY . /app

# Expose port 8000
EXPOSE 8000

# Run the Python HTTP server
CMD ["python3", "-m", "http.server", "8000"]
