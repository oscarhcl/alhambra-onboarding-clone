#!/bin/bash

# Alhambra Bank & Trust - AWS Configuration Script
# Account: 600043382145
# User: awm@awmga.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 Alhambra Bank & Trust - AWS Configuration${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Configuration
AWS_ACCOUNT_ID="600043382145"
AWS_REGION="us-east-1"
AWS_USERNAME="awm@awmga.com"

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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Installing now..."
    
    # Install AWS CLI v2
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf awscliv2.zip aws/
    
    print_status "AWS CLI installed successfully"
fi

# Configure AWS CLI
print_info "Configuring AWS CLI for account: $AWS_ACCOUNT_ID"

# Prompt for AWS credentials if not provided as environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo -e "${YELLOW}Please enter your AWS Access Key ID:${NC}"
    read -r AWS_ACCESS_KEY_ID
    export AWS_ACCESS_KEY_ID
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${YELLOW}Please enter your AWS Secret Access Key:${NC}"
    read -rs AWS_SECRET_ACCESS_KEY
    export AWS_SECRET_ACCESS_KEY
    echo ""
fi

# Configure AWS CLI
aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
aws configure set default.region "$AWS_REGION"
aws configure set default.output "json"

# Verify configuration
print_info "Verifying AWS configuration..."

if aws sts get-caller-identity &> /dev/null; then
    CALLER_IDENTITY=$(aws sts get-caller-identity)
    ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | jq -r '.Account')
    USER_ARN=$(echo "$CALLER_IDENTITY" | jq -r '.Arn')
    
    print_status "AWS CLI configured successfully"
    print_info "Account ID: $ACCOUNT_ID"
    print_info "User ARN: $USER_ARN"
    
    if [ "$ACCOUNT_ID" != "$AWS_ACCOUNT_ID" ]; then
        print_warning "Account ID mismatch. Expected: $AWS_ACCOUNT_ID, Got: $ACCOUNT_ID"
    fi
else
    print_error "AWS configuration failed. Please check your credentials."
    exit 1
fi

# Install additional tools if needed
print_info "Installing additional tools..."

# Install jq if not present
if ! command -v jq &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y jq
    print_status "jq installed"
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed"
    print_warning "Please log out and log back in for Docker group changes to take effect"
fi

# Create AWS configuration backup
print_info "Creating AWS configuration backup..."
mkdir -p ~/.aws-backup
cp ~/.aws/config ~/.aws-backup/config.backup 2>/dev/null || true
cp ~/.aws/credentials ~/.aws-backup/credentials.backup 2>/dev/null || true

# Set up AWS environment variables file
cat > ~/.aws-env << EOF
# Alhambra Bank & Trust AWS Environment
export AWS_ACCOUNT_ID="$AWS_ACCOUNT_ID"
export AWS_DEFAULT_REGION="$AWS_REGION"
export AWS_REGION="$AWS_REGION"
export AWS_PROFILE="default"
EOF

print_status "AWS environment file created: ~/.aws-env"

# Test AWS services access
print_info "Testing AWS services access..."

# Test S3 access
if aws s3 ls &> /dev/null; then
    print_status "S3 access verified"
else
    print_warning "S3 access may be limited"
fi

# Test ECR access
if aws ecr describe-repositories --region "$AWS_REGION" &> /dev/null; then
    print_status "ECR access verified"
else
    print_warning "ECR access may be limited"
fi

# Test ECS access
if aws ecs list-clusters --region "$AWS_REGION" &> /dev/null; then
    print_status "ECS access verified"
else
    print_warning "ECS access may be limited"
fi

# Test CloudFormation access
if aws cloudformation list-stacks --region "$AWS_REGION" &> /dev/null; then
    print_status "CloudFormation access verified"
else
    print_warning "CloudFormation access may be limited"
fi

# Create deployment summary
cat > aws-configuration-summary.txt << EOF
🏦 Alhambra Bank & Trust - AWS Configuration Summary
==================================================

Configuration Date: $(date)
AWS Account ID: $AWS_ACCOUNT_ID
AWS Region: $AWS_REGION
AWS Username: $AWS_USERNAME

✅ Configuration Status:
- AWS CLI: Installed and configured
- Docker: $(docker --version 2>/dev/null || echo "Not installed")
- jq: $(jq --version 2>/dev/null || echo "Not installed")

🔧 AWS Services Access:
- S3: $(aws s3 ls &>/dev/null && echo "✅ Verified" || echo "⚠️ Limited")
- ECR: $(aws ecr describe-repositories --region "$AWS_REGION" &>/dev/null && echo "✅ Verified" || echo "⚠️ Limited")
- ECS: $(aws ecs list-clusters --region "$AWS_REGION" &>/dev/null && echo "✅ Verified" || echo "⚠️ Limited")
- CloudFormation: $(aws cloudformation list-stacks --region "$AWS_REGION" &>/dev/null && echo "✅ Verified" || echo "⚠️ Limited")

📁 Configuration Files:
- AWS Config: ~/.aws/config
- AWS Credentials: ~/.aws/credentials
- Environment Variables: ~/.aws-env
- Backup: ~/.aws-backup/

🚀 Next Steps:
1. Run: source ~/.aws-env
2. Execute: ./deploy-iboss-aws.sh
3. Monitor deployment progress
4. Verify IBOSS integration

Status: ✅ READY FOR DEPLOYMENT
EOF

print_status "Configuration summary created: aws-configuration-summary.txt"

echo ""
echo -e "${GREEN}🎉 AWS CONFIGURATION COMPLETED SUCCESSFULLY! 🎉${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "   • AWS Account: ${GREEN}$AWS_ACCOUNT_ID${NC}"
echo -e "   • Region: ${GREEN}$AWS_REGION${NC}"
echo -e "   • User: ${GREEN}$AWS_USERNAME${NC}"
echo ""
echo -e "${BLUE}🚀 Ready to deploy IBOSS integration to AWS!${NC}"
echo -e "   Run: ${YELLOW}./deploy-iboss-aws.sh${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember to source the environment file:${NC}"
echo -e "   ${YELLOW}source ~/.aws-env${NC}"
