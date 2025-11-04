# Alhambra Bank & Trust - Complete Admin Dashboard Deployment Documentation

## 🏦 Overview

**Project**: Internal Admin Dashboard with CRM Integration  
**AWS Account**: 600043382145  
**Client**: Alhambra Bank & Trust  
**Technology Stack**: React.js, Node.js, Express.js, PostgreSQL, Redis, Docker  
**Deployment Target**: AWS ECS Fargate with RDS and ElastiCache  

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Infrastructure Setup](#aws-infrastructure-setup)
3. [Database Configuration](#database-configuration)
4. [Application Deployment](#application-deployment)
5. [Security Configuration](#security-configuration)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Backup and Recovery](#backup-and-recovery)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)
10. [Support](#support)

---

## 🔧 Prerequisites

### Required Tools
- AWS CLI v2.x
- Docker 20.x+
- Node.js 18.x+
- PostgreSQL Client 14.x+
- Git 2.x+

### AWS Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "ecr:*",
        "rds:*",
        "elasticache:*",
        "ec2:*",
        "iam:*",
        "logs:*",
        "secretsmanager:*",
        "s3:*",
        "cloudformation:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Environment Setup
```bash
# Configure AWS CLI
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set default.region us-east-1
aws configure set default.output json

# Verify AWS account
aws sts get-caller-identity
# Should return Account: 600043382145
```

---

## ☁️ AWS Infrastructure Setup

### Step 1: Create VPC and Networking

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=alhambra-admin-vpc},{Key=Project,Value=AlhambraAdmin}]'

# Get VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=alhambra-admin-vpc" --query 'Vpcs[0].VpcId' --output text)

# Create Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=alhambra-admin-igw}]'

IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=alhambra-admin-igw" --query 'InternetGateways[0].InternetGatewayId' --output text)

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Create Public Subnets
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=alhambra-admin-public-1a}]'

aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=alhambra-admin-public-1b}]'

# Create Private Subnets
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.3.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=alhambra-admin-private-1a}]'

aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.4.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=alhambra-admin-private-1b}]'

# Get Subnet IDs
PUBLIC_SUBNET_1A=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=alhambra-admin-public-1a" --query 'Subnets[0].SubnetId' --output text)
PUBLIC_SUBNET_1B=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=alhambra-admin-public-1b" --query 'Subnets[0].SubnetId' --output text)
PRIVATE_SUBNET_1A=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=alhambra-admin-private-1a" --query 'Subnets[0].SubnetId' --output text)
PRIVATE_SUBNET_1B=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=alhambra-admin-private-1b" --query 'Subnets[0].SubnetId' --output text)

# Create Route Tables
aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=alhambra-admin-public-rt}]'

aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=alhambra-admin-private-rt}]'

PUBLIC_RT_ID=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=alhambra-admin-public-rt" --query 'RouteTables[0].RouteTableId' --output text)
PRIVATE_RT_ID=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=alhambra-admin-private-rt" --query 'RouteTables[0].RouteTableId' --output text)

# Add routes
aws ec2 create-route --route-table-id $PUBLIC_RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# Associate subnets with route tables
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_1A --route-table-id $PUBLIC_RT_ID
aws ec2 associate-route-table --subnet-id $PUBLIC_SUBNET_1B --route-table-id $PUBLIC_RT_ID
aws ec2 associate-route-table --subnet-id $PRIVATE_SUBNET_1A --route-table-id $PRIVATE_RT_ID
aws ec2 associate-route-table --subnet-id $PRIVATE_SUBNET_1B --route-table-id $PRIVATE_RT_ID
```

### Step 2: Create Security Groups

```bash
# Create ALB Security Group
aws ec2 create-security-group \
  --group-name alhambra-admin-alb-sg \
  --description "Security group for Alhambra Admin ALB" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=alhambra-admin-alb-sg}]'

ALB_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=alhambra-admin-alb-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Add ALB rules
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create ECS Security Group
aws ec2 create-security-group \
  --group-name alhambra-admin-ecs-sg \
  --description "Security group for Alhambra Admin ECS tasks" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=alhambra-admin-ecs-sg}]'

