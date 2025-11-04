# Alhambra Bank & Trust - IBOSS Integration with Existing AWS Infrastructure

**Account**: 600043382145  
**User**: awm@awmga.com  
**Integration Type**: Existing Infrastructure Enhancement  
**Date**: September 17, 2025

## 🏗️ **Integration Overview**

This guide provides step-by-step instructions for integrating the IBOSS Portfolio Tracker into your existing AWS infrastructure without disrupting current services.

## 📋 **Prerequisites Assessment**

### **Existing AWS Services Inventory**
Before integration, identify your current AWS resources:

```bash
# Run this assessment script to inventory your existing infrastructure
./assess-existing-infrastructure.sh
```

**Common Existing Services:**
- ✅ **EC2 Instances** - Web servers, application servers
- ✅ **RDS Databases** - Existing database instances
- ✅ **Load Balancers** - ALB/ELB for traffic distribution
- ✅ **S3 Buckets** - Static assets and backups
- ✅ **CloudFront** - CDN distributions
- ✅ **VPC/Subnets** - Network infrastructure
- ✅ **Security Groups** - Firewall rules
- ✅ **IAM Roles** - Access permissions

## 🔧 **Integration Strategies**

### **Strategy 1: Containerized Integration (Recommended)**
Deploy IBOSS as containerized services alongside existing infrastructure.

### **Strategy 2: EC2 Instance Integration**
Deploy IBOSS components on existing or new EC2 instances.

### **Strategy 3: Serverless Integration**
Use AWS Lambda and API Gateway for IBOSS backend services.

## 🚀 **Containerized Integration (ECS/Docker)**

### **Step 1: ECS Cluster Integration**

#### **Option A: Use Existing ECS Cluster**
```bash
# List existing ECS clusters
aws ecs list-clusters

# Add IBOSS services to existing cluster
aws ecs create-service \
    --cluster your-existing-cluster \
    --service-name alhambra-iboss-backend \
    --task-definition alhambra-iboss-backend:1 \
    --desired-count 2
```

#### **Option B: Create Dedicated ECS Cluster**
```bash
# Create new cluster for IBOSS services only
aws ecs create-cluster --cluster-name alhambra-iboss-cluster
```

### **Step 2: Task Definitions for Existing Infrastructure**

#### **Backend Task Definition**
```json
{
  "family": "alhambra-iboss-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::600043382145:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::600043382145:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "iboss-backend",
      "image": "600043382145.dkr.ecr.us-east-1.amazonaws.com/alhambra-iboss:latest",
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
          "value": "postgresql://user:pass@your-existing-rds-endpoint:5432/dbname"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alhambra-iboss-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### **Step 3: Load Balancer Integration**

#### **Add IBOSS to Existing ALB**
```bash
# Create target group for IBOSS backend
aws elbv2 create-target-group \
    --name alhambra-iboss-tg \
    --protocol HTTP \
    --port 3001 \
    --vpc-id your-existing-vpc-id \
    --target-type ip \
    --health-check-path /api/health

# Add listener rule to existing ALB
aws elbv2 create-rule \
    --listener-arn your-existing-listener-arn \
    --priority 100 \
    --conditions Field=path-pattern,Values='/api/iboss/*' \
    --actions Type=forward,TargetGroupArn=your-iboss-target-group-arn
```

## 🖥️ **EC2 Instance Integration**

### **Step 1: Prepare Existing EC2 Instance**

#### **Install Dependencies on Existing Instance**
```bash
# SSH into your existing EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js and dependencies
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# Install PM2 for process management
sudo npm install -g pm2
```

### **Step 2: Deploy IBOSS Application**

#### **Clone and Setup IBOSS**
```bash
# Clone the repository
git clone https://github.com/abt2025/alhambra-bank-trust.git
cd alhambra-bank-trust

# Install dependencies
npm install

# Configure environment
cp .env.aws .env
# Edit .env with your existing database and service endpoints

# Start IBOSS backend with PM2
pm2 start iboss_backend_api.js --name "alhambra-iboss"
pm2 save
pm2 startup
```

### **Step 3: Nginx Configuration for Existing Web Server**

#### **Add IBOSS Routes to Existing Nginx**
```nginx
# Add to your existing nginx.conf
location /api/iboss/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Serve IBOSS frontend assets
location /portfolio/ {
    alias /var/www/html/alhambra-bank-trust/build/;
    try_files $uri $uri/ /portfolio/index.html;
}
```

## 🗄️ **Database Integration Options**

### **Option 1: Use Existing RDS Instance**

#### **Create IBOSS Database Schema**
```sql
-- Connect to your existing RDS instance
-- Create dedicated database for IBOSS
CREATE DATABASE alhambra_iboss;

-- Create user for IBOSS
CREATE USER iboss_user WITH PASSWORD 'secure_password_2025';
GRANT ALL PRIVILEGES ON DATABASE alhambra_iboss TO iboss_user;

-- Run IBOSS schema initialization
\i database-init.sql
```

#### **Update Connection String**
```bash
# In your .env file
DATABASE_URL=postgresql://iboss_user:secure_password_2025@your-existing-rds-endpoint:5432/alhambra_iboss
```

### **Option 2: Create Dedicated RDS Instance**
```bash
# Create new RDS instance for IBOSS
aws rds create-db-instance \
    --db-instance-identifier alhambra-iboss-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username iboss_admin \
    --master-user-password SecurePassword2025 \
    --allocated-storage 20 \
    --vpc-security-group-ids your-existing-security-group-id \
    --db-subnet-group-name your-existing-subnet-group
