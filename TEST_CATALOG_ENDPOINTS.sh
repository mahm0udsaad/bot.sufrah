#!/bin/bash

# Test Script for Catalog Endpoints
# This script tests all four catalog endpoints to verify they're working correctly

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
PAT_TOKEN="${NEXT_PUBLIC_DASHBOARD_PAT:-YOUR_PAT_TOKEN_HERE}"
RESTAURANT_ID="${RESTAURANT_ID:-cmgm28wjo0001sa9oqd57vqko}"
LANGUAGE="ar"

echo "=================================================="
echo "🧪 Testing Catalog Endpoints"
echo "=================================================="
echo ""
echo "Configuration:"
echo "  Base URL: ${BASE_URL}"
echo "  Restaurant ID: ${RESTAURANT_ID}"
echo "  Language: ${LANGUAGE}"
echo "  PAT: ${PAT_TOKEN:0:10}..."
echo ""

# Function to test an endpoint
test_endpoint() {
  local name=$1
  local endpoint=$2
  local description=$3
  
  echo "---"
  echo "📋 Testing: ${name}"
  echo "   ${description}"
  echo ""
  
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "${BASE_URL}${endpoint}" \
    -H "Authorization: Bearer ${PAT_TOKEN}" \
    -H "X-Restaurant-Id: ${RESTAURANT_ID}" \
    -H "Accept-Language: ${LANGUAGE}")
  
  http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS:/d')
  
  if [ "$http_status" == "200" ]; then
    echo -e "${GREEN}✅ Success (HTTP $http_status)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  elif [ "$http_status" == "401" ]; then
    echo -e "${RED}❌ Authentication Failed (HTTP $http_status)${NC}"
    echo "   Make sure NEXT_PUBLIC_DASHBOARD_PAT is set correctly"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  elif [ "$http_status" == "404" ]; then
    echo -e "${RED}❌ Not Found (HTTP $http_status)${NC}"
    echo "   Endpoint may not be implemented on the backend"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed (HTTP $http_status)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  echo ""
}

# Test 1: Categories
test_endpoint \
  "Categories" \
  "/api/catalog/categories" \
  "Fetch all menu categories with item counts"

# Test 2: Items (all)
test_endpoint \
  "Items (All)" \
  "/api/catalog/items" \
  "Fetch all menu items across all categories"

# Test 3: Items (filtered by category)
# Note: You'll need to replace CATEGORY_ID with a real category ID from your data
test_endpoint \
  "Items (Filtered)" \
  "/api/catalog/items?categoryId=cat_example" \
  "Fetch items filtered by category ID"

# Test 4: Branches
test_endpoint \
  "Branches" \
  "/api/catalog/branches" \
  "Fetch restaurant branches"

# Test 5: Sync Status
test_endpoint \
  "Sync Status" \
  "/api/catalog/sync-status" \
  "Get catalog synchronization status"

echo "=================================================="
echo "🏁 Testing Complete"
echo "=================================================="
echo ""
echo "💡 Tips:"
echo "   - If you see 401 errors, check your NEXT_PUBLIC_DASHBOARD_PAT"
echo "   - If you see 404 errors, make sure the backend server is running"
echo "   - If you see 400 errors, check that the restaurant is linked to a merchant"
echo ""
echo "📝 To test with different parameters:"
echo "   export RESTAURANT_ID='your_restaurant_id'"
echo "   export NEXT_PUBLIC_DASHBOARD_PAT='your_pat_token'"
echo "   ./TEST_CATALOG_ENDPOINTS.sh"
echo ""

