#!/bin/bash

# E-commerce OAuth 2.0 Microservices - Automated Test Runner
# This script runs all Postman tests using Newman CLI

echo "🧪 E-commerce OAuth 2.0 Microservices - Test Runner"
echo "=================================================="

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo "❌ Newman CLI not found. Installing..."
    npm install -g newman
    npm install -g newman-reporter-html
fi

# Check if services are running
echo "🔍 Checking if services are running..."

# Check Auth Service
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Auth Service (3001) - Running"
else
    echo "❌ Auth Service (3001) - Not running"
    echo "Please start the services with: npm start"
    exit 1
fi

# Check Product Service
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ Product Service (3002) - Running"
else
    echo "❌ Product Service (3002) - Not running"
    echo "Please start the services with: npm start"
    exit 1
fi

# Check Frontend Service
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend Service (3000) - Running"
else
    echo "❌ Frontend Service (3000) - Not running"
    echo "Please start the services with: npm start"
    exit 1
fi

echo ""
echo "🚀 Starting OAuth 2.0 Test Suite..."
echo ""

# Create results directory
mkdir -p test-results

# Run Newman tests
newman run E-commerce_OAuth2_Tests.postman_collection.json \
    -e E-commerce_Environment.postman_environment.json \
    --reporters cli,html,json \
    --reporter-html-export test-results/oauth2-test-report.html \
    --reporter-json-export test-results/oauth2-test-results.json \
    --delay-request 500 \
    --timeout-request 10000 \
    --color on \
    --verbose

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests completed successfully!"
    echo "📊 Test report: test-results/oauth2-test-report.html"
    echo "📄 JSON results: test-results/oauth2-test-results.json"
    echo ""
    echo "🌐 Open the HTML report in your browser:"
    echo "   file://$(pwd)/test-results/oauth2-test-report.html"
else
    echo ""
    echo "❌ Some tests failed. Check the report for details."
    echo "📊 Test report: test-results/oauth2-test-report.html"
    exit 1
fi

echo ""
echo "🎯 Test Categories Covered:"
echo "   ✓ Health Checks"
echo "   ✓ Basic Authentication (Login)"
echo "   ✓ JWT Token Validation"
echo "   ✓ OAuth 2.0 Authorization Code Flow"
echo "   ✓ OAuth 2.0 Client Credentials Flow"
echo "   ✓ RBAC Authorization (Admin/Viewer/Customer)"
echo "   ✓ Security Tests (Invalid tokens, unauthorized access)"
echo ""
echo "📚 OAuth 2.0 Concepts Tested:"
echo "   ✓ Authentication vs Authorization"
echo "   ✓ JWT Token Structure & Validation"
echo "   ✓ Role-Based Access Control (RBAC)"
echo "   ✓ Scope-Based Permissions"
echo "   ✓ Service-to-Service Authentication"
echo "   ✓ Token Lifecycle Management"
echo ""