ECS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=alhambra-admin-ecs-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Add ECS rules
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID

# Create RDS Security Group
aws ec2 create-security-group \
  --group-name alhambra-admin-rds-sg \
  --description "Security group for Alhambra Admin RDS" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=alhambra-admin-rds-sg}]'

RDS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=alhambra-admin-rds-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Add RDS rules
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG_ID

# Create Redis Security Group
aws ec2 create-security-group \
  --group-name alhambra-admin-redis-sg \
  --description "Security group for Alhambra Admin Redis" \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=alhambra-admin-redis-sg}]'

REDIS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=alhambra-admin-redis-sg" --query 'SecurityGroups[0].GroupId' --output text)

# Add Redis rules
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG_ID \
  --protocol tcp \
  --port 6379 \
  --source-group $ECS_SG_ID
```

### Step 3: Create IAM Roles

```bash
# Create ECS Task Execution Role
cat > ecs-task-execution-role-trust-policy.json << EOF
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

aws iam create-role \
  --role-name AlhambraAdminECSTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-role-trust-policy.json

aws iam attach-role-policy \
  --role-name AlhambraAdminECSTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create ECS Task Role
cat > ecs-task-role-policy.json << EOF
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

aws iam create-policy \
  --policy-name AlhambraAdminECSTaskPolicy \
  --policy-document file://ecs-task-role-policy.json

aws iam create-role \
  --role-name AlhambraAdminECSTaskRole \
  --assume-role-policy-document file://ecs-task-execution-role-trust-policy.json

aws iam attach-role-policy \
  --role-name AlhambraAdminECSTaskRole \
  --policy-arn arn:aws:iam::600043382145:policy/AlhambraAdminECSTaskPolicy
```

---

## 🗄️ Database Configuration

### Step 1: Create RDS Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name alhambra-admin-subnet-group \
  --db-subnet-group-description "Subnet group for Alhambra Admin RDS" \
  --subnet-ids $PRIVATE_SUBNET_1A $PRIVATE_SUBNET_1B \
  --tags Key=Name,Value=alhambra-admin-subnet-group
```

### Step 2: Create RDS Parameter Group

```bash
aws rds create-db-parameter-group \
  --db-parameter-group-name alhambra-admin-pg14 \
  --db-parameter-group-family postgres14 \
  --description "Parameter group for Alhambra Admin PostgreSQL 14"

# Configure parameters for optimal performance
aws rds modify-db-parameter-group \
  --db-parameter-group-name alhambra-admin-pg14 \
  --parameters "ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot" \
              "ParameterName=log_statement,ParameterValue=all,ApplyMethod=immediate" \
              "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate"
```

### Step 3: Create RDS Instance

```bash
# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Store password in Secrets Manager
aws secretsmanager create-secret \
  --name "alhambra-admin/database" \
  --description "Database credentials for Alhambra Admin" \
  --secret-string "{\"username\":\"admin\",\"password\":\"$DB_PASSWORD\"}"

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier alhambra-admin-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.9 \
  --master-username admin \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp2 \
  --storage-encrypted \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name alhambra-admin-subnet-group \
  --db-parameter-group-name alhambra-admin-pg14 \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --multi-az \
  --auto-minor-version-upgrade \
  --deletion-protection \
  --tags Key=Name,Value=alhambra-admin-db Key=Project,Value=AlhambraAdmin

echo "Database password: $DB_PASSWORD"
echo "Please save this password securely!"
```

### Step 4: Create ElastiCache Subnet Group

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name alhambra-admin-cache-subnet-group \
  --cache-subnet-group-description "Cache subnet group for Alhambra Admin" \
  --subnet-ids $PRIVATE_SUBNET_1A $PRIVATE_SUBNET_1B
