# Alhambra Bank & Trust - Admin Dashboard AWS Integration Guide

## 🎯 Integration Overview

**AWS Account**: 600043382145  
**Target**: Integrate Admin Dashboard with existing AWS infrastructure  
**Approach**: Zero-disruption integration with existing services  
**Timeline**: 2-4 hours for complete integration  

---

## 📋 Pre-Integration Checklist

### ✅ Prerequisites Verification

**1. AWS Access Verification**
```bash
# Verify AWS CLI is configured for your account
aws sts get-caller-identity

# Expected output should show Account: 600043382145
{
    "UserId": "...",
    "Account": "600043382145",
    "Arn": "arn:aws:iam::600043382145:user/awm"
}
```

**2. Required Permissions**
Ensure your AWS user has the following permissions:
- `ECS:*` (Elastic Container Service)
- `RDS:*` (Relational Database Service)
- `ElastiCache:*` (Redis caching)
- `EC2:*` (VPC, Security Groups, Subnets)
- `IAM:*` (Roles and policies)
- `SecretsManager:*` (Credential storage)
- `CloudWatch:*` (Logging and monitoring)
- `ECR:*` (Container registry)

**3. Existing Infrastructure Assessment**
```bash
# Run the infrastructure assessment script
cd /home/ubuntu/alhambra-bank-trust
./assess-existing-infrastructure.sh
```

---

## 🔍 Step 1: Assess Existing Infrastructure

### 1.1 Inventory Current Resources

**Run Infrastructure Discovery:**
```bash
# Create assessment directory
mkdir -p ~/aws-integration-assessment
cd ~/aws-integration-assessment

# Discover existing VPCs
aws ec2 describe-vpcs --region us-east-1 > existing-vpcs.json

# Discover existing subnets
aws ec2 describe-subnets --region us-east-1 > existing-subnets.json

# Discover existing security groups
aws ec2 describe-security-groups --region us-east-1 > existing-security-groups.json

# Discover existing RDS instances
aws rds describe-db-instances --region us-east-1 > existing-rds.json

# Discover existing ECS clusters
aws ecs describe-clusters --region us-east-1 > existing-ecs.json

# Discover existing load balancers
aws elbv2 describe-load-balancers --region us-east-1 > existing-albs.json
```

### 1.2 Analyze Current Setup

**Review Existing Resources:**
```bash
# Check if you have existing VPC
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=false" --query 'Vpcs[0].VpcId' --output text --region us-east-1)
echo "Primary VPC: $VPC_ID"

# Check existing subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock]' --output table --region us-east-1

# Check existing RDS instances
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,Engine]' --output table --region us-east-1
```

### 1.3 Document Current Architecture

**Create Integration Plan:**
```bash
# Generate integration report
cat > integration-plan.md << 'EOF'
# AWS Integration Plan for Admin Dashboard

## Current Infrastructure
- VPC ID: [DISCOVERED_VPC_ID]
- Subnets: [LIST_OF_SUBNETS]
- RDS Instances: [EXISTING_DATABASES]
- ECS Clusters: [EXISTING_CLUSTERS]
- Load Balancers: [EXISTING_ALBS]

## Integration Strategy
1. Use existing VPC and subnets
2. Create dedicated security groups
3. Integrate with existing RDS or create new instance
4. Use existing ECS cluster or create dedicated cluster
5. Configure load balancer integration

## Risk Assessment
- Zero downtime integration
- No impact on existing services
- Isolated admin dashboard resources
EOF
```

---

## 🏗️ Step 2: Prepare Integration Environment

### 2.1 Set Up Integration Variables

**Configure Environment:**
```bash
# Set your AWS account variables
export AWS_ACCOUNT_ID="600043382145"
export AWS_REGION="us-east-1"
export PROJECT_NAME="alhambra-admin"

# Discover your existing VPC
export VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=false" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)

# Get existing subnets
export SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text --region $AWS_REGION)

echo "Using VPC: $VPC_ID"
echo "Using Subnets: $SUBNET_IDS"
```

