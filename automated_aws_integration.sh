#!/bin/bash

# Alhambra Bank & Trust - Automated AWS Integration Script
# AWS Account: 600043382145
# This script automates the integration of the admin dashboard with existing AWS infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
AWS_ACCOUNT_ID="600043382145"
AWS_REGION="us-east-1"
PROJECT_NAME="alhambra-admin"

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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

success() {
    echo -e "${PURPLE}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

# Banner
echo -e "${PURPLE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        Alhambra Bank & Trust - AWS Integration Script       ║
║                                                              ║
║        Automated Admin Dashboard Integration                 ║
║        AWS Account: 600043382145                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

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
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        warn "jq is not installed. Installing jq..."
        sudo apt-get update && sudo apt-get install -y jq
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
    
    success "Prerequisites check passed ✓"
}

# Discover existing infrastructure
discover_infrastructure() {
    log "Discovering existing AWS infrastructure..."
    
    # Create assessment directory
    mkdir -p ~/aws-integration-assessment
    cd ~/aws-integration-assessment
    
    # Discover VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=false" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
    fi
    
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        error "No VPC found. Please create a VPC first."
    fi
    
    info "Using VPC: $VPC_ID"
    
    # Discover subnets
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text --region $AWS_REGION)
    SUBNET_ARRAY=($SUBNET_IDS)
    
    if [ ${#SUBNET_ARRAY[@]} -lt 2 ]; then
        error "At least 2 subnets required for deployment."
    fi
    
    SUBNET1=${SUBNET_ARRAY[0]}
    SUBNET2=${SUBNET_ARRAY[1]}
    
    info "Using Subnets: $SUBNET1, $SUBNET2"
    
    # Check existing RDS
    EXISTING_RDS=$(aws rds describe-db-instances --query 'DBInstances[?Engine==`postgres`].[DBInstanceIdentifier]' --output text --region $AWS_REGION 2>/dev/null || echo "")
    if [ ! -z "$EXISTING_RDS" ]; then
        info "Found existing PostgreSQL RDS: $EXISTING_RDS"
        USE_EXISTING_RDS=true
    else
        info "No existing PostgreSQL RDS found. Will create new instance."
        USE_EXISTING_RDS=false
    fi
    
    # Check existing Redis
    EXISTING_REDIS=$(aws elasticache describe-cache-clusters --query 'CacheClusters[?Engine==`redis`].[CacheClusterId]' --output text --region $AWS_REGION 2>/dev/null || echo "")
    if [ ! -z "$EXISTING_REDIS" ]; then
        info "Found existing Redis cluster: $EXISTING_REDIS"
        USE_EXISTING_REDIS=true
    else
        info "No existing Redis cluster found. Will create new cluster."
        USE_EXISTING_REDIS=false
    fi
    
    # Check existing ECS cluster
    EXISTING_CLUSTER=$(aws ecs list-clusters --query 'clusterArns[0]' --output text --region $AWS_REGION 2>/dev/null | cut -d'/' -f2)
    if [ ! -z "$EXISTING_CLUSTER" ] && [ "$EXISTING_CLUSTER" != "None" ]; then
        info "Found existing ECS cluster: $EXISTING_CLUSTER"
        CLUSTER_NAME=$EXISTING_CLUSTER
        USE_EXISTING_CLUSTER=true
    else
        info "No existing ECS cluster found. Will create new cluster."
        CLUSTER_NAME="alhambra-admin-cluster"
        USE_EXISTING_CLUSTER=false
    fi
    
    success "Infrastructure discovery completed ✓"
}

# Create security group
create_security_group() {
    log "Creating security group for admin dashboard..."
    
    # Check if security group already exists
    ADMIN_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=alhambra-admin-dashboard-sg" "Name=vpc-id,Values=$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)
    
    if [ "$ADMIN_SG_ID" != "None" ] && [ -n "$ADMIN_SG_ID" ]; then
        info "Security group already exists: $ADMIN_SG_ID"
    else
        ADMIN_SG_ID=$(aws ec2 create-security-group \
            --group-name alhambra-admin-dashboard-sg \
            --description "Security group for Alhambra Admin Dashboard" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text \
            --region $AWS_REGION)
        
        # Add inbound rules
        aws ec2 authorize-security-group-ingress \
            --group-id $ADMIN_SG_ID \
            --protocol tcp \
            --port 3000 \
            --source-group $ADMIN_SG_ID \
            --region $AWS_REGION 2>/dev/null || true
        
        aws ec2 authorize-security-group-ingress \
            --group-id $ADMIN_SG_ID \
            --protocol tcp \
            --port 5432 \
            --source-group $ADMIN_SG_ID \
            --region $AWS_REGION 2>/dev/null || true
        
        aws ec2 authorize-security-group-ingress \
            --group-id $ADMIN_SG_ID \
            --protocol tcp \
            --port 6379 \
            --source-group $ADMIN_SG_ID \
            --region $AWS_REGION 2>/dev/null || true
        
        success "Security group created: $ADMIN_SG_ID ✓"
    fi
}

