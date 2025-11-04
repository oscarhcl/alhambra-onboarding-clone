#!/bin/bash

# Alhambra Bank & Trust - Complete Deployment Script
# This script handles the complete deployment process for AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
STACK_NAME="alhambra-bank-${ENVIRONMENT}"

echo -e "${BLUE}🏦 Alhambra Bank & Trust - AWS Deployment Script${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "AWS Region: ${YELLOW}${AWS_REGION}${NC}"
echo -e "AWS Account: ${YELLOW}${AWS_ACCOUNT_ID}${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if logged into AWS
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "Not logged into AWS. Please run 'aws configure' or set AWS credentials"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Create .env file
create_env_file() {
    print_info "Creating environment configuration..."
    
    cat > .env << EOF
# Alhambra Bank & Trust - Environment Configuration
NODE_ENV=${ENVIRONMENT}
AWS_REGION=${AWS_REGION}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

# Database Configuration
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# S3 Configuration
S3_BUCKET_NAME=${ENVIRONMENT}-alhambra-bank-storage-${AWS_ACCOUNT_ID}

# Monitoring
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# Domain Configuration (update these)
DOMAIN_NAME=alhambrabank.com
CERTIFICATE_ARN=arn:aws:acm:${AWS_REGION}:${AWS_ACCOUNT_ID}:certificate/your-certificate-id

# API Configuration
FRONTEND_URL=https://alhambrabank.com
BACKEND_URL=https://api.alhambrabank.com
EOF
    
    print_status "Environment file created"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_info "Deploying AWS infrastructure..."
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name ${STACK_NAME} &> /dev/null; then
        print_info "Updating existing CloudFormation stack..."
        aws cloudformation update-stack \
            --stack-name ${STACK_NAME} \
            --template-body file://aws-deployment-config.yml \
            --parameters \
                ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
                ParameterKey=DBPassword,ParameterValue=$(grep DB_PASSWORD .env | cut -d'=' -f2) \
                ParameterKey=DomainName,ParameterValue=$(grep DOMAIN_NAME .env | cut -d'=' -f2) \
                ParameterKey=CertificateArn,ParameterValue=$(grep CERTIFICATE_ARN .env | cut -d'=' -f2) \
            --capabilities CAPABILITY_IAM
    else
        print_info "Creating new CloudFormation stack..."
        aws cloudformation create-stack \
            --stack-name ${STACK_NAME} \
            --template-body file://aws-deployment-config.yml \
            --parameters \
                ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
                ParameterKey=DBPassword,ParameterValue=$(grep DB_PASSWORD .env | cut -d'=' -f2) \
                ParameterKey=DomainName,ParameterValue=$(grep DOMAIN_NAME .env | cut -d'=' -f2) \
                ParameterKey=CertificateArn,ParameterValue=$(grep CERTIFICATE_ARN .env | cut -d'=' -f2) \
            --capabilities CAPABILITY_IAM
    fi
    
    print_info "Waiting for CloudFormation stack to complete..."
    aws cloudformation wait stack-create-complete --stack-name ${STACK_NAME} || \
    aws cloudformation wait stack-update-complete --stack-name ${STACK_NAME}
    
    print_status "Infrastructure deployment completed"
}