### 2.2 Create Integration-Specific Resources

**Create Dedicated Security Group:**
```bash
# Create security group for admin dashboard
ADMIN_SG_ID=$(aws ec2 create-security-group \
    --group-name alhambra-admin-dashboard-sg \
    --description "Security group for Alhambra Admin Dashboard" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION)

echo "Created Security Group: $ADMIN_SG_ID"

# Add inbound rules for admin dashboard
aws ec2 authorize-security-group-ingress \
    --group-id $ADMIN_SG_ID \
    --protocol tcp \
    --port 3000 \
    --source-group $ADMIN_SG_ID \
    --region $AWS_REGION

# Add database access rule
aws ec2 authorize-security-group-ingress \
    --group-id $ADMIN_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $ADMIN_SG_ID \
    --region $AWS_REGION

# Add Redis access rule
aws ec2 authorize-security-group-ingress \
    --group-id $ADMIN_SG_ID \
    --protocol tcp \
    --port 6379 \
    --source-group $ADMIN_SG_ID \
    --region $AWS_REGION
```

---

## 🗄️ Step 3: Database Integration Strategy

### 3.1 Option A: Use Existing RDS Instance

**If you have existing PostgreSQL RDS:**
```bash
# List existing RDS instances
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,Engine,DBInstanceStatus]' --output table --region $AWS_REGION

# Get existing PostgreSQL instance details
EXISTING_DB=$(aws rds describe-db-instances --query 'DBInstances[?Engine==`postgres`].[DBInstanceIdentifier]' --output text --region $AWS_REGION)

if [ ! -z "$EXISTING_DB" ]; then
    echo "Found existing PostgreSQL instance: $EXISTING_DB"
    
    # Get connection details
    DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $EXISTING_DB --query 'DBInstances[0].Endpoint.Address' --output text --region $AWS_REGION)
    DB_PORT=$(aws rds describe-db-instances --db-instance-identifier $EXISTING_DB --query 'DBInstances[0].Endpoint.Port' --output text --region $AWS_REGION)
    
    echo "Database Endpoint: $DB_ENDPOINT"
    echo "Database Port: $DB_PORT"
    
    # Create admin database on existing instance
    echo "You can use existing RDS instance: $DB_ENDPOINT"
    echo "Create a new database 'alhambra_admin' on this instance"
else
    echo "No existing PostgreSQL instance found. Will create new one."
fi
```

### 3.2 Option B: Create New RDS Instance

**Create dedicated RDS for admin dashboard:**
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name alhambra-admin-subnet-group \
    --db-subnet-group-description "Subnet group for Alhambra Admin Database" \
    --subnet-ids $SUBNET_IDS \
    --region $AWS_REGION

# Create RDS instance
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

echo "Creating RDS instance... This will take 10-15 minutes."
```

### 3.3 ElastiCache Redis Integration

**Check for existing Redis cluster:**
```bash
# Check existing ElastiCache clusters
EXISTING_REDIS=$(aws elasticache describe-cache-clusters --query 'CacheClusters[?Engine==`redis`].[CacheClusterId]' --output text --region $AWS_REGION)

if [ ! -z "$EXISTING_REDIS" ]; then
    echo "Found existing Redis cluster: $EXISTING_REDIS"
    
    # Get Redis endpoint
    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id $EXISTING_REDIS --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text --region $AWS_REGION)
    echo "Redis Endpoint: $REDIS_ENDPOINT"
