#!/bin/bash

# Alhambra Bank & Trust - Existing AWS Infrastructure Assessment
# Account: 600043382145
# User: awm@awmga.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏦 Alhambra Bank & Trust - AWS Infrastructure Assessment${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# Configuration
AWS_ACCOUNT_ID="600043382145"
AWS_REGION="us-east-1"
ASSESSMENT_DATE=$(date)

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

# Check AWS CLI configuration
print_section "AWS Configuration Check"

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured"
    exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity)
ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | jq -r '.Account')
USER_ARN=$(echo "$CALLER_IDENTITY" | jq -r '.Arn')

print_status "AWS CLI configured"
print_info "Account ID: $ACCOUNT_ID"
print_info "User ARN: $USER_ARN"

# Create assessment report
REPORT_FILE="aws-infrastructure-assessment-$(date +%Y%m%d-%H%M%S).json"
echo "{" > "$REPORT_FILE"
echo "  \"assessment_date\": \"$ASSESSMENT_DATE\"," >> "$REPORT_FILE"
echo "  \"aws_account_id\": \"$ACCOUNT_ID\"," >> "$REPORT_FILE"
echo "  \"aws_region\": \"$AWS_REGION\"," >> "$REPORT_FILE"

# Assess VPCs
print_section "VPC Assessment"
echo "  \"vpcs\": [" >> "$REPORT_FILE"

VPC_COUNT=0
if aws ec2 describe-vpcs --region "$AWS_REGION" &> /dev/null; then
    VPCS=$(aws ec2 describe-vpcs --region "$AWS_REGION" --query 'Vpcs[*].[VpcId,CidrBlock,State,IsDefault]' --output table)
    echo "$VPCS"
    
    # Get VPC details for JSON
    aws ec2 describe-vpcs --region "$AWS_REGION" --query 'Vpcs[*]' >> "$REPORT_FILE"
    VPC_COUNT=$(aws ec2 describe-vpcs --region "$AWS_REGION" --query 'length(Vpcs)')
    print_status "Found $VPC_COUNT VPC(s)"
else
    print_warning "Cannot access VPC information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess Subnets
print_section "Subnet Assessment"
echo "  \"subnets\": [" >> "$REPORT_FILE"

if aws ec2 describe-subnets --region "$AWS_REGION" &> /dev/null; then
    SUBNETS=$(aws ec2 describe-subnets --region "$AWS_REGION" --query 'Subnets[*].[SubnetId,VpcId,CidrBlock,AvailabilityZone,State]' --output table)
    echo "$SUBNETS"
    
    aws ec2 describe-subnets --region "$AWS_REGION" --query 'Subnets[*]' >> "$REPORT_FILE"
    SUBNET_COUNT=$(aws ec2 describe-subnets --region "$AWS_REGION" --query 'length(Subnets)')
    print_status "Found $SUBNET_COUNT subnet(s)"
else
    print_warning "Cannot access subnet information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess EC2 Instances
print_section "EC2 Instance Assessment"
echo "  \"ec2_instances\": [" >> "$REPORT_FILE"

if aws ec2 describe-instances --region "$AWS_REGION" &> /dev/null; then
    INSTANCES=$(aws ec2 describe-instances --region "$AWS_REGION" --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,PublicIpAddress,PrivateIpAddress]' --output table)
    echo "$INSTANCES"
    
    aws ec2 describe-instances --region "$AWS_REGION" --query 'Reservations[*].Instances[*]' >> "$REPORT_FILE"
    INSTANCE_COUNT=$(aws ec2 describe-instances --region "$AWS_REGION" --query 'length(Reservations[*].Instances[*])')
    print_status "Found $INSTANCE_COUNT EC2 instance(s)"
else
    print_warning "Cannot access EC2 information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess RDS Instances
print_section "RDS Database Assessment"
echo "  \"rds_instances\": [" >> "$REPORT_FILE"

if aws rds describe-db-instances --region "$AWS_REGION" &> /dev/null; then
    RDS_INSTANCES=$(aws rds describe-db-instances --region "$AWS_REGION" --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,Engine,DBInstanceStatus,Endpoint.Address]' --output table)
    echo "$RDS_INSTANCES"
    
    aws rds describe-db-instances --region "$AWS_REGION" --query 'DBInstances[*]' >> "$REPORT_FILE"
    RDS_COUNT=$(aws rds describe-db-instances --region "$AWS_REGION" --query 'length(DBInstances)')
    print_status "Found $RDS_COUNT RDS instance(s)"