```

### Step 5: Create ElastiCache Redis Cluster

```bash
aws elasticache create-replication-group \
  --replication-group-id alhambra-admin-redis \
  --description "Redis cluster for Alhambra Admin" \
  --num-cache-clusters 2 \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --cache-parameter-group-name default.redis7 \
  --cache-subnet-group-name alhambra-admin-cache-subnet-group \
  --security-group-ids $REDIS_SG_ID \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --preferred-cache-cluster-azs us-east-1a us-east-1b \
  --tags Key=Name,Value=alhambra-admin-redis Key=Project,Value=AlhambraAdmin
```

### Step 6: Initialize Database Schema

```bash
# Wait for RDS to be available
aws rds wait db-instance-available --db-instance-identifier alhambra-admin-db

# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --query 'DBInstances[0].Endpoint.Address' --output text)

# Connect and create database
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U admin -d postgres -c "CREATE DATABASE alhambra_admin;"

# Run schema migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U admin -d alhambra_admin -f server/migrations/001_create_admin_tables.sql

echo "Database initialized successfully!"
echo "Database endpoint: $DB_ENDPOINT"
```

---

## 🚀 Application Deployment

### Step 1: Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name alhambra-admin-dashboard \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Get ECR URI
ECR_URI=$(aws ecr describe-repositories --repository-names alhambra-admin-dashboard --query 'repositories[0].repositoryUri' --output text)

echo "ECR Repository: $ECR_URI"
```

### Step 2: Build and Push Docker Image

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
docker build -t alhambra-admin-dashboard -f Dockerfile.admin .

# Tag image
docker tag alhambra-admin-dashboard:latest $ECR_URI:latest
docker tag alhambra-admin-dashboard:latest $ECR_URI:v1.0.0

# Push image
docker push $ECR_URI:latest
docker push $ECR_URI:v1.0.0

echo "Docker image pushed successfully!"
```

### Step 3: Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name alhambra-admin-alb \
  --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B \
  --security-groups $ALB_SG_ID \
  --tags Key=Name,Value=alhambra-admin-alb Key=Project,Value=AlhambraAdmin

# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers --names alhambra-admin-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Create target group
aws elbv2 create-target-group \
  --name alhambra-admin-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --tags Key=Name,Value=alhambra-admin-tg

# Get target group ARN
TG_ARN=$(aws elbv2 describe-target-groups --names alhambra-admin-tg --query 'TargetGroups[0].TargetGroupArn' --output text)

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].DNSName' --output text)

echo "Load Balancer DNS: $ALB_DNS"
```

### Step 4: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster \
  --cluster-name alhambra-admin-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --tags key=Name,value=alhambra-admin-cluster key=Project,value=AlhambraAdmin

echo "ECS Cluster created successfully!"
```

### Step 5: Create Secrets for Application

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")

# Create application secrets
aws secretsmanager create-secret \
  --name "alhambra-admin/app-secrets" \
  --description "Application secrets for Alhambra Admin" \
  --secret-string "{\"JWT_SECRET\":\"$JWT_SECRET\",\"NODE_ENV\":\"production\",\"AWS_ACCOUNT_ID\":\"600043382145\"}"

# Get Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-replication-groups --replication-group-id alhambra-admin-redis --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' --output text)

# Create database connection secret
aws secretsmanager create-secret \
  --name "alhambra-admin/database-url" \
  --description "Database connection URL for Alhambra Admin" \
  --secret-string "{\"DATABASE_URL\":\"postgresql://admin:$DB_PASSWORD@$DB_ENDPOINT:5432/alhambra_admin\",\"REDIS_URL\":\"redis://$REDIS_ENDPOINT:6379\"}"

echo "Application secrets created successfully!"
```

### Step 6: Create ECS Task Definition

```bash
# Create task definition JSON
cat > task-definition.json << EOF
{
  "family": "alhambra-admin-dashboard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::600043382145:role/AlhambraAdminECSTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::600043382145:role/AlhambraAdminECSTaskRole",
  "containerDefinitions": [
    {
      "name": "alhambra-admin-dashboard",
      "image": "$ECR_URI:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alhambra-admin-dashboard",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:600043382145:secret:alhambra-admin/database-url"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:600043382145:secret:alhambra-admin/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:600043382145:secret:alhambra-admin/app-secrets"
        }
      ],
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
          "value": "600043382145"
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/alhambra-admin-dashboard

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

echo "Task definition registered successfully!"
```

