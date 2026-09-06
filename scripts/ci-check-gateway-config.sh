#!/usr/bin/env bash
# ============================================================================
# CI check: API Gateway timeouts and circuit breaker config
# ----------------------------------------------------------------------------
# ADR-009: Global CircuitBreaker must NOT be enabled on api-gateway. Each
# route needing resilience must declare explicit per-route CB. Also enforce
# that httpclient timeouts are configured.
#
# Exit codes:
#   0 = OK
#   1 = violation detected (BLOCK MERGE)
# ============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

echo "=============================================="
echo "CI Check: API Gateway Timeouts & Circuit Breaker"
echo "ADR-009 reference"
echo "=============================================="
echo ""

GATEWAY_YML="services/api-gateway/src/main/resources/application.yml"

if [ ! -f "$GATEWAY_YML" ]; then
  echo -e "${YELLOW}⚠${NC} $GATEWAY_YML not found (skip)"
  exit 0
fi

# ----------------------------------------------------------------------------
# 1. Global CircuitBreaker must NOT be in default-filters
# ----------------------------------------------------------------------------
echo "[1/3] Global CircuitBreaker in default-filters..."
if grep -A 5 "default-filters" "$GATEWAY_YML" | grep -q "CircuitBreaker"; then
  echo -e "${RED}✗${NC} Global CircuitBreaker found in default-filters"
  echo "    Per ADR-009: KHONG bat global CircuitBreaker filter."
  echo "    Move it to per-route level if needed."
  FAILED=1
else
  echo -e "${GREEN}✓${NC} No global CircuitBreaker in default-filters"
fi

# ----------------------------------------------------------------------------
# 2. httpclient.response-timeout must be set
# ----------------------------------------------------------------------------
echo ""
echo "[2/3] httpclient.response-timeout..."
# Spring Boot duration format: 30s, 5000ms, or just 5000 (ms)
TIMEOUT_RAW=$(grep -E "response-timeout:" "$GATEWAY_YML" | head -1)
if echo "$TIMEOUT_RAW" | grep -qE "response-timeout:\s*[0-9]+ms"; then
  TIMEOUT=$(echo "$TIMEOUT_RAW" | sed -E 's/.*response-timeout:\s*([0-9]+)ms.*/\1/')
elif echo "$TIMEOUT_RAW" | grep -qE "response-timeout:\s*[0-9]+s"; then
  TIMEOUT=$(echo "$TIMEOUT_RAW" | sed -E 's/.*response-timeout:\s*([0-9]+)s.*/\1/')
  TIMEOUT=$((TIMEOUT * 1000))
elif echo "$TIMEOUT_RAW" | grep -qE "response-timeout:\s*[0-9]+\s*$"; then
  TIMEOUT=$(echo "$TIMEOUT_RAW" | sed -E 's/.*response-timeout:\s*([0-9]+).*/\1/')
else
  TIMEOUT=0
fi

if [ "$TIMEOUT" -ge 10000 ]; then
  echo -e "${GREEN}✓${NC} response-timeout = ${TIMEOUT}ms"
elif [ "$TIMEOUT" -gt 0 ]; then
  echo -e "${YELLOW}⚠${NC} response-timeout = ${TIMEOUT}ms (< 10s, may cause false positives)"
else
  echo -e "${RED}✗${NC} httpclient.response-timeout not set"
  echo "    Per ADR-009: PHẢI có response-timeout >= 10s."
  FAILED=1
fi

# ----------------------------------------------------------------------------
# 3. FallbackController must return HTTP 503
# ----------------------------------------------------------------------------
echo ""
echo "[3/3] FallbackController status code..."
FALLBACK="services/api-gateway/src/main/java/com/ioes/gateway/controller/FallbackController.java"
if [ -f "$FALLBACK" ]; then
  if grep -q "SERVICE_UNAVAILABLE\|HttpStatus.SERVICE_UNAVAILABLE" "$FALLBACK"; then
    echo -e "${GREEN}✓${NC} $FALLBACK returns 503"
  else
    echo -e "${RED}✗${NC} $FALLBACK does not return 503"
    echo "    Per ADR-009: Fallback MUST trả HTTP 503 Service Unavailable."
    FAILED=1
  fi
else
  echo -e "${YELLOW}⚠${NC} $FALLBACK not found (skip)"
fi

echo ""
echo "=============================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Gateway config OK${NC}"
  exit 0
else
  echo -e "${RED}❌ Gateway config violation — BLOCK MERGE${NC}"
  echo "Fix per ADR-009: docs/02-architecture/adr/ADR-009-gateway-timeouts-and-circuit-breaker.md"
  exit 1
fi