else
    print_warning "Cannot access RDS information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess Load Balancers
print_section "Load Balancer Assessment"
echo "  \"load_balancers\": [" >> "$REPORT_FILE"

if aws elbv2 describe-load-balancers --region "$AWS_REGION" &> /dev/null; then
    LOAD_BALANCERS=$(aws elbv2 describe-load-balancers --region "$AWS_REGION" --query 'LoadBalancers[*].[LoadBalancerName,Type,State.Code,DNSName]' --output table)
    echo "$LOAD_BALANCERS"
    
    aws elbv2 describe-load-balancers --region "$AWS_REGION" --query 'LoadBalancers[*]' >> "$REPORT_FILE"
    LB_COUNT=$(aws elbv2 describe-load-balancers --region "$AWS_REGION" --query 'length(LoadBalancers)')
    print_status "Found $LB_COUNT load balancer(s)"
else
    print_warning "Cannot access Load Balancer information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess S3 Buckets
print_section "S3 Bucket Assessment"
echo "  \"s3_buckets\": [" >> "$REPORT_FILE"

if aws s3api list-buckets &> /dev/null; then
    S3_BUCKETS=$(aws s3api list-buckets --query 'Buckets[*].[Name,CreationDate]' --output table)
    echo "$S3_BUCKETS"
    
    aws s3api list-buckets --query 'Buckets[*]' >> "$REPORT_FILE"
    S3_COUNT=$(aws s3api list-buckets --query 'length(Buckets)')
    print_status "Found $S3_COUNT S3 bucket(s)"
else
    print_warning "Cannot access S3 information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess ECS Clusters
print_section "ECS Cluster Assessment"
echo "  \"ecs_clusters\": [" >> "$REPORT_FILE"

if aws ecs list-clusters --region "$AWS_REGION" &> /dev/null; then
    ECS_CLUSTERS=$(aws ecs list-clusters --region "$AWS_REGION" --query 'clusterArns[*]' --output table)
    echo "$ECS_CLUSTERS"
    
    aws ecs list-clusters --region "$AWS_REGION" --query 'clusterArns[*]' >> "$REPORT_FILE"
    ECS_COUNT=$(aws ecs list-clusters --region "$AWS_REGION" --query 'length(clusterArns)')
    print_status "Found $ECS_COUNT ECS cluster(s)"
else
    print_warning "Cannot access ECS information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess CloudFront Distributions
print_section "CloudFront Distribution Assessment"
echo "  \"cloudfront_distributions\": [" >> "$REPORT_FILE"

if aws cloudfront list-distributions &> /dev/null; then
    CF_DISTRIBUTIONS=$(aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,DomainName,Status,Enabled]' --output table)
    echo "$CF_DISTRIBUTIONS"
    
    aws cloudfront list-distributions --query 'DistributionList.Items[*]' >> "$REPORT_FILE"
    CF_COUNT=$(aws cloudfront list-distributions --query 'length(DistributionList.Items)')
    print_status "Found $CF_COUNT CloudFront distribution(s)"
else
    print_warning "Cannot access CloudFront information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess Security Groups
print_section "Security Group Assessment"
echo "  \"security_groups\": [" >> "$REPORT_FILE"

if aws ec2 describe-security-groups --region "$AWS_REGION" &> /dev/null; then
    SECURITY_GROUPS=$(aws ec2 describe-security-groups --region "$AWS_REGION" --query 'SecurityGroups[*].[GroupId,GroupName,VpcId,Description]' --output table)
    echo "$SECURITY_GROUPS"
    
    aws ec2 describe-security-groups --region "$AWS_REGION" --query 'SecurityGroups[*]' >> "$REPORT_FILE"
    SG_COUNT=$(aws ec2 describe-security-groups --region "$AWS_REGION" --query 'length(SecurityGroups)')
    print_status "Found $SG_COUNT security group(s)"
else
    print_warning "Cannot access Security Group information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]," >> "$REPORT_FILE"

# Assess IAM Roles
print_section "IAM Role Assessment"
echo "  \"iam_roles\": [" >> "$REPORT_FILE"

