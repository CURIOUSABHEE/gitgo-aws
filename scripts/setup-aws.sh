#!/bin/bash

# GitGo AWS Setup Script
# This script helps you set up the required AWS resources for GitGo deployment

set -e

echo "🚀 GitGo AWS Setup Script"
echo "=========================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run: aws configure"
    exit 1
fi

echo "✅ AWS CLI is configured"
echo ""

# Get AWS region
read -p "Enter AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

echo ""
echo "📦 Creating DynamoDB Tables..."
echo ""

# Create DynamoDB tables
TABLES=(
    "GitGo-Recommendations:userId:S"
    "GitGo-Repositories:githubId:S"
    "GitGo-ContributorFriendlyRepo:repoId:N"
    "GitGo-Portfolio:userId:S"
    "GitGo-RepositoryAnalysis:repoId:N"
    "GitGo-RouteCache:path:S"
)

for table_info in "${TABLES[@]}"; do
    IFS=':' read -r table_name key_name key_type <<< "$table_info"
    
    echo "Creating table: $table_name..."
    
    aws dynamodb create-table \
        --table-name "$table_name" \
        --attribute-definitions AttributeName="$key_name",AttributeType="$key_type" \
        --key-schema AttributeName="$key_name",KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION" \
        2>/dev/null && echo "✅ Created $table_name" || echo "⚠️  $table_name already exists or failed"
done

echo ""
echo "📦 Creating S3 Bucket..."
echo ""

# Create S3 bucket
BUCKET_NAME="gitgo-resumes-bucket-users-$(date +%s)"
read -p "Enter S3 bucket name (default: $BUCKET_NAME): " USER_BUCKET
BUCKET_NAME=${USER_BUCKET:-$BUCKET_NAME}

aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null && \
    echo "✅ Created S3 bucket: $BUCKET_NAME" || \
    echo "⚠️  Bucket already exists or failed"

# Block public access
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --region "$AWS_REGION" 2>/dev/null && \
    echo "✅ Configured bucket security" || \
    echo "⚠️  Security configuration failed"

echo ""
echo "🤖 Checking Bedrock Model Access..."
echo ""

# Check Bedrock model access
aws bedrock list-foundation-models --region "$AWS_REGION" &> /dev/null && \
    echo "✅ Bedrock is accessible in $AWS_REGION" || \
    echo "⚠️  Bedrock may not be available. Please enable model access in the console."

echo ""
echo "✅ AWS Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Go to AWS Bedrock console and enable 'Amazon Nova Pro' model access"
echo "2. Set up MongoDB Atlas: https://www.mongodb.com/cloud/atlas"
echo "3. Create GitHub OAuth App: https://github.com/settings/developers"
echo "4. Create LinkedIn OAuth App: https://www.linkedin.com/developers/apps"
echo "5. Deploy to AWS Amplify with these environment variables:"
echo ""
echo "   DATABASE_MODE=dynamodb"
echo "   GITGO_AWS_REGION=$AWS_REGION"
echo "   GITGO_EXECUTION_MODE=lambda"
echo "   GITGO_S3_BUCKET_NAME=$BUCKET_NAME"
echo ""
echo "📖 Full deployment guide: AWS_SERVERLESS_DEPLOYMENT.md"
echo ""
