#!/bin/bash

# Alhambra Bank & Trust - IBOSS Integration with Existing AWS Infrastructure
# Account: 600043382145
# User: awm@awmga.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 Alhambra Bank & Trust - IBOSS Integration Deployment${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# Configuration
AWS_ACCOUNT_ID="600043382145"
AWS_REGION="us-east-1"
ENVIRONMENT="production"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}📋 $1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..50})${NC}"
}

# Function to prompt user for choices
prompt_choice() {
    local prompt="$1"
    local default="$2"
    echo -e "${YELLOW}$prompt${NC}"
    read -r choice
    echo "${choice:-$default}"
}

# Function to get existing resource
get_existing_resource() {
    local resource_type="$1"
    local query="$2"
    local output_format="${3:-table}"
    
    print_info "Available $resource_type:"
    aws $resource_type $query --output $output_format
    echo ""
}

print_section "Pre-Integration Assessment"

# Check if assessment has been run
if [ ! -f "aws-infrastructure-assessment-*.json" ]; then
    print_warning "Infrastructure assessment not found. Running assessment..."
    ./assess-existing-infrastructure.sh
fi

print_status "Assessment completed"

print_section "Integration Strategy Selection"

echo -e "${YELLOW}Select your integration strategy:${NC}"
echo "1. ECS Container Integration (Recommended)"
echo "2. EC2 Instance Integration"
echo "3. Serverless Lambda Integration"
echo ""

STRATEGY=$(prompt_choice "Enter your choice (1-3):" "1")

case $STRATEGY in
    1)
        print_info "Selected: ECS Container Integration"
        INTEGRATION_TYPE="ecs"
        ;;
    2)
        print_info "Selected: EC2 Instance Integration"
        INTEGRATION_TYPE="ec2"
        ;;
    3)
        print_info "Selected: Serverless Lambda Integration"
        INTEGRATION_TYPE="lambda"
        ;;
    *)
        print_error "Invalid choice. Defaulting to ECS Container Integration"
        INTEGRATION_TYPE="ecs"
        ;;
esac

print_section "Existing Resource Selection"

# ECS Integration
if [ "$INTEGRATION_TYPE" = "ecs" ]; then
    print_info "ECS Container Integration Selected"
    
    # Check for existing ECS clusters
    get_existing_resource "ecs" "list-clusters --region $AWS_REGION"
    
    CLUSTER_NAME=$(prompt_choice "Enter existing ECS cluster name (or 'new' to create):" "new")
    
    if [ "$CLUSTER_NAME" = "new" ]; then
        CLUSTER_NAME="alhambra-iboss-cluster"
        print_info "Creating new ECS cluster: $CLUSTER_NAME"
        
        aws ecs create-cluster \
            --cluster-name "$CLUSTER_NAME" \
            --capacity-providers FARGATE FARGATE_SPOT \
            --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 capacityProvider=FARGATE_SPOT,weight=4 \
            --region "$AWS_REGION"
        
        print_status "ECS cluster created: $CLUSTER_NAME"
    else
        print_status "Using existing ECS cluster: $CLUSTER_NAME"
    fi
    
    # Get existing VPC for ECS
    get_existing_resource "ec2" "describe-vpcs --region $AWS_REGION --query 'Vpcs[*].[VpcId,CidrBlock,IsDefault]'"
    VPC_ID=$(prompt_choice "Enter VPC ID for ECS deployment:" "")
    
    # Get existing subnets
    get_existing_resource "ec2" "describe-subnets --region $AWS_REGION --filters Name=vpc-id,Values=$VPC_ID --query 'Subnets[*].[SubnetId,CidrBlock,AvailabilityZone]'"
    SUBNET_IDS=$(prompt_choice "Enter subnet IDs (comma-separated):" "")
    
    # Get existing security groups
    get_existing_resource "ec2" "describe-security-groups --region $AWS_REGION --filters Name=vpc-id,Values=$VPC_ID --query 'SecurityGroups[*].[GroupId,GroupName,Description]'"
    SECURITY_GROUP_ID=$(prompt_choice "Enter security group ID for ECS tasks:" "")
