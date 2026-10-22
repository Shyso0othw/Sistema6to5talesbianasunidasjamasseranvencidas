#!/usr/bin/env bash
# Post-deployment smoke test for sistema-escolar
# Run after deployment to verify basic functionality
# Exit codes: 0 = all tests passed, non-zero = issues found

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="${BASE_URL:-http://srv-app01}"
HEALTH_URL="${BASE_URL}/api/health/"
LOGIN_URL="${BASE_URL}/api/login/"
PROTECTED_URL="${BASE_URL}/api/perfil/"

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

FAILED=0

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local method="${4:-GET}"
    local data="${5:-}"
    local headers="${6:-}"

    local curl_cmd="curl --max-time 15 -s -w '\n%{http_code}' -X $method"
    if [[ -n "$data" ]]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    if [[ -n "$headers" ]]; then
        curl_cmd="$curl_cmd $headers"
    fi
    curl_cmd="$curl_cmd '$url'"

    local response
    response=$(eval "$curl_cmd" 2>/dev/null || true)
    local status_code
    status_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | head -n -1)

    if [[ "$status_code" == "$expected_status" ]]; then
        log_info "$name: HTTP $status_code (expected $expected_status)"
        return 0
    else
        log_error "$name: HTTP $status_code (expected $expected_status)"
        echo "Response: $body"
        return 1
    fi
}

test_json_field() {
    local name="$1"
    local url="$2"
    local field="$3"
    local expected="${4:-}"

    local response
    response=$(curl --max-time 15 -s "$url" 2>/dev/null || true)
    local value
    value=$(echo "$response" | python3 -c "import sys,json,functools; print(functools.reduce(lambda d,k: d.get(k,{}) if isinstance(d,dict) else {}, '$field'.split('.'),json.load(sys.stdin)))" 2>/dev/null || true)

    if [[ -n "$expected" ]]; then
        if [[ "$value" == "$expected" ]]; then
            log_info "$name: $field = $value"
            return 0
        else
            log_error "$name: $field = $value (expected $expected)"
            return 1
        fi
    else
        if [[ -n "$value" ]]; then
            log_info "$name: $field present"
            return 0
        else
            log_error "$name: $field missing"
            return 1
        fi
    fi
}

FAILED=0

log_info "=== Smoke Tests for Sistema Escolar ==="
log_info "Base URL: $BASE_URL"
echo

# 1. Health endpoint
log_info "Testing health endpoint..."
if test_endpoint "Health check" "$HEALTH_URL" "200"; then
    test_json_field "Health DB" "$HEALTH_URL" "checks.database.status" "ok" || FAILED=1
    test_json_field "Health Redis" "$HEALTH_URL" "checks.redis.status" "ok" || FAILED=1
else
    FAILED=1
fi

# 2. Login endpoint accessible
log_info "Testing login endpoint..."
test_endpoint "Login endpoint (no auth)" "$LOGIN_URL" "400" "POST" '{}' || FAILED=1

# 3. Protected endpoint requires auth
log_info "Testing protected endpoint requires auth..."
test_endpoint "Protected endpoint (no token)" "$PROTECTED_URL" "401" || FAILED=1

# 4. Frontend served
log_info "Testing frontend served..."
test_endpoint "Frontend root" "$BASE_URL/" "200" || FAILED=1

# Asset paths must be taken from the generated index; directory status does not validate assets.

# 6. API endpoints via Nginx
log_info "Testing API proxy..."
test_endpoint "API via Nginx (401 expected)" "$BASE_URL/api/alumnos/" "401" || FAILED=1

# A plain HTTP request to /ws/ does not test a WebSocket handshake.
log_warn "WebSocket authentication, delivery and reconnect require authenticated functional testing; not certified by this script."

# 8. Daphne not exposed directly
log_info "Verifying Daphne not exposed directly..."
if curl --max-time 15 -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8000/api/health/" 2>/dev/null | grep -q "200"; then
    log_warn "Daphne accessible on localhost:8000 (expected for internal)"
else
    log_info "Daphne not directly accessible on localhost:8000 (may be down)"
fi

# 9. Nginx not proxying to Daphne directly on external interface
log_info "Verifying Nginx configuration..."
# This is a basic check - in reality you'd verify the nginx config

# 10. Database connectivity via health
log_info "Verifying database via health endpoint..."
# Already checked in health endpoint

echo
if [[ $FAILED -eq 0 ]]; then
    log_info "=== HTTP checks PASSED; WebSocket and infrastructure need separate validation ==="
    exit 0
else
    log_error "=== Some smoke tests FAILED ==="
    exit 1
fi