if aws iam list-roles &> /dev/null; then
    IAM_ROLES=$(aws iam list-roles --query 'Roles[*].[RoleName,CreateDate,Arn]' --output table)
    echo "$IAM_ROLES"
    
    aws iam list-roles --query 'Roles[*]' >> "$REPORT_FILE"
    IAM_COUNT=$(aws iam list-roles --query 'length(Roles)')
    print_status "Found $IAM_COUNT IAM role(s)"
else
    print_warning "Cannot access IAM information"
    echo "    {\"error\": \"access_denied\"}" >> "$REPORT_FILE"
fi

echo "  ]" >> "$REPORT_FILE"

# Close JSON
echo "}" >> "$REPORT_FILE"

# Generate Integration Recommendations
print_section "IBOSS Integration Recommendations"

cat > "iboss-integration-recommendations.md" << EOF
# IBOSS Integration Recommendations for Existing AWS Infrastructure

## 📊 Infrastructure Summary
- **VPCs**: $VPC_COUNT
- **Subnets**: $SUBNET_COUNT  
- **EC2 Instances**: $INSTANCE_COUNT
- **RDS Instances**: $RDS_COUNT
- **Load Balancers**: $LB_COUNT
- **S3 Buckets**: $S3_COUNT
- **ECS Clusters**: $ECS_COUNT
- **CloudFront Distributions**: $CF_COUNT
- **Security Groups**: $SG_COUNT
- **IAM Roles**: $IAM_COUNT

## 🎯 Recommended Integration Strategy

### If you have ECS Clusters ($ECS_COUNT found):
✅ **Containerized Integration** - Deploy IBOSS as ECS services
- Use existing ECS cluster
- Add IBOSS task definitions
- Integrate with existing load balancer

### If you have EC2 Instances ($INSTANCE_COUNT found):
✅ **EC2 Integration** - Deploy IBOSS on existing instances
- Install Node.js and dependencies
- Use PM2 for process management
- Configure reverse proxy

### If you have RDS Instances ($RDS_COUNT found):
✅ **Database Integration** - Use existing database
- Create IBOSS schema in existing RDS
- Configure connection pooling
- Set up proper security groups

### If you have Load Balancers ($LB_COUNT found):
✅ **Traffic Routing** - Add IBOSS routes
- Create target groups for IBOSS
- Add listener rules for /api/iboss/*
- Configure health checks

## 🔧 Next Steps
1. Review detailed assessment: $REPORT_FILE
2. Choose integration strategy based on existing resources
3. Run integration deployment script
4. Test IBOSS functionality
5. Monitor performance and logs

## 📞 Support
- Account: $AWS_ACCOUNT_ID
- Region: $AWS_REGION
- Assessment Date: $ASSESSMENT_DATE
EOF

print_status "Assessment completed successfully"
print_info "Detailed report: $REPORT_FILE"
print_info "Recommendations: iboss-integration-recommendations.md"

# Summary
print_section "Assessment Summary"
echo -e "${GREEN}Infrastructure Assessment Complete${NC}"
echo ""
echo -e "${BLUE}📊 Resources Found:${NC}"
echo -e "   • VPCs: ${GREEN}$VPC_COUNT${NC}"
echo -e "   • Subnets: ${GREEN}$SUBNET_COUNT${NC}"
echo -e "   • EC2 Instances: ${GREEN}$INSTANCE_COUNT${NC}"
echo -e "   • RDS Instances: ${GREEN}$RDS_COUNT${NC}"
echo -e "   • Load Balancers: ${GREEN}$LB_COUNT${NC}"
echo -e "   • S3 Buckets: ${GREEN}$S3_COUNT${NC}"
echo -e "   • ECS Clusters: ${GREEN}$ECS_COUNT${NC}"
echo -e "   • CloudFront Distributions: ${GREEN}$CF_COUNT${NC}"
echo ""
echo -e "${BLUE}📋 Files Generated:${NC}"
echo -e "   • Assessment Report: ${YELLOW}$REPORT_FILE${NC}"
echo -e "   • Integration Recommendations: ${YELLOW}iboss-integration-recommendations.md${NC}"
echo ""
echo -e "${GREEN}✅ Ready to proceed with IBOSS integration!${NC}"