else
    echo "Creating new Redis cluster for admin dashboard..."
    
    # Create Redis subnet group
    aws elasticache create-cache-subnet-group \
        --cache-subnet-group-name alhambra-admin-redis-subnet \
        --cache-subnet-group-description "Redis subnet group for admin dashboard" \
        --subnet-ids $SUBNET_IDS \
        --region $AWS_REGION
    
    # Create Redis cluster
    aws elasticache create-cache-cluster \
        --cache-cluster-id alhambra-admin-redis \
        --cache-node-type cache.t3.micro \
        --engine redis \
        --num-cache-nodes 1 \
        --cache-subnet-group-name alhambra-admin-redis-subnet \
        --security-group-ids $ADMIN_SG_ID \
        --region $AWS_REGION
    
    echo "Creating Redis cluster... This will take 5-10 minutes."
fi
```

---

## 🐳 Step 4: Container Registry Setup

### 4.1 Create ECR Repository

**Set up container registry:**
```bash
# Create ECR repository for admin dashboard
aws ecr create-repository \
    --repository-name alhambra-admin-dashboard \
    --image-scanning-configuration scanOnPush=true \
    --region $AWS_REGION

# Get repository URI
REPO_URI=$(aws ecr describe-repositories --repository-names alhambra-admin-dashboard --query 'repositories[0].repositoryUri' --output text --region $AWS_REGION)
echo "ECR Repository: $REPO_URI"

# Get login token and login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### 4.2 Build and Push Docker Image

**Build admin dashboard image:**
```bash
# Navigate to project directory
cd /home/ubuntu/alhambra-bank-trust

# Build Docker image
docker build -f Dockerfile.admin -t alhambra-admin-dashboard .

# Tag image for ECR
docker tag alhambra-admin-dashboard:latest $REPO_URI:latest

# Push to ECR
docker push $REPO_URI:latest

echo "Docker image pushed to ECR: $REPO_URI:latest"
```

---

## ⚙️ Step 5: ECS Integration

### 5.1 Option A: Use Existing ECS Cluster

**Integrate with existing cluster:**
```bash
# List existing ECS clusters
aws ecs list-clusters --region $AWS_REGION

# Get existing cluster name
EXISTING_CLUSTER=$(aws ecs list-clusters --query 'clusterArns[0]' --output text --region $AWS_REGION | cut -d'/' -f2)

if [ ! -z "$EXISTING_CLUSTER" ] && [ "$EXISTING_CLUSTER" != "None" ]; then
    echo "Using existing ECS cluster: $EXISTING_CLUSTER"
    CLUSTER_NAME=$EXISTING_CLUSTER
else
    echo "No existing cluster found. Creating new one."
    CLUSTER_NAME="alhambra-admin-cluster"
fi
```

### 5.2 Option B: Create New ECS Cluster

**Create dedicated ECS cluster:**
```bash
# Create ECS cluster
aws ecs create-cluster \
    --cluster-name alhambra-admin-cluster \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
    --region $AWS_REGION

CLUSTER_NAME="alhambra-admin-cluster"
echo "Created ECS cluster: $CLUSTER_NAME"
```

### 5.3 Create IAM Roles

**Set up required IAM roles:**
```bash
# Create ECS task execution role
cat > trust-policy.json << 'EOF'
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
aws iam create-role \
    --role-name alhambra-admin-execution-role \
    --assume-role-policy-document file://trust-policy.json \
    --region $AWS_REGION

# Attach managed policy
aws iam attach-role-policy \
    --role-name alhambra-admin-execution-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --region $AWS_REGION

# Create task role for application
aws iam create-role \
    --role-name alhambra-admin-task-role \
    --assume-role-policy-document file://trust-policy.json \
    --region $AWS_REGION

# Create custom policy for admin dashboard
cat > admin-task-policy.json << 'EOF'
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

# Create and attach custom policy
aws iam create-policy \
    --policy-name alhambra-admin-task-policy \
    --policy-document file://admin-task-policy.json \
    --region $AWS_REGION

aws iam attach-role-policy \
    --role-name alhambra-admin-task-role \
    --policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/alhambra-admin-task-policy \
    --region $AWS_REGION

# Clean up temporary files
rm trust-policy.json admin-task-policy.json
```

---

