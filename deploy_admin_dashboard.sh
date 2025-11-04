#!/bin/bash

# Alhambra Bank & Trust - Admin Dashboard Quick Deployment Script
# AWS Account: 600043382145
# Version: 1.0.0

set -e

# Configuration
AWS_ACCOUNT_ID="600043382145"
AWS_REGION="us-east-1"
CLUSTER_NAME="alhambra-admin-cluster"
SERVICE_NAME="alhambra-admin-service"
REPOSITORY_NAME="alhambra-admin-dashboard"
TASK_FAMILY="alhambra-admin-dashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install AWS CLI first."
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please run 'aws configure' first."
    fi
    
    # Verify AWS account
    CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
        error "Wrong AWS account. Expected: $AWS_ACCOUNT_ID, Current: $CURRENT_ACCOUNT"
    fi
    
    log "Prerequisites check passed ✓"
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    log "Creating ECR repository..."
    
    if aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $AWS_REGION &> /dev/null; then
        log "ECR repository already exists ✓"
    else
        aws ecr create-repository \
            --repository-name $REPOSITORY_NAME \
            --image-scanning-configuration scanOnPush=true \
            --region $AWS_REGION
        log "ECR repository created ✓"
    fi
}

# Build and push Docker image
build_and_push_image() {
    log "Building and pushing Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build image
    docker build -t $REPOSITORY_NAME .
    
    # Tag image
    docker tag $REPOSITORY_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest
    
    # Push image
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest
    
    log "Docker image built and pushed ✓"
}

# Create ECS cluster if it doesn't exist
create_ecs_cluster() {
    log "Creating ECS cluster..."
    
    if aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        log "ECS cluster already exists ✓"
    else
        aws ecs create-cluster \
            --cluster-name $CLUSTER_NAME \
            --capacity-providers FARGATE \
            --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
            --region $AWS_REGION
        log "ECS cluster created ✓"
    fi
}

# Create task definition
create_task_definition() {
    log "Creating task definition..."
    
    cat > task-definition.json << EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "admin-dashboard",
      "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPOSITORY_NAME:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        },
        {
          "name": "AWS_ACCOUNT_ID",
          "value": "$AWS_ACCOUNT_ID"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:alhambra-admin-db-credentials"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:alhambra-admin-redis-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:alhambra-admin-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alhambra-admin-dashboard",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

    # Register task definition
    aws ecs register-task-definition \
        --cli-input-json file://task-definition.json \
        --region $AWS_REGION
    
    log "Task definition created ✓"
}

# Create CloudWatch log group
create_log_group() {
    log "Creating CloudWatch log group..."
    
    if aws logs describe-log-groups --log-group-name-prefix "/ecs/alhambra-admin-dashboard" --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "/ecs/alhambra-admin-dashboard"; then
        log "Log group already exists ✓"
    else
        aws logs create-log-group \
            --log-group-name "/ecs/alhambra-admin-dashboard" \
            --retention-in-days 30 \
            --region $AWS_REGION
        log "Log group created ✓"
    fi
}

# Get VPC and subnet information
get_network_info() {
    log "Getting network information..."
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        error "No default VPC found. Please create a VPC first."
    fi
    
    # Get subnets
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text --region $AWS_REGION)
    SUBNET_ARRAY=($SUBNET_IDS)
    
    if [ ${#SUBNET_ARRAY[@]} -lt 2 ]; then
        error "At least 2 subnets required for deployment."
    fi
    
    SUBNET1=${SUBNET_ARRAY[0]}
    SUBNET2=${SUBNET_ARRAY[1]}
    
    log "Using VPC: $VPC_ID"
    log "Using Subnets: $SUBNET1, $SUBNET2"
}

# Create security group
create_security_group() {
    log "Creating security group..."
    
    # Check if security group exists
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=alhambra-admin-sg" "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)
    
    if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
        log "Security group already exists: $SG_ID ✓"
    else
        SG_ID=$(aws ec2 create-security-group \
            --group-name alhambra-admin-sg \
            --description "Security group for Alhambra Admin Dashboard" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text \
            --region $AWS_REGION)
        
        # Allow HTTP traffic from VPC
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 3000 \
            --cidr 10.0.0.0/8 \
            --region $AWS_REGION
        
        log "Security group created: $SG_ID ✓"
    fi
}

# Create or update ECS service
deploy_service() {
    log "Deploying ECS service..."
    
    # Check if service exists
    if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        log "Updating existing service..."
        
        # Update service
        aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service $SERVICE_NAME \
            --task-definition $TASK_FAMILY \
            --region $AWS_REGION
        
        log "Service updated ✓"
    else
        log "Creating new service..."
        
        # Create service
        aws ecs create-service \
            --cluster $CLUSTER_NAME \
            --service-name $SERVICE_NAME \
            --task-definition $TASK_FAMILY \
            --desired-count 2 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
            --region $AWS_REGION
        
        log "Service created ✓"
    fi
}

# Wait for service to be stable
wait_for_deployment() {
    log "Waiting for deployment to complete..."
    
    aws ecs wait services-stable \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --region $AWS_REGION
    
    log "Deployment completed ✓"
}

# Get service information
get_service_info() {
    log "Getting service information..."
    
    # Get task ARNs
    TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --query 'taskArns' --output text --region $AWS_REGION)
    
    if [ -n "$TASK_ARNS" ]; then
        log "Service is running with tasks:"
        for TASK_ARN in $TASK_ARNS; do
            TASK_ID=$(basename $TASK_ARN)
            log "  - Task: $TASK_ID"
        done
        
        # Get task details for IP addresses
        TASK_DETAILS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARNS --query 'tasks[0].attachments[0].details' --output json --region $AWS_REGION)
        
        if [ "$TASK_DETAILS" != "null" ]; then
            PUBLIC_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="publicIPv4Address") | .value')
            PRIVATE_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="privateIPv4Address") | .value')
            
            if [ "$PUBLIC_IP" != "null" ] && [ -n "$PUBLIC_IP" ]; then
                log "Public IP: $PUBLIC_IP"
                log "Admin Dashboard URL: http://$PUBLIC_IP:3000"
            fi
            
            if [ "$PRIVATE_IP" != "null" ] && [ -n "$PRIVATE_IP" ]; then
                log "Private IP: $PRIVATE_IP"
            fi
        fi
    else
        warn "No running tasks found"
    fi
}

