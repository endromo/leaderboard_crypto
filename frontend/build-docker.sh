#!/bin/bash
# scripts/build-docker.sh

#!/bin/bash
set -e

echo "Building Leaderboard Frontend Docker image..."

# Build arguments
BUILD_ARGS=""
if [ -n "$NEXT_PUBLIC_API_URL" ]; then
  BUILD_ARGS="$BUILD_ARGS --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
fi

if [ -n "$NEXT_PUBLIC_WS_URL" ]; then
  BUILD_ARGS="$BUILD_ARGS --build-arg NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL"
fi

# Build Docker image
sudo docker build \
  -t leaderboard-frontend:latest \
  -t leaderboard-frontend:$(git rev-parse --short HEAD) \
  $BUILD_ARGS \
  .

echo "Build completed successfully!"
echo "Image tags:"
echo "  - leaderboard-frontend:latest"
echo "  - leaderboard-frontend:$(git rev-parse --short HEAD)"