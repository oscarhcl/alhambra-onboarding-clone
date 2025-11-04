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