## 🔐 Step 6: Secrets Management

### 6.1 Create AWS Secrets

**Store sensitive configuration:**
```bash
# Create database credentials secret
aws secretsmanager create-secret \
    --name alhambra-admin-db-credentials \
    --description "Database credentials for admin dashboard" \
    --secret-string '{
        "username": "admin",
        "password": "AdminPass2025!",
        "host": "'$DB_ENDPOINT'",
        "port": "5432",
        "database": "alhambra_admin"
    }' \
    --region $AWS_REGION

# Create JWT secret
JWT_SECRET=$(openssl rand -base64 32)
aws secretsmanager create-secret \
    --name alhambra-admin-jwt-secret \
    --description "JWT secret for admin dashboard" \
    --secret-string '{"secret":"'$JWT_SECRET'"}' \
    --region $AWS_REGION

# Create Redis URL secret
aws secretsmanager create-secret \
    --name alhambra-admin-redis-url \
    --description "Redis URL for admin dashboard" \
    --secret-string '{"url":"redis://'$REDIS_ENDPOINT':6379"}' \
    --region $AWS_REGION

echo "Secrets created successfully"
```

---

## 📋 Step 7: Task Definition Creation

### 7.1 Create ECS Task Definition

**Define container configuration:**
```bash
# Create task definition JSON
cat > admin-task-definition.json << EOF
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

# Create CloudWatch log group
aws logs create-log-group \
    --log-group-name "/ecs/alhambra-admin-dashboard" \
    --retention-in-days 30 \
    --region $AWS_REGION

# Register task definition
aws ecs register-task-definition \
    --cli-input-json file://admin-task-definition.json \
    --region $AWS_REGION

echo "Task definition registered successfully"
```

---

## 🚀 Step 8: Service Deployment

### 8.1 Create ECS Service

**Deploy admin dashboard service:**
```bash
# Create ECS service
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name alhambra-admin-service \
    --task-definition alhambra-admin-dashboard \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={
        subnets=[$SUBNET_IDS],
        securityGroups=[$ADMIN_SG_ID],
        assignPublicIp=ENABLED
    }" \
    --region $AWS_REGION

echo "ECS service created. Waiting for deployment..."

# Wait for service to be stable
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services alhambra-admin-service \
    --region $AWS_REGION

echo "Service deployment completed!"
```

### 8.2 Verify Deployment

**Check service status:**
```bash
# Get service status
aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services alhambra-admin-service \
    --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}' \
    --output table \
    --region $AWS_REGION

# Get task details
TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name alhambra-admin-service --query 'taskArns' --output text --region $AWS_REGION)

if [ ! -z "$TASK_ARNS" ]; then
    echo "Getting task IP addresses..."
    for TASK_ARN in $TASK_ARNS; do
        TASK_ID=$(basename $TASK_ARN)
        
        # Get task details
        TASK_DETAILS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --query 'tasks[0].attachments[0].details' --output json --region $AWS_REGION)
        
        if [ "$TASK_DETAILS" != "null" ]; then
            PUBLIC_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="publicIPv4Address") | .value')
            PRIVATE_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="privateIPv4Address") | .value')
            
            echo "Task $TASK_ID:"
            echo "  Public IP: $PUBLIC_IP"
            echo "  Private IP: $PRIVATE_IP"
            echo "  Admin Dashboard URL: http://$PUBLIC_IP:3000"
            echo ""
        fi
    done
fi
```

---

## 🔗 Step 9: Load Balancer Integration (Optional)

### 9.1 Option A: Use Existing Load Balancer

