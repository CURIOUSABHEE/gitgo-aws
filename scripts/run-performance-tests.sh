#!/bin/bash

# GitGo Performance Testing Script
# Run this to generate a complete performance report

echo "🚀 GitGo Performance Testing Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${1:-https://main.d2nn3tmxv8vbal.amplifyapp.com}"
REPORTS_DIR="./performance-reports"

echo "📍 Testing URL: $APP_URL"
echo ""

# Create reports directory
mkdir -p $REPORTS_DIR

# Check if required tools are installed
echo "🔍 Checking required tools..."

if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js/npx found${NC}"

# Install lighthouse if not present
if ! command -v lighthouse &> /dev/null; then
    echo "📦 Installing Lighthouse..."
    npm install -g lighthouse
fi

# Install artillery if not present
if ! command -v artillery &> /dev/null; then
    echo "📦 Installing Artillery..."
    npm install -g artillery
fi

echo ""
echo "=================================="
echo "📊 Test 1: Frontend Performance (Lighthouse)"
echo "=================================="
echo ""

# Run Lighthouse for different pages
PAGES=(
    ""
    "/dashboard"
    "/dashboard/analyze"
    "/dashboard/recommendations"
)

for page in "${PAGES[@]}"; do
    PAGE_NAME=$(echo "$page" | sed 's/\//-/g' | sed 's/^-//')
    if [ -z "$PAGE_NAME" ]; then
        PAGE_NAME="homepage"
    fi
    
    echo "Testing: $APP_URL$page"
    
    lighthouse "$APP_URL$page" \
        --output html \
        --output json \
        --output-path "$REPORTS_DIR/lighthouse-$PAGE_NAME" \
        --chrome-flags="--headless" \
        --quiet
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Lighthouse report saved: lighthouse-$PAGE_NAME.html${NC}"
    else
        echo -e "${RED}❌ Lighthouse test failed for $page${NC}"
    fi
    echo ""
done

echo ""
echo "=================================="
echo "⚡ Test 2: API Load Testing (Artillery)"
echo "=================================="
echo ""

# Create Artillery test configuration
cat > "$REPORTS_DIR/artillery-config.yml" << EOF
config:
  target: "$APP_URL"
  phases:
    - duration: 30
      arrivalRate: 5
      name: "Warm up"
    - duration: 60
      arrivalRate: 20
      name: "Sustained load"
  
scenarios:
  - name: "Test public endpoints"
    flow:
      - get:
          url: "/api/health"
      - get:
          url: "/api/trending"
      - think: 2
      - get:
          url: "/"
      - think: 3
      - get:
          url: "/dashboard"
EOF

echo "Running load tests..."
artillery run "$REPORTS_DIR/artillery-config.yml" \
    --output "$REPORTS_DIR/load-test.json"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Load test complete${NC}"
    
    # Generate HTML report
    artillery report "$REPORTS_DIR/load-test.json" \
        --output "$REPORTS_DIR/load-test.html"
    
    echo -e "${GREEN}✅ Load test report saved: load-test.html${NC}"
else
    echo -e "${RED}❌ Load test failed${NC}"
fi

echo ""
echo "=================================="
echo "📦 Test 3: Bundle Size Analysis"
echo "=================================="
echo ""

# Check if Next.js build exists
if [ -d ".next" ]; then
    echo "Analyzing bundle size..."
    
    # Create bundle analysis
    cat > "$REPORTS_DIR/bundle-analysis.txt" << EOF
Bundle Size Analysis
====================
Generated: $(date)

Build Directory Size:
EOF
    
    du -sh .next >> "$REPORTS_DIR/bundle-analysis.txt"
    
    echo "" >> "$REPORTS_DIR/bundle-analysis.txt"
    echo "JavaScript Bundles:" >> "$REPORTS_DIR/bundle-analysis.txt"
    find .next/static -name "*.js" -exec du -h {} \; | sort -rh | head -20 >> "$REPORTS_DIR/bundle-analysis.txt"
    
    echo -e "${GREEN}✅ Bundle analysis saved: bundle-analysis.txt${NC}"
else
    echo -e "${YELLOW}⚠️  No build found. Run 'npm run build' first${NC}"
fi

echo ""
echo "=================================="
echo "📊 Test 4: API Response Time Check"
echo "=================================="
echo ""

# Test API endpoints
ENDPOINTS=(
    "/api/health"
    "/api/trending"
)

cat > "$REPORTS_DIR/api-response-times.txt" << EOF
API Response Time Analysis
==========================
Generated: $(date)
Target: $APP_URL

EOF

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"
    
    # Use curl to measure response time
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' "$APP_URL$endpoint")
    HTTP_CODE=$(curl -o /dev/null -s -w '%{http_code}\n' "$APP_URL$endpoint")
    
    echo "$endpoint: ${RESPONSE_TIME}s (HTTP $HTTP_CODE)" >> "$REPORTS_DIR/api-response-times.txt"
    
    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        echo -e "${GREEN}✅ $endpoint: ${RESPONSE_TIME}s${NC}"
    elif (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
        echo -e "${YELLOW}⚠️  $endpoint: ${RESPONSE_TIME}s${NC}"
    else
        echo -e "${RED}❌ $endpoint: ${RESPONSE_TIME}s${NC}"
    fi
done

echo ""
echo "=================================="
echo "✅ Performance Testing Complete!"
echo "=================================="
echo ""
echo "📄 Reports saved in: $REPORTS_DIR/"
echo ""
echo "View reports:"
echo "  - Lighthouse: open $REPORTS_DIR/lighthouse-*.html"
echo "  - Load Test: open $REPORTS_DIR/load-test.html"
echo "  - Bundle Size: cat $REPORTS_DIR/bundle-analysis.txt"
echo "  - API Times: cat $REPORTS_DIR/api-response-times.txt"
echo ""
echo "🎯 Next steps:"
echo "  1. Review Lighthouse scores (target: >90)"
echo "  2. Check API response times (target: <500ms)"
echo "  3. Analyze load test results"
echo "  4. Optimize based on findings"
echo ""
