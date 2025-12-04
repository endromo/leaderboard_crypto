#!/bin/bash
# scripts/deploy.sh

#!/bin/bash
set -e

# Load environment
source .env

# Build and push Docker images
echo "Building and pushing Docker images..."
sudo docker compose build

# Push to registry jika diperlukan
if [ "$CI" = "true" ]; then
  echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
  sudo docker compose push
fi

# Deploy ke server
if [ "$DEPLOY_ENV" = "production" ]; then
  echo "Deploying to production..."
  # SSH ke server dan pull images
  ssh $DEPLOY_USER@$DEPLOY_HOST "cd /opt/leaderboard && sudo docker compose pull && sudo docker compose up -d"
elif [ "$DEPLOY_ENV" = "staging" ]; then
  echo "Deploying to staging..."
  sudo docker compose -f docker-compose.staging.yml up -d
else
  echo "Starting local development..."
  sudo docker compose up -d
fi

echo "Deployment completed!"