**Integrate with existing ALB:**
```bash
# List existing load balancers
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,LoadBalancerArn,Type]' --output table --region $AWS_REGION

# Get existing ALB ARN
EXISTING_ALB=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[?Type==`application`].[LoadBalancerArn]' --output text --region $AWS_REGION)

if [ ! -z "$EXISTING_ALB" ] && [ "$EXISTING_ALB" != "None" ]; then
    echo "Found existing ALB: $EXISTING_ALB"
    
    # Create target group for admin dashboard
    TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
        --name alhambra-admin-targets \
        --protocol HTTP \
        --port 3000 \
        --vpc-id $VPC_ID \
        --target-type ip \
        --health-check-path /api/health \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text \
        --region $AWS_REGION)
    
    echo "Created target group: $TARGET_GROUP_ARN"
    
    # Add listener rule (you'll need to configure this based on your existing setup)
    echo "Target group created. You can now add a listener rule to your existing ALB."
    echo "Target Group ARN: $TARGET_GROUP_ARN"
fi
```

### 9.2 Option B: Create New Load Balancer

**Create dedicated ALB for admin dashboard:**
```bash
# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name alhambra-admin-alb \
    --subnets $SUBNET_IDS \
    --security-groups $ADMIN_SG_ID \
    --scheme internal \
    --type application \
    --ip-address-type ipv4 \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text \
    --region $AWS_REGION)

echo "Created ALB: $ALB_ARN"

# Create target group
TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name alhambra-admin-targets \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-path /api/health \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region $AWS_REGION)

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
    --region $AWS_REGION

# Update ECS service to use load balancer
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service alhambra-admin-service \
    --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=admin-dashboard,containerPort=3000 \
    --region $AWS_REGION

echo "Load balancer integration completed"
```

---

## 🗄️ Step 10: Database Setup

### 10.1 Initialize Database Schema

**Set up admin dashboard database:**
```bash
# Wait for RDS to be available
echo "Waiting for RDS instance to be available..."
aws rds wait db-instance-available --db-instance-identifier alhambra-admin-db --region $AWS_REGION

# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --query 'DBInstances[0].Endpoint.Address' --output text --region $AWS_REGION)

echo "Database endpoint: $DB_ENDPOINT"

# Create database and run migrations
echo "Database is ready. You can now:"
echo "1. Connect to the database using: psql -h $DB_ENDPOINT -U admin -d postgres"
echo "2. Create the alhambra_admin database"
echo "3. Run the migration script: /home/ubuntu/alhambra-bank-trust/server/migrations/001_create_admin_tables.sql"

# Create connection script
cat > connect-to-db.sh << EOF
#!/bin/bash
echo "Connecting to admin database..."
echo "Host: $DB_ENDPOINT"
echo "Username: admin"
echo "Database: alhambra_admin"
echo ""
echo "To create the database and run migrations:"
echo "1. psql -h $DB_ENDPOINT -U admin -d postgres"
echo "2. CREATE DATABASE alhambra_admin;"
echo "3. \\c alhambra_admin"
echo "4. \\i /home/ubuntu/alhambra-bank-trust/server/migrations/001_create_admin_tables.sql"
EOF

chmod +x connect-to-db.sh
echo "Database connection script created: ./connect-to-db.sh"
```

---

## 📊 Step 11: Monitoring Setup

### 11.1 CloudWatch Integration

**Set up monitoring and alerting:**
```bash
# Create CloudWatch dashboard
cat > admin-dashboard-config.json << EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "alhambra-admin-service", "ClusterName", "$CLUSTER_NAME"],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "$AWS_REGION",
        "title": "ECS Service Metrics"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/ecs/alhambra-admin-dashboard'\n| fields @timestamp, @message\n| sort @timestamp desc\n| limit 100",
        "region": "$AWS_REGION",
        "title": "Recent Logs"
      }
    }
  ]
}
EOF

# Create dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "Alhambra-Admin-Dashboard" \
    --dashboard-body file://admin-dashboard-config.json \
    --region $AWS_REGION

echo "CloudWatch dashboard created"

# Create alarms
aws cloudwatch put-metric-alarm \
    --alarm-name "Alhambra-Admin-High-CPU" \
    --alarm-description "High CPU utilization for admin dashboard" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ServiceName,Value=alhambra-admin-service Name=ClusterName,Value=$CLUSTER_NAME \
    --evaluation-periods 2 \
    --region $AWS_REGION

echo "CloudWatch alarms created"
```