# Create IAM roles
create_iam_roles() {
    log "Creating IAM roles..."
    
    # Create trust policy
    cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create execution role
    if ! aws iam get-role --role-name alhambra-admin-execution-role &>/dev/null; then
        aws iam create-role \
            --role-name alhambra-admin-execution-role \
            --assume-role-policy-document file:///tmp/trust-policy.json \
            --region $AWS_REGION
        
        aws iam attach-role-policy \
            --role-name alhambra-admin-execution-role \
            --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
            --region $AWS_REGION
        
        success "Execution role created ✓"
    else
        info "Execution role already exists ✓"
    fi
    
    # Create task role
    if ! aws iam get-role --role-name alhambra-admin-task-role &>/dev/null; then
        aws iam create-role \
            --role-name alhambra-admin-task-role \
            --assume-role-policy-document file:///tmp/trust-policy.json \
            --region $AWS_REGION
        
        # Create custom policy
        cat > /tmp/admin-task-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF

        if ! aws iam get-policy --policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/alhambra-admin-task-policy &>/dev/null; then
            aws iam create-policy \
                --policy-name alhambra-admin-task-policy \
                --policy-document file:///tmp/admin-task-policy.json \
                --region $AWS_REGION
        fi
        
        aws iam attach-role-policy \
            --role-name alhambra-admin-task-role \
            --policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/alhambra-admin-task-policy \
            --region $AWS_REGION
        
        success "Task role created ✓"
    else
        info "Task role already exists ✓"
    fi
    
    # Clean up temporary files
    rm -f /tmp/trust-policy.json /tmp/admin-task-policy.json
}

# Setup database
setup_database() {
    if [ "$USE_EXISTING_RDS" = true ]; then
        log "Using existing RDS instance: $EXISTING_RDS"
        DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $EXISTING_RDS --query 'DBInstances[0].Endpoint.Address' --output text --region $AWS_REGION)
        info "Database endpoint: $DB_ENDPOINT"
    else
        log "Creating new RDS instance..."
        
        # Create DB subnet group
        if ! aws rds describe-db-subnet-groups --db-subnet-group-name alhambra-admin-subnet-group --region $AWS_REGION &>/dev/null; then
            aws rds create-db-subnet-group \
                --db-subnet-group-name alhambra-admin-subnet-group \
                --db-subnet-group-description "Subnet group for Alhambra Admin Database" \
                --subnet-ids $SUBNET1 $SUBNET2 \
                --region $AWS_REGION
        fi
        
        # Create RDS instance
        if ! aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --region $AWS_REGION &>/dev/null; then
            aws rds create-db-instance \
                --db-instance-identifier alhambra-admin-db \
                --db-instance-class db.t3.micro \
                --engine postgres \
                --engine-version 14.9 \
                --master-username admin \
                --master-user-password "AdminPass2025!" \
                --allocated-storage 20 \
                --storage-type gp2 \
                --vpc-security-group-ids $ADMIN_SG_ID \
                --db-subnet-group-name alhambra-admin-subnet-group \
                --backup-retention-period 7 \
                --storage-encrypted \
                --region $AWS_REGION
            
            info "RDS instance creation initiated. This will take 10-15 minutes..."
            aws rds wait db-instance-available --db-instance-identifier alhambra-admin-db --region $AWS_REGION
        fi
        
        DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --query 'DBInstances[0].Endpoint.Address' --output text --region $AWS_REGION)
        success "RDS instance ready: $DB_ENDPOINT ✓"
    fi
}

