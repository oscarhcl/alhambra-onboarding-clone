# Alhambra Bank & Trust - Admin Dashboard Deployment Documentation

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Database Configuration](#database-configuration)
5. [Application Deployment](#application-deployment)
6. [Security Configuration](#security-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Maintenance & Updates](#maintenance--updates)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 **Overview**

The Alhambra Bank & Trust Internal Admin Dashboard is a comprehensive management system designed for secure internal operations. This documentation provides step-by-step instructions for deploying the admin dashboard to your AWS infrastructure.

### **System Architecture**
- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT with role-based access control
- **Infrastructure**: AWS ECS Fargate, RDS, ElastiCache
- **Security**: Bank-grade encryption and compliance

### **Key Features**
- Client Management System
- KYC Workflow Management
- Fund Transfer Authorization
- Communication Center
- Document Management
- CRM Integration
- Real-time Analytics

---

## 🔧 **Prerequisites**

### **AWS Account Requirements**
- **AWS Account**: 600043382145
- **IAM Permissions**: Administrator access or specific permissions for:
  - ECS (Elastic Container Service)
  - RDS (Relational Database Service)
  - ElastiCache
  - VPC (Virtual Private Cloud)
  - IAM (Identity and Access Management)
  - CloudWatch
  - S3 (Simple Storage Service)
  - Secrets Manager

### **Development Environment**
- **Node.js**: Version 18.x or higher
- **Docker**: Version 20.x or higher
- **AWS CLI**: Version 2.x configured with your credentials
- **Git**: For source code management

### **Domain & SSL**
- **Internal Domain**: admin.alhambra-bank.internal (or your preferred internal domain)
- **SSL Certificate**: AWS Certificate Manager or internal CA certificate

---

## 🏗️ **Infrastructure Setup**

### **Step 1: VPC and Network Configuration**

```bash
# Create VPC for admin dashboard
aws ec2 create-vpc \
    --cidr-block 10.1.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=alhambra-admin-vpc}]'

# Create private subnets for admin dashboard
aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.1.1.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=alhambra-admin-private-1a}]'

aws ec2 create-subnet \
    --vpc-id vpc-xxxxxxxxx \
    --cidr-block 10.1.2.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=alhambra-admin-private-1b}]'
```

### **Step 2: Security Groups**

```bash
# Create security group for admin dashboard
aws ec2 create-security-group \
    --group-name alhambra-admin-sg \
    --description "Security group for Alhambra Admin Dashboard" \
    --vpc-id vpc-xxxxxxxxx

# Allow HTTPS traffic from internal network only
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 443 \
    --cidr 10.0.0.0/8

# Allow HTTP for internal load balancer
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 80 \
    --cidr 10.1.0.0/16
```

### **Step 3: Application Load Balancer**

```bash
# Create internal application load balancer
aws elbv2 create-load-balancer \
    --name alhambra-admin-alb \
    --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
    --security-groups sg-xxxxxxxxx \
    --scheme internal \
    --type application \
    --ip-address-type ipv4
```

---

## 🗄️ **Database Configuration**

### **Step 1: RDS PostgreSQL Setup**

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name alhambra-admin-db-subnet \
    --db-subnet-group-description "Subnet group for admin database" \
    --subnet-ids subnet-xxxxxxxxx subnet-yyyyyyyyy

# Create RDS PostgreSQL instance
aws rds create-db-instance \
    --db-instance-identifier alhambra-admin-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --engine-version 14.9 \
    --master-username admin \
    --master-user-password "$(aws secretsmanager get-random-password --password-length 32 --exclude-characters '"@/\' --output text --query RandomPassword)" \
    --allocated-storage 100 \
    --storage-type gp2 \
    --storage-encrypted \
    --vpc-security-group-ids sg-xxxxxxxxx \
    --db-subnet-group-name alhambra-admin-db-subnet \
    --backup-retention-period 30 \
    --multi-az \
    --deletion-protection
```

### **Step 2: Database Schema Deployment**

```sql
-- Connect to PostgreSQL and run the following schema

-- Users table for admin authentication
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    account_number VARCHAR(20) UNIQUE,
    portfolio_value DECIMAL(15,2) DEFAULT 0.00,
    risk_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KYC requests table
CREATE TABLE kyc_requests (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    documents_uploaded TEXT[],
    reviewer_id INTEGER REFERENCES admin_users(id),
    review_notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- Fund transfers table
CREATE TABLE fund_transfers (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    transfer_type VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    from_account VARCHAR(50),
    to_account VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    approver_id INTEGER REFERENCES admin_users(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

-- Communications table
CREATE TABLE communications (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    status VARCHAR(20) DEFAULT 'unread',
    admin_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    document_name VARCHAR(200) NOT NULL,
    document_type VARCHAR(50),
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_kyc_requests_status ON kyc_requests(status);
CREATE INDEX idx_fund_transfers_status ON fund_transfers(status);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert default admin user
INSERT INTO admin_users (username, email, password_hash, role) VALUES 
('admin', 'awm@awmga.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGtrmu.Ki', 'super_admin');

-- Insert sample data for demo
INSERT INTO clients (first_name, last_name, email, account_number, portfolio_value, status) VALUES
('John', 'Doe', 'john.doe@example.com', 'ACC1234567890', 125750.50, 'active'),
('Jane', 'Smith', 'jane.smith@example.com', 'ACC0987654321', 0.00, 'pending');

INSERT INTO kyc_requests (client_id, request_type, documents_uploaded) VALUES
(2, 'initial_kyc', ARRAY['passport.pdf', 'utility_bill.jpg', 'bank_statement.pdf']),
(1, 'enhanced_dd', ARRAY['enhanced_documents.pdf']);

INSERT INTO fund_transfers (client_id, transfer_type, amount, from_account, to_account) VALUES
(1, 'wire', 50000.00, 'ACC1234567890', 'External Bank Account'),
(2, 'ach', 5000.00, 'ACC0987654321', 'Savings Account');

INSERT INTO communications (client_id, subject, message, direction) VALUES
(1, 'Portfolio Performance Inquiry', 'I would like to understand my portfolio performance better. Can someone help me?', 'inbound'),
(2, 'Account Access Issue', 'I''m having trouble logging into my account. Can you help?', 'inbound');
```

### **Step 3: Redis Cache Setup**

```bash
# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id alhambra-admin-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --num-cache-nodes 1 \
    --security-group-ids sg-xxxxxxxxx \
    --cache-subnet-group-name alhambra-admin-cache-subnet
```

---

## 🚀 **Application Deployment**

### **Step 1: Container Registry Setup**

```bash
# Create ECR repository
aws ecr create-repository \
    --repository-name alhambra-admin-dashboard \
    --image-scanning-configuration scanOnPush=true

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 600043382145.dkr.ecr.us-east-1.amazonaws.com
```

### **Step 2: Build and Push Docker Images**

```dockerfile
# Dockerfile for Admin Dashboard
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

```bash
# Build and push Docker image
docker build -t alhambra-admin-dashboard .
docker tag alhambra-admin-dashboard:latest 600043382145.dkr.ecr.us-east-1.amazonaws.com/alhambra-admin-dashboard:latest
docker push 600043382145.dkr.ecr.us-east-1.amazonaws.com/alhambra-admin-dashboard:latest
```

### **Step 3: ECS Cluster Setup**

```bash
# Create ECS cluster
aws ecs create-cluster \
    --cluster-name alhambra-admin-cluster \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### **Step 4: Task Definition**

```json
{
  "family": "alhambra-admin-dashboard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::600043382145:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::600043382145:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "admin-dashboard",
      "image": "600043382145.dkr.ecr.us-east-1.amazonaws.com/alhambra-admin-dashboard:latest",
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
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:600043382145:secret:alhambra-admin-db-credentials"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:600043382145:secret:alhambra-admin-redis-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:600043382145:secret:alhambra-admin-jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alhambra-admin-dashboard",
          "awslogs-region": "us-east-1",
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
```

### **Step 5: ECS Service Creation**

```bash
# Register task definition
aws ecs register-task-definition \
    --cli-input-json file://task-definition.json

# Create ECS service
aws ecs create-service \
    --cluster alhambra-admin-cluster \
    --service-name alhambra-admin-service \
    --task-definition alhambra-admin-dashboard:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxxx,subnet-yyyyyyyyy],securityGroups=[sg-xxxxxxxxx],assignPublicIp=DISABLED}" \
    --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:600043382145:targetgroup/alhambra-admin-tg/xxxxxxxxx,containerName=admin-dashboard,containerPort=3000
```

---

## 🔒 **Security Configuration**

### **Step 1: Secrets Management**

```bash
# Store database credentials
aws secretsmanager create-secret \
    --name alhambra-admin-db-credentials \
    --description "Database credentials for admin dashboard" \
    --secret-string '{"username":"admin","password":"your-secure-password","host":"alhambra-admin-db.xxxxxxxxx.us-east-1.rds.amazonaws.com","port":"5432","database":"alhambra_admin"}'

# Store JWT secret
aws secretsmanager create-secret \
    --name alhambra-admin-jwt-secret \
    --description "JWT secret for admin dashboard" \
    --secret-string '{"secret":"your-jwt-secret-key"}'

# Store Redis URL
aws secretsmanager create-secret \
    --name alhambra-admin-redis-url \
    --description "Redis URL for admin dashboard" \
    --secret-string '{"url":"redis://alhambra-admin-redis.xxxxxxxxx.cache.amazonaws.com:6379"}'
```

### **Step 2: IAM Roles and Policies**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:600043382145:secret:alhambra-admin-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:600043382145:*"
    }
  ]
}
```

### **Step 3: Network Security**

```bash
# Create WAF for additional protection
aws wafv2 create-web-acl \
    --name alhambra-admin-waf \
    --scope REGIONAL \
    --default-action Allow={} \
    --rules file://waf-rules.json
```

---

## 📊 **Monitoring & Logging**

### **Step 1: CloudWatch Setup**

```bash
# Create log group
aws logs create-log-group \
    --log-group-name /ecs/alhambra-admin-dashboard \
    --retention-in-days 30

# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "Alhambra-Admin-Dashboard" \
    --dashboard-body file://dashboard.json
```

### **Step 2: Alarms Configuration**

```bash
# CPU utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "alhambra-admin-high-cpu" \
    --alarm-description "High CPU utilization for admin dashboard" \
    --metric-name CPUUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2

# Memory utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "alhambra-admin-high-memory" \
    --alarm-description "High memory utilization for admin dashboard" \
    --metric-name MemoryUtilization \
    --namespace AWS/ECS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2
```

---

## 💾 **Backup & Recovery**

### **Step 1: Database Backups**

```bash
# Enable automated backups (already configured in RDS creation)
# Create manual snapshot
aws rds create-db-snapshot \
    --db-instance-identifier alhambra-admin-db \
    --db-snapshot-identifier alhambra-admin-db-snapshot-$(date +%Y%m%d%H%M%S)
```

### **Step 2: Application Backups**

```bash
# Create S3 bucket for backups
aws s3 mb s3://alhambra-admin-backups-600043382145

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket alhambra-admin-backups-600043382145 \
    --versioning-configuration Status=Enabled
```

---

## 🔄 **Maintenance & Updates**

### **Step 1: Rolling Updates**

```bash
# Update task definition with new image
aws ecs register-task-definition \
    --cli-input-json file://updated-task-definition.json

# Update service
aws ecs update-service \
    --cluster alhambra-admin-cluster \
    --service alhambra-admin-service \
    --task-definition alhambra-admin-dashboard:2
```

### **Step 2: Database Migrations**

```bash
# Run database migrations
docker run --rm \
    -e DATABASE_URL="postgresql://admin:password@host:5432/alhambra_admin" \
    600043382145.dkr.ecr.us-east-1.amazonaws.com/alhambra-admin-dashboard:latest \
    npm run migrate
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Service Not Starting**
```bash
# Check service events
aws ecs describe-services \
    --cluster alhambra-admin-cluster \
    --services alhambra-admin-service

# Check task logs
aws logs get-log-events \
    --log-group-name /ecs/alhambra-admin-dashboard \
    --log-stream-name ecs/admin-dashboard/task-id
```

#### **2. Database Connection Issues**
```bash
# Test database connectivity
aws rds describe-db-instances \
    --db-instance-identifier alhambra-admin-db

# Check security groups
aws ec2 describe-security-groups \
    --group-ids sg-xxxxxxxxx
```

#### **3. Load Balancer Health Checks Failing**
```bash
# Check target group health
aws elbv2 describe-target-health \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:600043382145:targetgroup/alhambra-admin-tg/xxxxxxxxx
```

### **Performance Optimization**

#### **1. Database Performance**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_clients_created_at ON clients(created_at);
```

#### **2. Application Performance**
```bash
# Scale service based on load
aws ecs update-service \
    --cluster alhambra-admin-cluster \
    --service alhambra-admin-service \
    --desired-count 4
```

---

## 📞 **Support & Contacts**

### **Emergency Contacts**
- **System Administrator**: awm@awmga.com
- **AWS Account**: 600043382145
- **On-call Support**: [Your support contact]

### **Documentation Links**
- **AWS ECS Documentation**: https://docs.aws.amazon.com/ecs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Node.js Best Practices**: https://nodejs.org/en/docs/

---

## 📝 **Deployment Checklist**

### **Pre-Deployment**
- [ ] AWS credentials configured
- [ ] VPC and subnets created
- [ ] Security groups configured
- [ ] RDS instance provisioned
- [ ] ElastiCache cluster created
- [ ] Secrets stored in Secrets Manager
- [ ] ECR repository created
- [ ] Docker images built and pushed

### **Deployment**
- [ ] ECS cluster created
- [ ] Task definition registered
- [ ] Load balancer configured
- [ ] Target groups created
- [ ] ECS service deployed
- [ ] Health checks passing
- [ ] SSL certificate configured

### **Post-Deployment**
- [ ] Application accessible via load balancer
- [ ] Database connectivity verified
- [ ] Admin login working
- [ ] All features functional
- [ ] Monitoring and alarms configured
- [ ] Backup procedures tested
- [ ] Documentation updated

---

## 🎯 **Conclusion**

This deployment documentation provides comprehensive instructions for deploying the Alhambra Bank & Trust Internal Admin Dashboard to AWS infrastructure. The system is designed for high availability, security, and scalability to meet the demands of a modern banking operation.

For additional support or questions, please contact the system administrator at awm@awmga.com.

**Deployment Status**: Ready for Production  
**Last Updated**: September 17, 2025  
**Version**: 1.0.0