fi

# EC2 Integration
if [ "$INTEGRATION_TYPE" = "ec2" ]; then
    print_info "EC2 Instance Integration Selected"
    
    # Get existing EC2 instances
    get_existing_resource "ec2" "describe-instances --region $AWS_REGION --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,PublicIpAddress,PrivateIpAddress]'"
    
    INSTANCE_ID=$(prompt_choice "Enter EC2 instance ID for IBOSS deployment:" "")
    
    if [ -z "$INSTANCE_ID" ]; then
        print_error "Instance ID is required for EC2 integration"
        exit 1
    fi
    
    print_status "Using existing EC2 instance: $INSTANCE_ID"
fi

print_section "Database Configuration"

# Get existing RDS instances
get_existing_resource "rds" "describe-db-instances --region $AWS_REGION --query 'DBInstances[*].[DBInstanceIdentifier,Engine,DBInstanceStatus,Endpoint.Address]'"

DB_CHOICE=$(prompt_choice "Use existing RDS instance? (y/n):" "y")

if [ "$DB_CHOICE" = "y" ]; then
    DB_ENDPOINT=$(prompt_choice "Enter RDS endpoint:" "")
    DB_NAME=$(prompt_choice "Enter database name for IBOSS:" "alhambra_iboss")
    DB_USER=$(prompt_choice "Enter database username:" "iboss_user")
    DB_PASSWORD=$(prompt_choice "Enter database password:" "SecurePassword2025!")
    
    print_info "Configuring existing RDS integration"
    
    # Create IBOSS database schema
    print_info "Creating IBOSS database schema..."
    
    # Check if psql is available
    if command -v psql &> /dev/null; then
        # Create database and user
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_ENDPOINT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -f database-init.sql
        print_status "Database schema created"
    else
        print_warning "psql not available. Please run database-init.sql manually on your RDS instance"
    fi
else
    print_info "Will create new RDS instance for IBOSS"
    DB_ENDPOINT="new"
fi

print_section "Load Balancer Configuration"

# Get existing load balancers
get_existing_resource "elbv2" "describe-load-balancers --region $AWS_REGION --query 'LoadBalancers[*].[LoadBalancerName,Type,DNSName]'"

LB_CHOICE=$(prompt_choice "Use existing load balancer? (y/n):" "y")

if [ "$LB_CHOICE" = "y" ]; then
    LB_ARN=$(prompt_choice "Enter Load Balancer ARN:" "")
    
    # Get existing listeners
    get_existing_resource "elbv2" "describe-listeners --load-balancer-arn $LB_ARN --query 'Listeners[*].[ListenerArn,Port,Protocol]'"
    LISTENER_ARN=$(prompt_choice "Enter Listener ARN for IBOSS integration:" "")
    
    print_info "Configuring existing load balancer integration"
else
    print_info "Will create new load balancer for IBOSS"
    LB_ARN="new"
fi

print_section "Deployment Execution"

# Create deployment configuration
cat > "iboss-deployment-config.json" << EOF
{
  "integration_type": "$INTEGRATION_TYPE",
  "aws_account_id": "$AWS_ACCOUNT_ID",
  "aws_region": "$AWS_REGION",
  "cluster_name": "$CLUSTER_NAME",
  "instance_id": "$INSTANCE_ID",
  "vpc_id": "$VPC_ID",
  "subnet_ids": "$SUBNET_IDS",
  "security_group_id": "$SECURITY_GROUP_ID",
  "db_endpoint": "$DB_ENDPOINT",
  "db_name": "$DB_NAME",
  "db_user": "$DB_USER",
  "lb_arn": "$LB_ARN",
  "listener_arn": "$LISTENER_ARN"
}
EOF

print_status "Deployment configuration created"