### Step 7: Create ECS Service

```bash
# Create service JSON
cat > service-definition.json << EOF
{
  "serviceName": "alhambra-admin-dashboard",
  "cluster": "alhambra-admin-cluster",
  "taskDefinition": "alhambra-admin-dashboard",
  "desiredCount": 2,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["$PRIVATE_SUBNET_1A", "$PRIVATE_SUBNET_1B"],
      "securityGroups": ["$ECS_SG_ID"],
      "assignPublicIp": "DISABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "$TG_ARN",
      "containerName": "alhambra-admin-dashboard",
      "containerPort": 3000
    }
  ],
  "healthCheckGracePeriodSeconds": 300,
  "deploymentConfiguration": {
    "maximumPercent": 200,
    "minimumHealthyPercent": 50,
    "deploymentCircuitBreaker": {
      "enable": true,
      "rollback": true
    }
  },
  "tags": [
    {
      "key": "Name",
      "value": "alhambra-admin-dashboard"
    },
    {
      "key": "Project",
      "value": "AlhambraAdmin"
    }
  ]
}
EOF

# Create ECS service
aws ecs create-service --cli-input-json file://service-definition.json

echo "ECS Service created successfully!"
echo "Application will be available at: http://$ALB_DNS"
```

---

## 🔒 Security Configuration

### Step 1: Enable AWS WAF

```bash
# Create WAF Web ACL
cat > waf-web-acl.json << EOF
{
  "Name": "alhambra-admin-waf",
  "Scope": "REGIONAL",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 1,
      "OverrideAction": {
        "None": {}
      },
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonRuleSetMetric"
      }
    },
    {
      "Name": "AWSManagedRulesKnownBadInputsRuleSet",
      "Priority": 2,
      "OverrideAction": {
        "None": {}
      },
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "KnownBadInputsRuleSetMetric"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "AlhambraAdminWAF"
  }
}
EOF

# Create WAF Web ACL
aws wafv2 create-web-acl --cli-input-json file://waf-web-acl.json --region us-east-1

# Get WAF ARN
WAF_ARN=$(aws wafv2 list-web-acls --scope REGIONAL --region us-east-1 --query 'WebACLs[?Name==`alhambra-admin-waf`].ARN' --output text)

# Associate WAF with ALB
aws wafv2 associate-web-acl --web-acl-arn $WAF_ARN --resource-arn $ALB_ARN --region us-east-1

echo "WAF configured and associated with ALB"
```

### Step 2: Configure SSL Certificate

```bash
# Request SSL certificate
aws acm request-certificate \
  --domain-name admin.alhambrabank.com \
  --validation-method DNS \
  --tags Key=Name,Value=alhambra-admin-ssl Key=Project,Value=AlhambraAdmin

# Get certificate ARN (after DNS validation)
CERT_ARN=$(aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`admin.alhambrabank.com`].CertificateArn' --output text)

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

# Modify HTTP listener to redirect to HTTPS
aws elbv2 modify-listener \
  --listener-arn $(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[?Port==`80`].ListenerArn' --output text) \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

echo "SSL certificate configured"
```

### Step 3: Enable VPC Flow Logs

```bash
# Create IAM role for VPC Flow Logs
cat > vpc-flow-logs-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "vpc-flow-logs.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name AlhambraAdminVPCFlowLogsRole \
  --assume-role-policy-document file://vpc-flow-logs-trust-policy.json

aws iam attach-role-policy \
  --role-name AlhambraAdminVPCFlowLogsRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/VPCFlowLogsDeliveryRolePolicy

# Create VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids $VPC_ID \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs \
  --deliver-logs-permission-arn arn:aws:iam::600043382145:role/AlhambraAdminVPCFlowLogsRole

echo "VPC Flow Logs enabled"
```

