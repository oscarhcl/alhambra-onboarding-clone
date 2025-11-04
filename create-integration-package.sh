#!/bin/bash

# Alhambra Bank & Trust - Create IBOSS Integration Package
# Account: 600043382145
# User: awm@awmga.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 Creating IBOSS Integration Package for Existing AWS Infrastructure${NC}"
echo -e "${BLUE}=================================================================${NC}"
echo ""

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create package directory
PACKAGE_NAME="alhambra-iboss-integration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$PACKAGE_NAME"

print_info "Creating integration package: $PACKAGE_NAME"

# Copy core IBOSS files
print_info "Copying IBOSS core files..."
cp iboss_backend_api.js "$PACKAGE_NAME/"
cp ai_portfolio_optimizer.js "$PACKAGE_NAME/"
cp enhanced_security_system.js "$PACKAGE_NAME/"
cp social_trading_platform.js "$PACKAGE_NAME/"
cp advanced_reporting_system.js "$PACKAGE_NAME/"
cp system_integration_optimizer.js "$PACKAGE_NAME/"
cp enhanced_market_data_service.js "$PACKAGE_NAME/"
cp database-init.sql "$PACKAGE_NAME/"
cp src/components/mobile_responsive_portfolio.jsx "$PACKAGE_NAME/"

# Copy Docker files
print_info "Copying Docker configuration..."
cp Dockerfile.backend "$PACKAGE_NAME/"
cp Dockerfile.frontend "$PACKAGE_NAME/"
cp docker-compose.yml "$PACKAGE_NAME/" 2>/dev/null || true

# Copy AWS integration files
print_info "Copying AWS integration files..."
cp aws-iboss-infrastructure.yml "$PACKAGE_NAME/"
cp deploy-iboss-existing-aws.sh "$PACKAGE_NAME/"
cp assess-existing-infrastructure.sh "$PACKAGE_NAME/"
cp .env.aws "$PACKAGE_NAME/"

# Copy documentation
print_info "Copying documentation..."
cp AWS_Existing_Infrastructure_Integration.md "$PACKAGE_NAME/"
cp AWS_IBOSS_Integration_Documentation.md "$PACKAGE_NAME/"
cp IBOSS_INTEGRATION_README.md "$PACKAGE_NAME/"

# Create package-specific files
print_info "Creating package-specific files..."

# Create main README for the package
cat > "$PACKAGE_NAME/README.md" << 'EOF'
# Alhambra Bank & Trust - IBOSS Integration Package

**Account**: 600043382145  
**User**: awm@awmga.com  
**Package Type**: Existing AWS Infrastructure Integration

## 📦 Package Contents

### Core IBOSS Components
- `iboss_backend_api.js` - Main IBOSS backend API server
- `ai_portfolio_optimizer.js` - AI-powered portfolio optimization engine
- `enhanced_security_system.js` - Advanced security and compliance features
- `social_trading_platform.js` - Social trading and community features
- `advanced_reporting_system.js` - Comprehensive reporting and analytics
- `system_integration_optimizer.js` - System performance optimization
- `enhanced_market_data_service.js` - Real-time market data integration
- `mobile_responsive_portfolio.jsx` - React frontend component

### Database
- `database-init.sql` - Complete database schema and initialization

### Docker Configuration
- `Dockerfile.backend` - Backend container configuration
- `Dockerfile.frontend` - Frontend container configuration
- `docker-compose.yml` - Multi-container orchestration

### AWS Integration
- `aws-iboss-infrastructure.yml` - CloudFormation template
- `deploy-iboss-existing-aws.sh` - Integration deployment script
- `assess-existing-infrastructure.sh` - Infrastructure assessment tool
- `.env.aws` - Production environment configuration

### Documentation
- `AWS_Existing_Infrastructure_Integration.md` - Integration guide
- `AWS_IBOSS_Integration_Documentation.md` - Complete AWS documentation
- `IBOSS_INTEGRATION_README.md` - IBOSS feature documentation

## 🚀 Quick Start