# Setup Redis
setup_redis() {
    if [ "$USE_EXISTING_REDIS" = true ]; then
        log "Using existing Redis cluster: $EXISTING_REDIS"
        REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id $EXISTING_REDIS --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text --region $AWS_REGION)
        info "Redis endpoint: $REDIS_ENDPOINT"
    else
        log "Creating new Redis cluster..."
        
        # Create Redis subnet group
        if ! aws elasticache describe-cache-subnet-groups --cache-subnet-group-name alhambra-admin-redis-subnet --region $AWS_REGION &>/dev/null; then
            aws elasticache create-cache-subnet-group \
                --cache-subnet-group-name alhambra-admin-redis-subnet \
                --cache-subnet-group-description "Redis subnet group for admin dashboard" \
                --subnet-ids $SUBNET1 $SUBNET2 \
                --region $AWS_REGION
        fi
        
        # Create Redis cluster
        if ! aws elasticache describe-cache-clusters --cache-cluster-id alhambra-admin-redis --region $AWS_REGION &>/dev/null; then
            aws elasticache create-cache-cluster \
                --cache-cluster-id alhambra-admin-redis \
                --cache-node-type cache.t3.micro \
                --engine redis \
                --num-cache-nodes 1 \
                --cache-subnet-group-name alhambra-admin-redis-subnet \
                --security-group-ids $ADMIN_SG_ID \
                --region $AWS_REGION
            
            info "Redis cluster creation initiated. This will take 5-10 minutes..."
            # Wait for Redis to be available
            while true; do
                STATUS=$(aws elasticache describe-cache-clusters --cache-cluster-id alhambra-admin-redis --query 'CacheClusters[0].CacheClusterStatus' --output text --region $AWS_REGION)
                if [ "$STATUS" = "available" ]; then
                    break
                fi
                sleep 30
            done
        fi
        
        REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id alhambra-admin-redis --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text --region $AWS_REGION)
        success "Redis cluster ready: $REDIS_ENDPOINT ✓"
    fi
}

# Create secrets
create_secrets() {
    log "Creating AWS Secrets..."
    
    # Database credentials
    if ! aws secretsmanager describe-secret --secret-id alhambra-admin-db-credentials --region $AWS_REGION &>/dev/null; then
        aws secretsmanager create-secret \
            --name alhambra-admin-db-credentials \
            --description "Database credentials for admin dashboard" \
            --secret-string "{\"username\":\"admin\",\"password\":\"AdminPass2025!\",\"host\":\"$DB_ENDPOINT\",\"port\":\"5432\",\"database\":\"alhambra_admin\"}" \
            --region $AWS_REGION
        success "Database credentials secret created ✓"
    else
        info "Database credentials secret already exists ✓"
    fi
    
    # JWT secret
    if ! aws secretsmanager describe-secret --secret-id alhambra-admin-jwt-secret --region $AWS_REGION &>/dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        aws secretsmanager create-secret \
            --name alhambra-admin-jwt-secret \
            --description "JWT secret for admin dashboard" \
            --secret-string "{\"secret\":\"$JWT_SECRET\"}" \
            --region $AWS_REGION
        success "JWT secret created ✓"
    else
        info "JWT secret already exists ✓"
    fi
    
    # Redis URL
    if ! aws secretsmanager describe-secret --secret-id alhambra-admin-redis-url --region $AWS_REGION &>/dev/null; then
        aws secretsmanager create-secret \
            --name alhambra-admin-redis-url \
            --description "Redis URL for admin dashboard" \
            --secret-string "{\"url\":\"redis://$REDIS_ENDPOINT:6379\"}" \
            --region $AWS_REGION
        success "Redis URL secret created ✓"
    else
        info "Redis URL secret already exists ✓"
    fi
}