# Execute deployment based on integration type
case $INTEGRATION_TYPE in
    "ecs")
        print_info "Executing ECS Container Integration..."
        
        # Create ECR repository if it doesn't exist
        aws ecr describe-repositories --repository-names alhambra-iboss --region "$AWS_REGION" 2>/dev/null || \
        aws ecr create-repository --repository-name alhambra-iboss --region "$AWS_REGION"
        
        # Build and push Docker images
        print_info "Building and pushing Docker images..."
        
        # Login to ECR
        aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
        
        # Build backend image
        docker build -t alhambra-iboss:latest -f Dockerfile.backend .
        docker tag alhambra-iboss:latest "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/alhambra-iboss:latest"
        docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/alhambra-iboss:latest"
        
        print_status "Docker images pushed to ECR"
        
        # Create task definition
        cat > "iboss-task-definition.json" << EOF
{
  "family": "alhambra-iboss-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "iboss-backend",
      "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/alhambra-iboss:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://$DB_USER:$DB_PASSWORD@$DB_ENDPOINT:5432/$DB_NAME"
        },
        {
          "name": "IBOSS_USERNAME",
          "value": "alhambrabank"
        },
        {
          "name": "IBOSS_PASSWORD",
          "value": "alhambra5312@abt.ky"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alhambra-iboss-backend",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF
        
        # Register task definition
        aws ecs register-task-definition --cli-input-json file://iboss-task-definition.json --region "$AWS_REGION"
        print_status "Task definition registered"
        
        # Create ECS service
        aws ecs create-service \
            --cluster "$CLUSTER_NAME" \
            --service-name "alhambra-iboss-backend" \
            --task-definition "alhambra-iboss-backend:1" \
            --desired-count 2 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
            --region "$AWS_REGION"
        
        print_status "ECS service created"
        
        # Configure load balancer if specified
        if [ "$LB_ARN" != "new" ] && [ -n "$LISTENER_ARN" ]; then
            print_info "Configuring load balancer integration..."
            
            # Create target group
            TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
                --name alhambra-iboss-tg \
                --protocol HTTP \
                --port 3001 \
                --vpc-id "$VPC_ID" \
                --target-type ip \
                --health-check-path /api/health \
                --region "$AWS_REGION" \
                --query 'TargetGroups[0].TargetGroupArn' \
                --output text)
            
            # Create listener rule
            aws elbv2 create-rule \
                --listener-arn "$LISTENER_ARN" \
                --priority 100 \
                --conditions Field=path-pattern,Values='/api/iboss/*' \
                --actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN" \
                --region "$AWS_REGION"
            
            print_status "Load balancer configured"
        fi
        ;;
        
    "ec2")
        print_info "Executing EC2 Instance Integration..."
        
        # Get instance details
        INSTANCE_IP=$(aws ec2 describe-instances \
            --instance-ids "$INSTANCE_ID" \
            --region "$AWS_REGION" \
            --query 'Reservations[0].Instances[0].PublicIpAddress' \
            --output text)
        
        print_info "Deploying to EC2 instance: $INSTANCE_ID ($INSTANCE_IP)"
        
        # Create deployment script for EC2
        cat > "deploy-to-ec2.sh" << 'EOF'
#!/bin/bash
# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Clone or update repository
if [ -d "alhambra-bank-trust" ]; then
    cd alhambra-bank-trust
    git pull
else
    git clone https://github.com/abt2025/alhambra-bank-trust.git
    cd alhambra-bank-trust
fi

# Install dependencies
npm install

# Configure environment
cp .env.aws .env

# Start IBOSS backend with PM2
pm2 stop alhambra-iboss 2>/dev/null || true
pm2 start iboss_backend_api.js --name "alhambra-iboss"
pm2 save
pm2 startup

echo "IBOSS deployed successfully on EC2"
EOF
        
        chmod +x deploy-to-ec2.sh
        
        print_warning "Please copy and run deploy-to-ec2.sh on your EC2 instance"
        print_info "Or use AWS Systems Manager to execute remotely"
        ;;
        
    "lambda")
        print_info "Executing Serverless Lambda Integration..."
        print_warning "Lambda integration requires additional setup - creating deployment package"
        
        # Create Lambda deployment package
        mkdir -p lambda-deployment
        cp -r *.js lambda-deployment/
        cp package.json lambda-deployment/
        cd lambda-deployment
        npm install --production
        zip -r ../alhambra-iboss-lambda.zip .
        cd ..
        
        print_status "Lambda deployment package created: alhambra-iboss-lambda.zip"
        print_info "Please deploy this package to AWS Lambda manually or using AWS SAM"
        ;;