---

## 📊 Monitoring and Logging

### Step 1: Create CloudWatch Dashboards

```bash
# Create dashboard JSON
cat > dashboard.json << EOF
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "alhambra-admin-dashboard", "ClusterName", "alhambra-admin-cluster"],
          [".", "MemoryUtilization", ".", ".", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Service Metrics"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/alhambra-admin-alb"],
          [".", "TargetResponseTime", ".", "."],
          [".", "HTTPCode_Target_2XX_Count", ".", "."],
          [".", "HTTPCode_Target_4XX_Count", ".", "."],
          [".", "HTTPCode_Target_5XX_Count", ".", "."]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "ALB Metrics"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "alhambra-admin-db"],
          [".", "DatabaseConnections", ".", "."],
          [".", "ReadLatency", ".", "."],
          [".", "WriteLatency", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "RDS Metrics"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "alhambra-admin-redis-001"],
          [".", "NetworkBytesIn", ".", "."],
          [".", "NetworkBytesOut", ".", "."],
          [".", "CurrConnections", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ElastiCache Metrics"
      }
    }
  ]
}
EOF

# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "AlhambraAdminDashboard" \
  --dashboard-body file://dashboard.json

echo "CloudWatch dashboard created"
```

### Step 2: Create CloudWatch Alarms

```bash
# Create SNS topic for alerts
aws sns create-topic --name alhambra-admin-alerts

SNS_TOPIC_ARN=$(aws sns list-topics --query 'Topics[?contains(TopicArn, `alhambra-admin-alerts`)].TopicArn' --output text)

# Subscribe email to SNS topic
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint awm@awmga.com

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "AlhambraAdmin-HighCPU" \
  --alarm-description "High CPU utilization on ECS service" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --dimensions Name=ServiceName,Value=alhambra-admin-dashboard Name=ClusterName,Value=alhambra-admin-cluster

aws cloudwatch put-metric-alarm \
  --alarm-name "AlhambraAdmin-HighMemory" \
  --alarm-description "High memory utilization on ECS service" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --dimensions Name=ServiceName,Value=alhambra-admin-dashboard Name=ClusterName,Value=alhambra-admin-cluster

aws cloudwatch put-metric-alarm \
  --alarm-name "AlhambraAdmin-HighErrorRate" \
  --alarm-description "High error rate on ALB" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --dimensions Name=LoadBalancer,Value=app/alhambra-admin-alb

aws cloudwatch put-metric-alarm \
  --alarm-name "AlhambraAdmin-DatabaseConnections" \
  --alarm-description "High database connections" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions $SNS_TOPIC_ARN \
  --dimensions Name=DBInstanceIdentifier,Value=alhambra-admin-db

echo "CloudWatch alarms created"
```

---

## 💾 Backup and Recovery

### Step 1: Configure Automated Backups

```bash
# Enable automated RDS backups (already configured during creation)
aws rds modify-db-instance \
  --db-instance-identifier alhambra-admin-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier alhambra-admin-db \
  --db-snapshot-identifier alhambra-admin-db-initial-snapshot

echo "Database backups configured"
```

### Step 2: Create S3 Bucket for Application Backups

```bash
# Create S3 bucket for backups
aws s3 mb s3://alhambra-admin-backups-600043382145

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket alhambra-admin-backups-600043382145 \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy
cat > lifecycle-policy.json << EOF
{
  "Rules": [
    {
      "ID": "BackupRetention",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "database-backups/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket alhambra-admin-backups-600043382145 \
  --lifecycle-configuration file://lifecycle-policy.json

echo "S3 backup bucket configured"
```

### Step 3: Create Backup Scripts