# Create secrets if they don't exist
create_secrets() {
    log "Creating secrets..."
    
    # Database credentials
    if ! aws secretsmanager describe-secret --secret-id alhambra-admin-db-credentials --region $AWS_REGION &>/dev/null; then
        aws secretsmanager create-secret \
            --name alhambra-admin-db-credentials \
            --description "Database credentials for admin dashboard" \
            --secret-string '{"username":"admin","password":"AdminPass2025!","host":"localhost","port":"5432","database":"alhambra_admin"}' \
            --region $AWS_REGION
        log "Database credentials secret created ✓"
    else
        log "Database credentials secret already exists ✓"
    fi
    
    # JWT secret
    if ! aws secretsmanager describe-secret --secret-id alhambra-admin-jwt-secret --region $AWS_REGION &>/dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        aws secretsmanager create-secret \
            --name alhambra-admin-jwt-secret \
            --description "JWT secret for admin dashboard" \
            --secret-string "{\"secret\":\"$JWT_SECRET\"}" \
            --region $AWS_REGION
        log "JWT secret created ✓"
    else
        log "JWT secret already exists ✓"
    fi
    
    # Redis URL
    if ! aws secretsmanager describe-secret --secret-id alhambra-admin-redis-url --region $AWS_REGION &>/dev/null; then
        aws secretsmanager create-secret \
            --name alhambra-admin-redis-url \
            --description "Redis URL for admin dashboard" \
            --secret-string '{"url":"redis://localhost:6379"}' \
            --region $AWS_REGION
        log "Redis URL secret created ✓"
    else
        log "Redis URL secret already exists ✓"
    fi
}

# Main deployment function
main() {
    log "Starting Alhambra Bank & Trust Admin Dashboard Deployment"
    log "AWS Account: $AWS_ACCOUNT_ID"
    log "Region: $AWS_REGION"
    log "=========================================="
    
    check_prerequisites
    create_secrets
    create_ecr_repository
    build_and_push_image
    create_ecs_cluster
    create_log_group
    get_network_info
    create_security_group
    create_task_definition
    deploy_service
    wait_for_deployment
    get_service_info
    
    log "=========================================="
    log "Deployment completed successfully! 🎉"
    log "Admin Dashboard is now running on AWS ECS"
    log "=========================================="
    
    # Cleanup
    rm -f task-definition.json
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