### 1. Assess Your Infrastructure
```bash
chmod +x assess-existing-infrastructure.sh
./assess-existing-infrastructure.sh
```

### 2. Deploy IBOSS Integration
```bash
chmod +x deploy-iboss-existing-aws.sh
./deploy-iboss-existing-aws.sh
```

### 3. Verify Integration
```bash
# Test health endpoint
curl http://your-load-balancer/api/iboss/health

# Test authentication
curl -X POST http://your-load-balancer/api/iboss/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"RafiRamzi2025!!"}'
```

## 🔧 Integration Options

### Option 1: ECS Container Integration (Recommended)
- Deploy as containerized services in existing ECS cluster
- Automatic scaling and load balancing
- Easy updates and rollbacks

### Option 2: EC2 Instance Integration
- Deploy on existing EC2 instances
- Use PM2 for process management
- Configure reverse proxy with Nginx

### Option 3: Serverless Lambda Integration
- Deploy as AWS Lambda functions
- Use API Gateway for routing
- Pay-per-use pricing model

## 📊 Features Included

### Portfolio Management
- ✅ Real-time portfolio tracking
- ✅ AI-powered optimization recommendations
- ✅ Advanced risk assessment and reporting
- ✅ Multi-currency support and ESG analytics

### Market Data Integration
- ✅ Real-time market data feeds
- ✅ Technical indicators and analysis
- ✅ Performance attribution and benchmarking
- ✅ Automated rebalancing recommendations

### Advanced Analytics
- ✅ Machine learning-powered insights
- ✅ Predictive analytics and forecasting
- ✅ Social trading and community features
- ✅ Comprehensive reporting and tax optimization

### Security & Compliance
- ✅ Bank-grade security implementation
- ✅ JWT authentication with secure tokens
- ✅ Encryption at rest and in transit
- ✅ Audit logging and compliance reporting

## 🔐 Credentials Configuration

### IBOSS API Credentials
- Username: `alhambrabank`
- Password: `alhambra5312@abt.ky`

### Admin Credentials
- Username: `admin`
- Password: `RafiRamzi2025!!`

## 📞 Support

- **AWS Account**: 600043382145
- **Contact**: awm@awmga.com
- **Region**: us-east-1

## 📋 Prerequisites

- AWS CLI configured with appropriate permissions
- Docker installed (for container integration)
- Node.js 18+ (for EC2 integration)
- PostgreSQL access (for database setup)

## 🎯 Success Criteria

- [ ] IBOSS services running alongside existing applications
- [ ] No disruption to existing services
- [ ] All health checks passing
- [ ] Performance metrics within acceptable ranges
- [ ] Security compliance maintained
- [ ] Monitoring and alerting functional

---

**Status**: Ready for integration with existing AWS infrastructure
EOF

# Create installation script
cat > "$PACKAGE_NAME/install.sh" << 'EOF'
#!/bin/bash

# Alhambra Bank & Trust - IBOSS Integration Installer
# Quick installation script for existing AWS infrastructure

set -e

echo "🏦 Alhambra Bank & Trust - IBOSS Integration Installer"
echo "=================================================="
echo ""

# Make scripts executable
chmod +x assess-existing-infrastructure.sh
chmod +x deploy-iboss-existing-aws.sh

echo "✅ Scripts made executable"

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker found"
else
    echo "⚠️  Docker not found (required for container integration)"
fi

# Check Node.js (optional)
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "⚠️  Node.js not found (required for EC2 integration)"
fi

echo ""
echo "🚀 Ready to proceed with IBOSS integration!"
echo ""
echo "Next steps:"
echo "1. Run: ./assess-existing-infrastructure.sh"
echo "2. Run: ./deploy-iboss-existing-aws.sh"
echo "3. Follow the interactive prompts"
echo ""
echo "For detailed instructions, see README.md"
EOF

chmod +x "$PACKAGE_NAME/install.sh"

# Create environment template
cat > "$PACKAGE_NAME/.env.template" << 'EOF'
# Alhambra Bank & Trust - IBOSS Environment Template
# Copy this to .env and update with your specific values