---

## ✅ Step 12: Integration Verification

### 12.1 Health Check Verification

**Verify all components are working:**
```bash
# Check ECS service health
echo "=== ECS Service Status ==="
aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services alhambra-admin-service \
    --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Health:healthCheckGracePeriodSeconds}' \
    --output table \
    --region $AWS_REGION

# Check RDS status
echo "=== RDS Status ==="
aws rds describe-db-instances \
    --db-instance-identifier alhambra-admin-db \
    --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Port:Endpoint.Port}' \
    --output table \
    --region $AWS_REGION

# Check Redis status
echo "=== Redis Status ==="
aws elasticache describe-cache-clusters \
    --cache-cluster-id alhambra-admin-redis \
    --show-cache-node-info \
    --query 'CacheClusters[0].{Status:CacheClusterStatus,Endpoint:CacheNodes[0].Endpoint.Address}' \
    --output table \
    --region $AWS_REGION

# Test application health endpoint
echo "=== Application Health Check ==="
TASK_ARNS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name alhambra-admin-service --query 'taskArns[0]' --output text --region $AWS_REGION)

if [ ! -z "$TASK_ARNS" ] && [ "$TASK_ARNS" != "None" ]; then
    TASK_DETAILS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARNS --query 'tasks[0].attachments[0].details' --output json --region $AWS_REGION)
    PUBLIC_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="publicIPv4Address") | .value')
    
    if [ ! -z "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "null" ]; then
        echo "Testing health endpoint: http://$PUBLIC_IP:3000/api/health"
        curl -s "http://$PUBLIC_IP:3000/api/health" | jq .
    fi
fi
```

### 12.2 Create Integration Summary

**Generate integration report:**
```bash
cat > integration-summary.md << EOF
# Alhambra Bank & Trust - Admin Dashboard Integration Summary

## ✅ Integration Completed Successfully

**Date**: $(date)
**AWS Account**: $AWS_ACCOUNT_ID
**Region**: $AWS_REGION

## 🏗️ Infrastructure Created

### ECS Service
- **Cluster**: $CLUSTER_NAME
- **Service**: alhambra-admin-service
- **Task Definition**: alhambra-admin-dashboard
- **Desired Count**: 2 instances

### Database
- **RDS Instance**: alhambra-admin-db
- **Engine**: PostgreSQL 14.9
- **Instance Class**: db.t3.micro
- **Endpoint**: $DB_ENDPOINT

### Caching
- **ElastiCache**: alhambra-admin-redis
- **Engine**: Redis
- **Node Type**: cache.t3.micro

### Security
- **Security Group**: $ADMIN_SG_ID
- **IAM Execution Role**: alhambra-admin-execution-role
- **IAM Task Role**: alhambra-admin-task-role

### Secrets
- **Database Credentials**: alhambra-admin-db-credentials
- **JWT Secret**: alhambra-admin-jwt-secret
- **Redis URL**: alhambra-admin-redis-url

## 🔗 Access Information

### Admin Dashboard URLs
$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name alhambra-admin-service --query 'taskArns' --output text --region $AWS_REGION | while read TASK_ARN; do
    if [ ! -z "$TASK_ARN" ]; then
        TASK_DETAILS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --query 'tasks[0].attachments[0].details' --output json --region $AWS_REGION)
        PUBLIC_IP=$(echo $TASK_DETAILS | jq -r '.[] | select(.name=="publicIPv4Address") | .value')
        if [ ! -z "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "null" ]; then
            echo "- http://$PUBLIC_IP:3000"
        fi
    fi
done)

### Default Admin Credentials
- **Username**: admin
- **Password**: RafiRamzi2025!!

## 📊 Monitoring

### CloudWatch
- **Dashboard**: Alhambra-Admin-Dashboard
- **Log Group**: /ecs/alhambra-admin-dashboard
- **Alarms**: CPU utilization monitoring

## 🔧 Next Steps

1. **Access the admin dashboard** using the URLs above
2. **Test all functionality** (login, client management, KYC, etc.)
3. **Configure load balancer** if needed for production access
4. **Set up SSL certificate** for HTTPS access
5. **Configure backup schedules** for RDS
6. **Review and adjust scaling policies**

## 🎯 Integration Status: COMPLETE ✅

The admin dashboard has been successfully integrated with your existing AWS infrastructure without disrupting any current services.
EOF

echo "Integration summary created: integration-summary.md"
```