```

## 🔐 **Security Integration**

### **Update Existing Security Groups**

#### **Add IBOSS Ports to Existing Security Groups**
```bash
# Add port 3001 for IBOSS backend
aws ec2 authorize-security-group-ingress \
    --group-id your-existing-security-group-id \
    --protocol tcp \
    --port 3001 \
    --source-group your-alb-security-group-id

# Add database access for IBOSS
aws ec2 authorize-security-group-ingress \
    --group-id your-database-security-group-id \
    --protocol tcp \
    --port 5432 \
    --source-group your-app-security-group-id
```

### **IAM Role Updates**

#### **Add IBOSS Permissions to Existing Roles**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "s3:GetObject",
        "s3:PutObject",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:600043382145:secret:iboss-credentials-*",
        "arn:aws:s3:::your-existing-bucket/*",
        "arn:aws:logs:us-east-1:600043382145:*"
      ]
    }
  ]
}
```

## 📦 **S3 Integration**

### **Use Existing S3 Bucket**
```bash
# Create IBOSS folder in existing bucket
aws s3api put-object \
    --bucket your-existing-bucket \
    --key iboss-assets/ \
    --content-length 0

# Upload IBOSS static assets
aws s3 sync ./build/ s3://your-existing-bucket/iboss-assets/
```

### **CloudFront Integration**
```bash
# Add IBOSS behavior to existing CloudFront distribution
aws cloudfront update-distribution \
    --id your-existing-distribution-id \
    --distribution-config file://cloudfront-update.json
```

## 🔄 **CI/CD Integration**

### **GitHub Actions for Existing Pipeline**

#### **Add IBOSS Deployment to Existing Workflow**
```yaml
# Add to your existing .github/workflows/deploy.yml
- name: Deploy IBOSS Backend
  run: |
    # Build IBOSS Docker image
    docker build -t alhambra-iboss:latest -f Dockerfile.backend .
    
    # Tag and push to your existing ECR
    docker tag alhambra-iboss:latest 600043382145.dkr.ecr.us-east-1.amazonaws.com/alhambra-iboss:latest
    docker push 600043382145.dkr.ecr.us-east-1.amazonaws.com/alhambra-iboss:latest
    
    # Update ECS service
    aws ecs update-service \
      --cluster your-existing-cluster \
      --service alhambra-iboss-backend \
      --force-new-deployment
```

## 📊 **Monitoring Integration**

### **CloudWatch Integration**
```bash
# Add IBOSS metrics to existing CloudWatch dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "Alhambra-Bank-Dashboard" \
    --dashboard-body file://dashboard-with-iboss.json
```

### **Existing Monitoring Tools**
```bash
# If using Datadog, New Relic, etc.
# Add IBOSS application monitoring
# Configure alerts for IBOSS services
# Set up log aggregation for IBOSS logs
```

## 🧪 **Testing Integration**

### **Health Check Integration**
```bash
# Add IBOSS health checks to existing monitoring
curl http://your-existing-alb-dns/api/iboss/health

# Test database connectivity
curl http://your-existing-alb-dns/api/iboss/db-health

# Test IBOSS portfolio functionality
curl -X POST http://your-existing-alb-dns/api/iboss/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"RafiRamzi2025!!"}'
```

## 🔧 **Troubleshooting Common Integration Issues**

### **Port Conflicts**
```bash
# Check for port conflicts
sudo netstat -tlnp | grep :3001

# Change IBOSS port if needed
export PORT=3002
```

### **Database Connection Issues**
```bash
# Test database connectivity
psql -h your-rds-endpoint -U your-username -d your-database -c "SELECT 1;"

# Check security group rules
aws ec2 describe-security-groups --group-ids your-sg-id
```

### **Load Balancer Issues**
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn your-target-group-arn

# Check listener rules
aws elbv2 describe-rules --listener-arn your-listener-arn
```

## 📈 **Performance Optimization for Existing Infrastructure**

### **Database Optimization**
```sql
-- Add indexes for IBOSS queries
CREATE INDEX idx_portfolio_user_id ON portfolios(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_holdings_symbol ON holdings(symbol);
```

### **Caching Integration**
```bash
# Use existing Redis/ElastiCache
# Configure IBOSS to use existing cache
export REDIS_URL=redis://your-existing-redis-endpoint:6379
```

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Inventory existing AWS resources
- [ ] Backup existing configurations
- [ ] Test IBOSS in staging environment
- [ ] Update security groups and IAM roles
- [ ] Configure monitoring and alerting

### **Deployment**
- [ ] Deploy IBOSS containers/applications
- [ ] Update load balancer configurations
- [ ] Run database migrations
- [ ] Test all integrations
- [ ] Monitor performance metrics

### **Post-Deployment**
- [ ] Verify all services are healthy
- [ ] Test IBOSS functionality end-to-end
- [ ] Monitor logs for errors
- [ ] Update documentation
- [ ] Train team on new features

## 📞 **Support and Maintenance**

### **Integration Support**
- **Primary Contact**: awm@awmga.com
- **AWS Account**: 600043382145
- **Integration Type**: Existing Infrastructure Enhancement

### **Maintenance Windows**
- **Recommended**: During existing maintenance windows
- **Duration**: 2-4 hours for full integration
- **Rollback Plan**: Documented rollback procedures

---

## ✅ **Integration Success Criteria**

- [ ] IBOSS services running alongside existing applications
- [ ] No disruption to existing services
- [ ] All health checks passing
- [ ] Performance metrics within acceptable ranges
- [ ] Security compliance maintained
- [ ] Monitoring and alerting functional

**Status**: 📋 **READY FOR INTEGRATION WITH EXISTING AWS INFRASTRUCTURE**

This integration approach ensures minimal disruption to your existing AWS infrastructure while adding the powerful IBOSS Portfolio Tracker capabilities to your Alhambra Bank platform.
