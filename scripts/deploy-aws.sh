#!/bin/bash

set -e

# Configuration
AWS_REGION="sa-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
BACKEND_IMAGE_NAME="chatgot-backend"
FRONTEND_IMAGE_NAME="chatgot-frontend"
ECS_CLUSTER="chatgot-cluster"
ECS_SERVICE="chatgot-service"
TASK_FAMILY="chatgot-app"

echo "🚀 Starting ChatGot deployment to AWS..."
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo "ECR Registry: $ECR_REGISTRY"

# Step 1: Login to ECR
echo "📝 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Step 2: Create ECR repositories if they don't exist
echo "📦 Creating ECR repositories..."
for REPO in $BACKEND_IMAGE_NAME $FRONTEND_IMAGE_NAME; do
  if ! aws ecr describe-repositories --repository-names $REPO --region $AWS_REGION 2>/dev/null; then
    echo "Creating repository: $REPO"
    aws ecr create-repository \
      --repository-name $REPO \
      --region $AWS_REGION \
      --encryption-configuration encryptionType=AES \
      --image-scanning-configuration scanOnPush=true
  fi
done

# Step 3: Build and push backend image
echo "🏗️  Building backend Docker image..."
docker build -f Dockerfile.backend -t $ECR_REGISTRY/$BACKEND_IMAGE_NAME:latest .
echo "📤 Pushing backend image to ECR..."
docker push $ECR_REGISTRY/$BACKEND_IMAGE_NAME:latest

# Step 4: Build and push frontend image
echo "🏗️  Building frontend Docker image..."
docker build -f Dockerfile.frontend -t $ECR_REGISTRY/$FRONTEND_IMAGE_NAME:latest .
echo "📤 Pushing frontend image to ECR..."
docker push $ECR_REGISTRY/$FRONTEND_IMAGE_NAME:latest

# Step 5: Update ECS Task Definition
echo "📋 Updating ECS Task Definition..."
TASK_DEF=$(aws ecs describe-task-definition --task-definition $TASK_FAMILY --region $AWS_REGION --query 'taskDefinition' 2>/dev/null || echo "{}")

if [ "$TASK_DEF" == "{}" ]; then
  echo "Creating new task definition..."
  # Register task definition from template
  sed "s|ACCOUNT_ID|$AWS_ACCOUNT_ID|g" ecs-task-definition.json | \
  aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --region $AWS_REGION
else
  echo "Updating existing task definition..."
  # Get the current task definition and update images
  UPDATED_DEF=$(echo "$TASK_DEF" | jq \
    --arg BACKEND_IMAGE "$ECR_REGISTRY/$BACKEND_IMAGE_NAME:latest" \
    --arg FRONTEND_IMAGE "$ECR_REGISTRY/$FRONTEND_IMAGE_NAME:latest" \
    '.containerDefinitions |= map(
      if .name == "chatgot-backend" then .image = $BACKEND_IMAGE
      elif .name == "chatgot-frontend" then .image = $FRONTEND_IMAGE
      else . end
    ) | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')
  
  echo "$UPDATED_DEF" | \
  aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --region $AWS_REGION
fi

# Step 6: Update ECS Service
echo "🔄 Updating ECS Service..."
LATEST_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $TASK_FAMILY \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --task-definition $LATEST_TASK_DEF \
  --region $AWS_REGION \
  --force-new-deployment

echo "✅ Deployment initiated successfully!"
echo "📊 Monitor the deployment at: https://console.aws.amazon.com/ecs/v2/clusters/$ECS_CLUSTER/services/$ECS_SERVICE"
echo "🌐 Application will be available at: https://chatgot.com.br"