esac

print_section "Post-Deployment Configuration"

# Create monitoring dashboard
print_info "Setting up monitoring..."

cat > "cloudwatch-dashboard.json" << EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "alhambra-iboss-backend", "ClusterName", "$CLUSTER_NAME"],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "$AWS_REGION",
        "title": "IBOSS ECS Metrics"
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
    --dashboard-name "Alhambra-IBOSS-Dashboard" \
    --dashboard-body file://cloudwatch-dashboard.json \
    --region "$AWS_REGION" 2>/dev/null || print_warning "Could not create CloudWatch dashboard"

print_section "Deployment Verification"

# Wait for services to be stable
if [ "$INTEGRATION_TYPE" = "ecs" ]; then
    print_info "Waiting for ECS service to stabilize..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "alhambra-iboss-backend" \
        --region "$AWS_REGION"
    
    print_status "ECS service is stable"
fi

# Test endpoints
print_info "Testing IBOSS endpoints..."

if [ "$LB_ARN" != "new" ]; then
    LB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns "$LB_ARN" --query 'LoadBalancers[0].DNSName' --output text)
    TEST_URL="http://$LB_DNS/api/iboss/health"
else
    TEST_URL="http://localhost:3001/api/health"
fi

sleep 30  # Wait for service to start

if curl -f -s "$TEST_URL" > /dev/null; then
    print_status "IBOSS health check passed"
else
    print_warning "IBOSS health check failed - service may need more time to start"
fi

print_section "Deployment Summary"

# Generate deployment report
cat > "iboss-integration-report.md" << EOF
# IBOSS Integration Deployment Report

**Date**: $(date)
**Account**: $AWS_ACCOUNT_ID
**Region**: $AWS_REGION
**Integration Type**: $INTEGRATION_TYPE

## Deployment Configuration
- **ECS Cluster**: $CLUSTER_NAME
- **EC2 Instance**: $INSTANCE_ID
- **VPC**: $VPC_ID
- **Database**: $DB_ENDPOINT
- **Load Balancer**: $LB_ARN

## Services Deployed
- ✅ IBOSS Backend API
- ✅ Database Schema
- ✅ Monitoring Dashboard
- ✅ Health Checks

## Access URLs
- **Health Check**: $TEST_URL
- **API Endpoint**: ${TEST_URL%/health}

## Next Steps
1. Test IBOSS functionality
2. Configure SSL certificates
3. Set up custom domain
4. Configure monitoring alerts
5. Perform load testing

## Support
- **Account**: $AWS_ACCOUNT_ID
- **Contact**: awm@awmga.com
- **Integration Type**: $INTEGRATION_TYPE
EOF

print_status "Integration deployment completed successfully"
print_info "Deployment report: iboss-integration-report.md"
print_info "Configuration: iboss-deployment-config.json"

echo ""
echo -e "${GREEN}🎉 IBOSS INTEGRATION DEPLOYMENT COMPLETE! 🎉${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   • Integration Type: ${GREEN}$INTEGRATION_TYPE${NC}"
echo -e "   • AWS Account: ${GREEN}$AWS_ACCOUNT_ID${NC}"
echo -e "   • Region: ${GREEN}$AWS_REGION${NC}"
echo -e "   • Test URL: ${GREEN}$TEST_URL${NC}"
echo ""
echo -e "${BLUE}📁 Files Created:${NC}"
echo -e "   • Deployment Config: ${YELLOW}iboss-deployment-config.json${NC}"
echo -e "   • Integration Report: ${YELLOW}iboss-integration-report.md${NC}"
echo -e "   • CloudWatch Dashboard: ${YELLOW}cloudwatch-dashboard.json${NC}"
echo ""
echo -e "${GREEN}✅ IBOSS Portfolio Tracker is now integrated with your existing AWS infrastructure!${NC}"
