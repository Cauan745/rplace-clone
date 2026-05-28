# run this from root_folder (rplace_clone)
docker buildx build -f spring/Dockerfile --platform linux/arm64 -t rplace_spring:arm64 --load .