# AWS Configuration
AWS_ACCOUNT_ID=600043382145
AWS_REGION=us-east-1

# Database Configuration (update with your RDS endpoint)
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/database_name
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=alhambra_iboss
DB_USER=iboss_user
DB_PASSWORD=your_secure_password

# IBOSS Credentials
IBOSS_USERNAME=alhambrabank
IBOSS_PASSWORD=alhambra5312@abt.ky
IBOSS_API_ENDPOINT=https://api.iboss.com/v1

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=RafiRamzi2025!!

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=production
PORT=3001

# Redis Configuration (if using existing Redis)
REDIS_URL=redis://your-redis-endpoint:6379

# S3 Configuration (if using existing S3)
S3_BUCKET=your-existing-bucket
S3_REGION=us-east-1

# Load Balancer Configuration
LOAD_BALANCER_DNS=your-alb-dns-name

# Monitoring Configuration
CLOUDWATCH_LOG_GROUP=/aws/ecs/alhambra-iboss
HEALTH_CHECK_ENDPOINT=/api/health
EOF

# Create package info file
cat > "$PACKAGE_NAME/package-info.json" << EOF
{
  "name": "alhambra-iboss-integration",
  "version": "1.0.0",
  "description": "IBOSS Portfolio Tracker integration package for existing AWS infrastructure",
  "account": "600043382145",
  "user": "awm@awmga.com",
  "created": "$(date -Iseconds)",
  "integration_type": "existing_infrastructure",
  "components": [
    "iboss_backend_api",
    "ai_portfolio_optimizer",
    "enhanced_security_system",
    "social_trading_platform",
    "advanced_reporting_system",
    "system_integration_optimizer",
    "enhanced_market_data_service",
    "mobile_responsive_portfolio"
  ],
  "aws_services": [
    "ECS",
    "EC2",
    "RDS",
    "ElastiCache",
    "S3",
    "CloudFront",
    "Application Load Balancer",
    "CloudWatch"
  ],
  "integration_options": [
    "ecs_container",
    "ec2_instance",
    "serverless_lambda"
  ],
  "credentials": {
    "iboss_username": "alhambrabank",
    "admin_username": "admin"
  }
}
EOF

# Create deployment checklist
cat > "$PACKAGE_NAME/deployment-checklist.md" << 'EOF'
# IBOSS Integration Deployment Checklist

## Pre-Deployment
- [ ] AWS CLI configured with account 600043382145
- [ ] Appropriate IAM permissions for deployment
- [ ] Existing infrastructure assessed
- [ ] Integration strategy selected
- [ ] Database access confirmed
- [ ] Load balancer configuration reviewed

## Deployment
- [ ] Infrastructure assessment completed
- [ ] Integration deployment script executed
- [ ] Database schema initialized
- [ ] Application services started
- [ ] Load balancer configured
- [ ] Health checks passing

## Post-Deployment
- [ ] All services healthy and running
- [ ] IBOSS API endpoints responding
- [ ] Authentication working correctly
- [ ] Portfolio data accessible
- [ ] Market data integration functional
- [ ] Monitoring and logging configured

## Testing
- [ ] Health check endpoint: `/api/health`
- [ ] Authentication endpoint: `/api/auth/login`
- [ ] Portfolio summary: `/api/portfolio/summary`
- [ ] Market data: `/api/market/data`
- [ ] AI optimization: `/api/ai/optimize`

## Security Verification
- [ ] HTTPS enabled for all endpoints
- [ ] Database connections encrypted
- [ ] API authentication working
- [ ] Security groups properly configured
- [ ] Audit logging enabled

## Performance Verification
- [ ] Response times < 200ms for API calls
- [ ] Database queries optimized
- [ ] Caching working correctly
- [ ] Auto-scaling configured
- [ ] Monitoring alerts set up

## Documentation
- [ ] Deployment report generated
- [ ] Configuration documented
- [ ] Access credentials secured
- [ ] Support contacts updated
- [ ] User training completed

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Verified By**: ___________  
**Status**: ___________
EOF

print_status "Core files copied"