# Setup ECR and build image
setup_ecr_and_build() {
    log "Setting up ECR repository and building image..."
    
    # Create ECR repository
    if ! aws ecr describe-repositories --repository-names alhambra-admin-dashboard --region $AWS_REGION &>/dev/null; then
        aws ecr create-repository \
            --repository-name alhambra-admin-dashboard \
            --image-scanning-configuration scanOnPush=true \
            --region $AWS_REGION
        success "ECR repository created ✓"
    else
        info "ECR repository already exists ✓"
    fi
    
    # Get repository URI
    REPO_URI=$(aws ecr describe-repositories --repository-names alhambra-admin-dashboard --query 'repositories[0].repositoryUri' --output text --region $AWS_REGION)
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build and push image
    cd /home/ubuntu/alhambra-bank-trust
    docker build -f Dockerfile.admin -t alhambra-admin-dashboard .
    docker tag alhambra-admin-dashboard:latest $REPO_URI:latest
    docker push $REPO_URI:latest
    
    success "Docker image built and pushed ✓"
}

# Setup ECS
setup_ecs() {
    if [ "$USE_EXISTING_CLUSTER" = false ]; then
        log "Creating ECS cluster..."
        aws ecs create-cluster \
            --cluster-name $CLUSTER_NAME \
            --capacity-providers FARGATE \
            --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
            --region $AWS_REGION
        success "ECS cluster created: $CLUSTER_NAME ✓"
    else
        info "Using existing ECS cluster: $CLUSTER_NAME ✓"
    fi
    
    # Create CloudWatch log group
    if ! aws logs describe-log-groups --log-group-name-prefix "/ecs/alhambra-admin-dashboard" --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "/ecs/alhambra-admin-dashboard"; then
        aws logs create-log-group \
            --log-group-name "/ecs/alhambra-admin-dashboard" \
            --retention-in-days 30 \
            --region $AWS_REGION
        success "CloudWatch log group created ✓"
    else
        info "CloudWatch log group already exists ✓"
    fi
    
    # Create task definition
    cat > /tmp/admin-task-definition.json << EOF
{
  "family": "alhambra-admin-dashboard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/alhambra-admin-execution-role",
  "taskRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/alhambra-admin-task-role",
  "containerDefinitions": [
    {
      "name": "admin-dashboard",
      "image": "$REPO_URI:latest",
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
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
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
        --cli-input-json file:///tmp/admin-task-definition.json \
        --region $AWS_REGION
    
    success "Task definition registered ✓"
    
    # Create ECS service
    if ! aws ecs describe-services --cluster $CLUSTER_NAME --services alhambra-admin-service --region $AWS_REGION --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        aws ecs create-service \
            --cluster $CLUSTER_NAME \
            --service-name alhambra-admin-service \
            --task-definition alhambra-admin-dashboard \
            --desired-count 2 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNET1,$SUBNET2],securityGroups=[$ADMIN_SG_ID],assignPublicIp=ENABLED}" \
            --region $AWS_REGION
        
        success "ECS service created ✓"
        
        # Wait for service to be stable
        log "Waiting for service deployment to complete..."
        aws ecs wait services-stable \
            --cluster $CLUSTER_NAME \
            --services alhambra-admin-service \
            --region $AWS_REGION
        
        success "Service deployment completed ✓"
    else
        info "ECS service already exists ✓"
    fi
    
    # Clean up temporary file
    rm -f /tmp/admin-task-definition.json
}

# Get service information
get_service_info() {
    log "Getting service information..."
    
    # Get task ARNs
    TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name alhambra-admin-service --query 'taskArns' --output text --region $AWS_REGION)
    
    if [ -n "$TASK_ARNS" ]; then
        info "Service is running with tasks:"
        for TASK_ARN in $TASK_ARNS; do
            TASK_ID=$(basename $TASK_ARN)
            info "  - Task: $TASK_ID"
        done
        
        # Get task details for IP addresses
        FIRST_TASK=$(echo $TASK_ARNS | cut -d' ' -f1)
        TASK_DETAILS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $FIRST_TASK --query 'tasks[0].attachments[0].details' --output json --region $AWS_REGION)
        
        if [ "$TASK_DETAILS" != "null" ]; then
            PUBLIC_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="publicIPv4Address") | .value')
            PRIVATE_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="privateIPv4Address") | .value')
            
            if [ "$PUBLIC_IP" != "null" ] && [ -n "$PUBLIC_IP" ]; then
                success "Admin Dashboard URL: http://$PUBLIC_IP:3000"
                DASHBOARD_URL="http://$PUBLIC_IP:3000"
            fi
            
            if [ "$PRIVATE_IP" != "null" ] && [ -n "$PRIVATE_IP" ]; then
                info "Private IP: $PRIVATE_IP"
            fi
        fi
    else
        warn "No running tasks found"
    fi
}