```bash
# Create backup script
cat > backup-script.sh << 'EOF'
#!/bin/bash

# Alhambra Admin Dashboard Backup Script
# AWS Account: 600043382145

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_BUCKET="alhambra-admin-backups-600043382145"
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --query 'DBInstances[0].Endpoint.Address' --output text)

echo "Starting backup process at $(date)"

# Get database password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "alhambra-admin/database" --query 'SecretString' --output text | jq -r '.password')

# Create database backup
echo "Creating database backup..."
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_ENDPOINT -U admin -d alhambra_admin -f "alhambra_admin_backup_$TIMESTAMP.sql"

# Compress backup
gzip "alhambra_admin_backup_$TIMESTAMP.sql"

# Upload to S3
echo "Uploading backup to S3..."
aws s3 cp "alhambra_admin_backup_$TIMESTAMP.sql.gz" "s3://$BACKUP_BUCKET/database-backups/"

# Clean up local file
rm "alhambra_admin_backup_$TIMESTAMP.sql.gz"

# Create ECS task definition backup
echo "Backing up ECS task definition..."
aws ecs describe-task-definition --task-definition alhambra-admin-dashboard --query 'taskDefinition' > "task-definition-backup-$TIMESTAMP.json"
aws s3 cp "task-definition-backup-$TIMESTAMP.json" "s3://$BACKUP_BUCKET/task-definitions/"
rm "task-definition-backup-$TIMESTAMP.json"

echo "Backup completed successfully at $(date)"
EOF

chmod +x backup-script.sh

# Create restore script
cat > restore-script.sh << 'EOF'
#!/bin/bash

# Alhambra Admin Dashboard Restore Script
# AWS Account: 600043382145

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <backup-timestamp>"
    echo "Example: $0 20231201_120000"
    exit 1
fi

TIMESTAMP=$1
BACKUP_BUCKET="alhambra-admin-backups-600043382145"
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --query 'DBInstances[0].Endpoint.Address' --output text)

echo "Starting restore process for backup: $TIMESTAMP"

# Get database password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "alhambra-admin/database" --query 'SecretString' --output text | jq -r '.password')

# Download backup from S3
echo "Downloading backup from S3..."
aws s3 cp "s3://$BACKUP_BUCKET/database-backups/alhambra_admin_backup_$TIMESTAMP.sql.gz" .

# Decompress backup
gunzip "alhambra_admin_backup_$TIMESTAMP.sql.gz"

# Restore database
echo "Restoring database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U admin -d alhambra_admin -f "alhambra_admin_backup_$TIMESTAMP.sql"

# Clean up
rm "alhambra_admin_backup_$TIMESTAMP.sql"

echo "Restore completed successfully at $(date)"
EOF

chmod +x restore-script.sh

echo "Backup and restore scripts created"
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. ECS Service Not Starting

```bash
# Check service events
aws ecs describe-services --cluster alhambra-admin-cluster --services alhambra-admin-dashboard

# Check task logs
aws logs get-log-events --log-group-name /ecs/alhambra-admin-dashboard --log-stream-name ecs/alhambra-admin-dashboard/$(aws ecs list-tasks --cluster alhambra-admin-cluster --service-name alhambra-admin-dashboard --query 'taskArns[0]' --output text | cut -d'/' -f3)

# Common fixes:
# - Check security group rules
# - Verify secrets are accessible
# - Check task definition CPU/memory limits
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -U admin -d alhambra_admin -c "SELECT 1;"

# Check security group rules
aws ec2 describe-security-groups --group-ids $RDS_SG_ID

# Verify RDS instance status
aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --query 'DBInstances[0].DBInstanceStatus'
```

#### 3. Load Balancer Health Check Failures

```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn $TG_ARN

# Check ALB access logs (if enabled)
aws s3 ls s3://alhambra-admin-alb-logs/

# Test health endpoint directly
curl -f http://$ALB_DNS/api/health
```

#### 4. High Memory Usage

```bash
# Scale up ECS service
aws ecs update-service --cluster alhambra-admin-cluster --service alhambra-admin-dashboard --desired-count 4

# Update task definition with more memory
# Edit task-definition.json and increase memory from 2048 to 4096
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs update-service --cluster alhambra-admin-cluster --service alhambra-admin-dashboard --task-definition alhambra-admin-dashboard:LATEST
```

### Debugging Commands

```bash
# View all resources
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=AlhambraAdmin