# Create compressed package
print_info "Creating compressed package..."
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME" > /dev/null

print_status "Compressed packages created"

# Generate package summary
cat > "${PACKAGE_NAME}-summary.md" << EOF
# IBOSS Integration Package Summary

**Package Name**: $PACKAGE_NAME  
**Created**: $(date)  
**Account**: 600043382145  
**User**: awm@awmga.com

## 📦 Package Contents

### Files Included
- **Core Components**: 8 JavaScript files
- **Database Schema**: 1 SQL file
- **Docker Configuration**: 2 Dockerfiles + compose
- **AWS Integration**: 3 shell scripts + CloudFormation
- **Documentation**: 4 markdown files
- **Configuration**: Environment templates and examples

### Package Formats
- **Directory**: $PACKAGE_NAME/
- **Compressed**: ${PACKAGE_NAME}.tar.gz
- **ZIP Archive**: ${PACKAGE_NAME}.zip

## 🚀 Quick Start Commands

\`\`\`bash
# Extract package
tar -xzf ${PACKAGE_NAME}.tar.gz
cd $PACKAGE_NAME

# Run installer
./install.sh

# Assess infrastructure
./assess-existing-infrastructure.sh

# Deploy integration
./deploy-iboss-existing-aws.sh
\`\`\`

## 📊 Integration Features

### Portfolio Management
- Real-time portfolio tracking and analytics
- AI-powered optimization recommendations
- Advanced risk assessment and reporting
- Multi-currency support and ESG analytics

### Technical Features
- Node.js backend with Express framework
- React frontend with mobile-responsive design
- PostgreSQL database with Redis caching
- Docker containerization for easy deployment

### AWS Integration
- ECS Fargate for containerized deployment
- EC2 instance integration support
- RDS PostgreSQL database integration
- Application Load Balancer configuration
- CloudWatch monitoring and logging

## 🔐 Security Features

- Bank-grade security implementation
- JWT authentication with secure tokens
- Encryption at rest and in transit
- Audit logging and compliance reporting
- IBOSS API integration with secure credentials

## 📞 Support Information

- **AWS Account**: 600043382145
- **Contact**: awm@awmga.com
- **Region**: us-east-1
- **Integration Type**: Existing Infrastructure Enhancement

---

**Status**: Ready for deployment to existing AWS infrastructure
EOF

print_status "Package summary created"

# Final output
echo ""
echo -e "${GREEN}🎉 IBOSS INTEGRATION PACKAGE CREATED SUCCESSFULLY! 🎉${NC}"
echo ""
echo -e "${BLUE}📦 Package Details:${NC}"
echo -e "   • Name: ${GREEN}$PACKAGE_NAME${NC}"
echo -e "   • Directory: ${GREEN}$PACKAGE_NAME/${NC}"
echo -e "   • Compressed: ${GREEN}${PACKAGE_NAME}.tar.gz${NC}"
echo -e "   • ZIP Archive: ${GREEN}${PACKAGE_NAME}.zip${NC}"
echo ""
echo -e "${BLUE}📋 Package Contents:${NC}"
echo -e "   • Core IBOSS Components: ${GREEN}8 files${NC}"
echo -e "   • Database Schema: ${GREEN}1 file${NC}"
echo -e "   • Docker Configuration: ${GREEN}3 files${NC}"
echo -e "   • AWS Integration Scripts: ${GREEN}3 files${NC}"
echo -e "   • Documentation: ${GREEN}4 files${NC}"
echo -e "   • Configuration Templates: ${GREEN}2 files${NC}"
echo ""
echo -e "${BLUE}🚀 Quick Start:${NC}"
echo -e "   1. Extract: ${YELLOW}tar -xzf ${PACKAGE_NAME}.tar.gz${NC}"
echo -e "   2. Install: ${YELLOW}cd $PACKAGE_NAME && ./install.sh${NC}"
echo -e "   3. Deploy: ${YELLOW}./deploy-iboss-existing-aws.sh${NC}"
echo ""
echo -e "${GREEN}✅ Ready for integration with your existing AWS infrastructure!${NC}"