# Create integration summary
create_summary() {
    log "Creating integration summary..."
    
    cat > ~/integration-summary.md << EOF
# Alhambra Bank & Trust - Admin Dashboard Integration Summary

## ✅ Integration Completed Successfully

**Date**: $(date)
**AWS Account**: $AWS_ACCOUNT_ID
**Region**: $AWS_REGION

## 🏗️ Infrastructure Created/Used

### ECS Service
- **Cluster**: $CLUSTER_NAME
- **Service**: alhambra-admin-service
- **Task Definition**: alhambra-admin-dashboard
- **Desired Count**: 2 instances

### Database
- **RDS Instance**: ${USE_EXISTING_RDS:+$EXISTING_RDS (existing)}${USE_EXISTING_RDS:-alhambra-admin-db (new)}
- **Engine**: PostgreSQL
- **Endpoint**: $DB_ENDPOINT

### Caching
- **ElastiCache**: ${USE_EXISTING_REDIS:+$EXISTING_REDIS (existing)}${USE_EXISTING_REDIS:-alhambra-admin-redis (new)}
- **Engine**: Redis
- **Endpoint**: $REDIS_ENDPOINT

### Security
- **VPC**: $VPC_ID
- **Security Group**: $ADMIN_SG_ID
- **Subnets**: $SUBNET1, $SUBNET2

### Container Registry
- **ECR Repository**: alhambra-admin-dashboard
- **Image URI**: $REPO_URI:latest

## 🔗 Access Information

### Admin Dashboard URL
${DASHBOARD_URL:-Check ECS console for task IP addresses}

### Default Admin Credentials
- **Username**: admin
- **Password**: RafiRamzi2025!!

## 📊 Monitoring

### CloudWatch
- **Log Group**: /ecs/alhambra-admin-dashboard
- **Region**: $AWS_REGION

## 🔧 Next Steps

1. **Access the admin dashboard** using the URL above
2. **Test all functionality** (login, client management, KYC, etc.)
3. **Set up database schema** by running the migration script
4. **Configure load balancer** if needed for production access
5. **Set up SSL certificate** for HTTPS access

## 🎯 Integration Status: COMPLETE ✅

The admin dashboard has been successfully integrated with your existing AWS infrastructure.
EOF

    success "Integration summary created: ~/integration-summary.md ✓"
}

# Main execution
main() {
    log "Starting Alhambra Bank & Trust Admin Dashboard AWS Integration"
    log "AWS Account: $AWS_ACCOUNT_ID"
    log "Region: $AWS_REGION"
    log "=========================================="
    
    check_prerequisites
    discover_infrastructure
    create_security_group
    create_iam_roles
    setup_database
    setup_redis
    create_secrets
    setup_ecr_and_build
    setup_ecs
    get_service_info
    create_summary
    
    log "=========================================="
    success "🎉 Integration completed successfully!"
    log "=========================================="
    
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    INTEGRATION COMPLETE!                    ║
║                                                              ║
║        Your Alhambra Bank & Trust Admin Dashboard           ║
║        has been successfully integrated with your           ║
║        existing AWS infrastructure.                          ║
║                                                              ║
║        Check ~/integration-summary.md for details           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    if [ ! -z "$DASHBOARD_URL" ]; then
        echo -e "${GREEN}🌐 Admin Dashboard URL: $DASHBOARD_URL${NC}"
        echo -e "${GREEN}👤 Username: admin${NC}"
        echo -e "${GREEN}🔑 Password: RafiRamzi2025!!${NC}"
    fi
}

# Handle script interruption
trap 'error "Integration interrupted"' INT TERM

# Run main function
main "$@"