# Check ECS service status
aws ecs describe-services --cluster alhambra-admin-cluster --services alhambra-admin-dashboard --query 'services[0].{Status:status,Running:runningCount,Pending:pendingCount,Desired:desiredCount}'

# View recent logs
aws logs tail /ecs/alhambra-admin-dashboard --follow

# Check database performance
aws rds describe-db-instances --db-instance-identifier alhambra-admin-db --query 'DBInstances[0].{Status:DBInstanceStatus,MultiAZ:MultiAZ,Engine:Engine,Class:DBInstanceClass}'

# Monitor Redis
aws elasticache describe-replication-groups --replication-group-id alhambra-admin-redis --query 'ReplicationGroups[0].{Status:Status,Nodes:NodeGroups[0].NodeGroupMembers[*].{Id:CacheClusterId,Status:CurrentRole}}'
```

---

## 🔄 Maintenance

### Regular Maintenance Tasks

#### Weekly Tasks

```bash
# Check and apply security updates
aws ecs update-service --cluster alhambra-admin-cluster --service alhambra-admin-dashboard --force-new-deployment

# Review CloudWatch logs for errors
aws logs filter-log-events --log-group-name /ecs/alhambra-admin-dashboard --filter-pattern "ERROR"

# Check backup status
aws s3 ls s3://alhambra-admin-backups-600043382145/database-backups/ --recursive | tail -10
```

#### Monthly Tasks

```bash
# Update RDS minor version (if available)
aws rds describe-db-engine-versions --engine postgres --engine-version 14.9 --query 'DBEngineVersions[0].ValidUpgradeTarget[*].EngineVersion'

# Review and rotate secrets
aws secretsmanager rotate-secret --secret-id "alhambra-admin/app-secrets"

# Review CloudWatch costs and optimize log retention
aws logs put-retention-policy --log-group-name /ecs/alhambra-admin-dashboard --retention-in-days 30
```

#### Quarterly Tasks

```bash
# Review and update security groups
aws ec2 describe-security-groups --group-ids $ECS_SG_ID $RDS_SG_ID $REDIS_SG_ID $ALB_SG_ID

# Perform disaster recovery test
./restore-script.sh $(date -d "1 week ago" +%Y%m%d_%H%M%S)

# Review and update IAM policies
aws iam get-role-policy --role-name AlhambraAdminECSTaskRole --policy-name AlhambraAdminECSTaskPolicy
```

### Scaling Operations

#### Scale Up ECS Service

```bash
# Increase desired count
aws ecs update-service --cluster alhambra-admin-cluster --service alhambra-admin-dashboard --desired-count 4

# Update task definition for more resources
# Edit task-definition.json: cpu: "2048", memory: "4096"
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs update-service --cluster alhambra-admin-cluster --service alhambra-admin-dashboard --task-definition alhambra-admin-dashboard:LATEST
```

#### Scale Up Database

```bash
# Scale RDS instance
aws rds modify-db-instance \
  --db-instance-identifier alhambra-admin-db \
  --db-instance-class db.t3.large \
  --apply-immediately

# Scale Redis cluster
aws elasticache modify-replication-group \
  --replication-group-id alhambra-admin-redis \
  --cache-node-type cache.t3.small \
  --apply-immediately
```

---

## 📞 Support

### Emergency Contacts

- **Primary**: awm@awmga.com
- **AWS Account**: 600043382145
- **Region**: us-east-1

### Support Resources

#### AWS Support

```bash
# Create support case
aws support create-case \
  --subject "Alhambra Admin Dashboard Issue" \
  --service-code "amazon-elastic-container-service" \
  --severity-code "high" \
  --category-code "performance" \
  --communication-body "Description of the issue..."