# Build and push Docker images
build_and_push_images() {
    print_info "Building and pushing Docker images..."
    
    # Get ECR repository URIs
    FRONTEND_REPO_URI=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendRepositoryURI`].OutputValue' \
        --output text)
    
    BACKEND_REPO_URI=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`BackendRepositoryURI`].OutputValue' \
        --output text)
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Build frontend image
    print_info "Building frontend image..."
    docker build -f Dockerfile.frontend -t ${FRONTEND_REPO_URI}:latest ./alhambra-bank-trust/
    docker push ${FRONTEND_REPO_URI}:latest
    
    # Build backend image
    print_info "Building backend image..."
    docker build -f Dockerfile.backend -t ${BACKEND_REPO_URI}:latest .
    docker push ${BACKEND_REPO_URI}:latest
    
    print_status "Docker images built and pushed"
}

# Deploy ECS services
deploy_ecs_services() {
    print_info "Deploying ECS services..."
    
    # Get cluster name
    CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    # Create task definitions
    create_task_definitions
    
    # Create or update services
    create_ecs_services
    
    print_status "ECS services deployed"
}

# Create ECS task definitions
create_task_definitions() {
    print_info "Creating ECS task definitions..."
    
    # Frontend task definition
    cat > frontend-task-definition.json << EOF
{
    "family": "${ENVIRONMENT}-alhambra-frontend",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${STACK_NAME}-ECSTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${STACK_NAME}-ECSTaskRole",
    "containerDefinitions": [
        {
            "name": "frontend",
            "image": "${FRONTEND_REPO_URI}:latest",
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "NODE_ENV",
                    "value": "${ENVIRONMENT}"
                },
                {
                    "name": "REACT_APP_API_URL",
                    "value": "$(grep BACKEND_URL .env | cut -d'=' -f2)/api"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/${ENVIRONMENT}-alhambra-frontend",
                    "awslogs-region": "${AWS_REGION}",
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

    # Backend task definition
    cat > backend-task-definition.json << EOF
{
    "family": "${ENVIRONMENT}-alhambra-backend",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "512",
    "memory": "1024",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${STACK_NAME}-ECSTaskExecutionRole",
    "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${STACK_NAME}-ECSTaskRole",
    "containerDefinitions": [
        {
            "name": "backend",
            "image": "${BACKEND_REPO_URI}:latest",
            "portMappings": [
                {
                    "containerPort": 5000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "NODE_ENV",
                    "value": "${ENVIRONMENT}"
                },
                {
                    "name": "PORT",
                    "value": "5000"
                },
                {
                    "name": "DATABASE_URL",
                    "value": "postgresql://alhambra_admin:$(grep DB_PASSWORD .env | cut -d'=' -f2)@$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text):5432/alhambra_bank"
                },
                {
                    "name": "REDIS_URL",
                    "value": "redis://$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' --output text):6379"
                },
                {
                    "name": "JWT_SECRET",
                    "value": "$(grep JWT_SECRET .env | cut -d'=' -f2)"
                },
                {
                    "name": "AWS_REGION",
                    "value": "${AWS_REGION}"
                },
                {
                    "name": "S3_BUCKET_NAME",
                    "value": "$(grep S3_BUCKET_NAME .env | cut -d'=' -f2)"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/${ENVIRONMENT}-alhambra-backend",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
EOF

    # Register task definitions
    aws ecs register-task-definition --cli-input-json file://frontend-task-definition.json
    aws ecs register-task-definition --cli-input-json file://backend-task-definition.json
    
    print_status "Task definitions created"
}

# Create ECS services
create_ecs_services() {
    print_info "Creating ECS services..."
    
    # Get subnet and security group IDs
    PRIVATE_SUBNET_1=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet1`].OutputValue' \
        --output text)
    
    PRIVATE_SUBNET_2=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`PrivateSubnet2`].OutputValue' \
        --output text)
    
    ECS_SECURITY_GROUP=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSSecurityGroup`].OutputValue' \
        --output text)
    
    FRONTEND_TARGET_GROUP=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendTargetGroup`].OutputValue' \
        --output text)
    
    BACKEND_TARGET_GROUP=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`BackendTargetGroup`].OutputValue' \
        --output text)
    
    # Create frontend service
    aws ecs create-service \
        --cluster ${CLUSTER_NAME} \
        --service-name "${ENVIRONMENT}-alhambra-frontend" \
        --task-definition "${ENVIRONMENT}-alhambra-frontend" \
        --desired-count 2 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_1},${PRIVATE_SUBNET_2}],securityGroups=[${ECS_SECURITY_GROUP}],assignPublicIp=DISABLED}" \
        --load-balancers "targetGroupArn=${FRONTEND_TARGET_GROUP},containerName=frontend,containerPort=3000" \
        --health-check-grace-period-seconds 300 || true
    
    # Create backend service
    aws ecs create-service \
        --cluster ${CLUSTER_NAME} \
        --service-name "${ENVIRONMENT}-alhambra-backend" \
        --task-definition "${ENVIRONMENT}-alhambra-backend" \
        --desired-count 2 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_1},${PRIVATE_SUBNET_2}],securityGroups=[${ECS_SECURITY_GROUP}],assignPublicIp=DISABLED}" \
        --load-balancers "targetGroupArn=${BACKEND_TARGET_GROUP},containerName=backend,containerPort=5000" \
        --health-check-grace-period-seconds 300 || true
    
    print_status "ECS services created"
}

# Initialize database
initialize_database() {
    print_info "Initializing database..."
    
    # Get database endpoint
    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text)
    
    # Run database initialization script
    PGPASSWORD=$(grep DB_PASSWORD .env | cut -d'=' -f2) psql \
        -h ${DB_ENDPOINT} \
        -U alhambra_admin \
        -d alhambra_bank \
        -f database-init.sql || print_warning "Database may already be initialized"
    
    print_status "Database initialized"
}

# Setup monitoring
setup_monitoring() {
    print_info "Setting up monitoring..."
    
    # Create CloudWatch dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name "Alhambra-Bank-${ENVIRONMENT}" \
        --dashboard-body file://monitoring/cloudwatch-dashboard.json || true
    
    print_status "Monitoring setup completed"
}

# Display deployment information
display_deployment_info() {
    echo ""
    echo -e "${GREEN}🎉 Deployment Completed Successfully!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Get outputs
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
        --output text)
    
    echo -e "🌐 Application Load Balancer: ${YELLOW}http://${ALB_DNS}${NC}"
    echo -e "🚀 CloudFront Distribution: ${YELLOW}https://${CLOUDFRONT_DOMAIN}${NC}"
    echo -e "🏦 Custom Domain: ${YELLOW}https://$(grep DOMAIN_NAME .env | cut -d'=' -f2)${NC}"
    echo ""
    echo -e "📊 Monitoring:"
    echo -e "   - CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=Alhambra-Bank-${ENVIRONMENT}"
    echo -e "   - ECS Cluster: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${CLUSTER_NAME}"
    echo ""
    echo -e "🔧 Management:"
    echo -e "   - Update services: ./deploy.sh ${ENVIRONMENT}"
    echo -e "   - View logs: aws logs tail /ecs/${ENVIRONMENT}-alhambra-frontend --follow"
    echo -e "   - Scale services: aws ecs update-service --cluster ${CLUSTER_NAME} --service ${ENVIRONMENT}-alhambra-frontend --desired-count 3"
    echo ""
}

# Main deployment process
main() {
    check_prerequisites
    create_env_file
    deploy_infrastructure
    build_and_push_images
    deploy_ecs_services
    initialize_database
    setup_monitoring
    display_deployment_info
}

# Run main function
main

print_status "Alhambra Bank & Trust deployment completed successfully!"