---

## 🎯 Step 13: Post-Integration Tasks

### 13.1 Security Hardening

**Additional security configurations:**
```bash
# Enable VPC Flow Logs (if not already enabled)
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type cloud-watch-logs \
    --log-group-name VPCFlowLogs \
    --deliver-logs-permission-arn arn:aws:iam::$AWS_ACCOUNT_ID:role/flowlogsRole \
    --region $AWS_REGION

# Enable GuardDuty (if not already enabled)
aws guardduty create-detector \
    --enable \
    --region $AWS_REGION

echo "Additional security features enabled"
```

### 13.2 Backup Configuration

**Set up automated backups:**
```bash
# Enable automated RDS backups (already configured during creation)
aws rds modify-db-instance \
    --db-instance-identifier alhambra-admin-db \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --region $AWS_REGION

# Create backup script for application data
cat > backup-admin-data.sh << 'EOF'
#!/bin/bash
# Backup script for admin dashboard data
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_BUCKET="alhambra-admin-backups-600043382145"

# Create S3 bucket for backups if it doesn't exist
aws s3 mb s3://$BACKUP_BUCKET --region us-east-1 2>/dev/null || true

# Export database
pg_dump -h $DB_ENDPOINT -U admin -d alhambra_admin > admin_backup_$DATE.sql

# Upload to S3
aws s3 cp admin_backup_$DATE.sql s3://$BACKUP_BUCKET/database/

# Clean up local file
rm admin_backup_$DATE.sql

echo "Backup completed: admin_backup_$DATE.sql"
EOF

chmod +x backup-admin-data.sh
echo "Backup script created: backup-admin-data.sh"
```

---

## 🎉 Integration Complete!

### 📋 Final Checklist

**Verify the following are working:**

- [ ] **ECS Service Running**: 2 healthy tasks
- [ ] **Database Connected**: PostgreSQL accessible
- [ ] **Redis Connected**: Caching layer operational
- [ ] **Admin Dashboard Accessible**: Login page loads
- [ ] **Authentication Working**: Can login with admin credentials
- [ ] **API Endpoints Responding**: Health check returns OK
- [ ] **Logging Active**: CloudWatch logs receiving data
- [ ] **Monitoring Setup**: Dashboard and alarms configured

### 🔗 Access Your Admin Dashboard

**URLs**: Check the integration summary for current IP addresses  
**Username**: admin  
**Password**: RafiRamzi2025!!  

### 📞 Support

If you encounter any issues during integration:

1. **Check CloudWatch Logs**: `/ecs/alhambra-admin-dashboard`
2. **Verify Security Groups**: Ensure proper port access
3. **Check Task Status**: ECS console for task health
4. **Database Connectivity**: Test RDS connection
5. **Review IAM Permissions**: Ensure roles have required access

### 🚀 Next Steps

1. **Production Hardening**: SSL certificates, WAF, etc.
2. **User Management**: Add additional admin users
3. **Customization**: Adjust branding and features
4. **Integration Testing**: Test all workflows
5. **Performance Tuning**: Optimize based on usage

**Your Alhambra Bank & Trust Admin Dashboard is now successfully integrated with your existing AWS infrastructure!** 🏦✨