```

#### Monitoring URLs

- **Application**: https://admin.alhambrabank.com
- **Health Check**: https://admin.alhambrabank.com/api/health
- **CloudWatch Dashboard**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AlhambraAdminDashboard

#### Log Locations

- **Application Logs**: `/aws/ecs/alhambra-admin-dashboard`
- **ALB Access Logs**: `s3://alhambra-admin-alb-logs/`
- **VPC Flow Logs**: `/aws/vpc/flowlogs`

### Performance Baselines

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| CPU Utilization | 20-60% | >80% |
| Memory Utilization | 30-70% | >80% |
| Response Time | <200ms | >1000ms |
| Error Rate | <1% | >5% |
| Database Connections | <50 | >80 |

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] AWS CLI configured with correct account (600043382145)
- [ ] Docker installed and running
- [ ] All required IAM permissions granted
- [ ] Domain name configured (admin.alhambrabank.com)
- [ ] SSL certificate requested and validated

### Infrastructure Deployment

- [ ] VPC and networking created
- [ ] Security groups configured
- [ ] IAM roles and policies created
- [ ] RDS instance created and initialized
- [ ] ElastiCache Redis cluster created
- [ ] ECR repository created
- [ ] Application Load Balancer created

### Application Deployment

- [ ] Docker image built and pushed to ECR
- [ ] Secrets created in AWS Secrets Manager
- [ ] ECS cluster created
- [ ] Task definition registered
- [ ] ECS service created and running
- [ ] Health checks passing

### Security Configuration

- [ ] WAF configured and associated
- [ ] SSL certificate configured
- [ ] VPC Flow Logs enabled
- [ ] Security groups properly configured
- [ ] Secrets properly secured

### Monitoring Setup

- [ ] CloudWatch dashboard created
- [ ] CloudWatch alarms configured
- [ ] SNS topic for alerts created
- [ ] Log groups created with proper retention

### Backup Configuration

- [ ] RDS automated backups enabled
- [ ] S3 backup bucket created
- [ ] Backup scripts created and tested
- [ ] Restore procedure documented and tested

### Post-Deployment Verification

- [ ] Application accessible via ALB DNS
- [ ] Health check endpoint responding
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Admin login working
- [ ] All features functional
- [ ] Monitoring alerts working
- [ ] Backup process tested

---

## 🎯 Success Criteria

### Performance Targets

- **Application Response Time**: <200ms for 95% of requests
- **Database Query Time**: <100ms for 95% of queries
- **Uptime**: 99.9% availability
- **Error Rate**: <0.1% of total requests

### Security Requirements

- **Encryption**: All data encrypted in transit and at rest
- **Authentication**: Multi-factor authentication for admin access
- **Network Security**: All traffic through private subnets
- **Audit Logging**: All administrative actions logged

### Operational Excellence

- **Monitoring**: Comprehensive monitoring and alerting
- **Backup**: Automated daily backups with 30-day retention
- **Disaster Recovery**: RTO <4 hours, RPO <1 hour
- **Documentation**: Complete operational documentation

---

## 📝 Conclusion

This deployment documentation provides a comprehensive guide for deploying the Alhambra Bank & Trust Internal Admin Dashboard to AWS Account 600043382145. The infrastructure is designed for high availability, security, and scalability, meeting the requirements of a production banking application.

**Key Features Deployed:**
- **Secure Infrastructure**: VPC with public/private subnets, security groups, and WAF
- **High Availability**: Multi-AZ RDS, ECS Fargate with multiple tasks, ALB with health checks
- **Monitoring**: CloudWatch dashboards, alarms, and comprehensive logging
- **Security**: Encryption, secrets management, audit logging, and network isolation
- **Backup**: Automated backups with lifecycle management

**Next Steps:**
1. Complete the deployment following this guide
2. Perform thorough testing of all functionality
3. Configure monitoring and alerting
4. Train operations team on maintenance procedures
5. Establish regular backup and disaster recovery testing

For support or questions, contact awm@awmga.com or refer to the troubleshooting section of this document.

---

**Document Version**: 1.0  
**Last Updated**: September 17, 2025  
**AWS Account**: 600043382145  
**Project**: Alhambra Bank & Trust Internal Admin Dashboard
