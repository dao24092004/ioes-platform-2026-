#!/usr/bin/env bash
# ============================================================================
# CI check: JWT secret synchronization + NO DEFAULT FALLBACK
# ----------------------------------------------------------------------------
# ADR-008 (24/08/2026):
#   1. Mọi service verify JWT PHẢI reference ${JWT_SECRET} (KHÔNG default fallback)
#   2. Mọi service PHẢI dùng cùng secret value (load từ root .env)
#   3. Default fallback trong code = SECURITY RISK (lộ qua source/git)
#
# Lý do rule #1 quan trọng:
#   - Pre-incident: api-gateway có default "change-me-..." khác auth-service
#     → tokens hợp lệ bị reject 401, không ai phát hiện.
#   - Post-incident fix v1: default "ioes-jwt-secret-key-must-..." được share.
#     → Vẫn có secret hard-code trong source. Nếu repo leak → tất cả dev/staging
#       dùng cùng secret → production bị scan → compromised.
#   - Final fix: KHÔNG có default. JWT_SECRET PHẢI được set qua env.
#     Nếu thiếu → app fail tại startup với lỗi rõ ràng.
#
# Rules enforce:
#   1. Java services: ${jwt.secret} in application*.yml (NO `:` default)
#   2. JwtTokenProvider.java: @Value("${jwt.secret}") (NO `:` default)
#   3. Node.js services: requiredSecret('JWT_SECRET') in app.config.ts
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

EXPECTED_SECRET_PATTERN='conghoaxahoichunghiavietnamdoclaptudohanhphuc-2-9-1975'

FAILED=0

echo "=============================================="
echo "CI Check: JWT Secret — NO DEFAULT FALLBACK"
echo "ADR-008 reference"
echo "=============================================="
echo ""

# ----------------------------------------------------------------------------
# 1. Java services - enforce ${JWT_SECRET} without default fallback
# ----------------------------------------------------------------------------
echo "[1/4] Java services — application*.yml..."
for f in $(find services -path '*/src/main/resources/application*.yml' 2>/dev/null); do
  # Skip if file doesn't define jwt block
  if ! grep -qE "^jwt:" "$f"; then
    continue
  fi

  # Extract the secret line
  SECRET_LINE=$(grep -E "^\s*secret:" "$f" | head -1)

  if [ -z "$SECRET_LINE" ]; then
    echo -e "${YELLOW}⚠${NC} $f (jwt block exists but no 'secret:' field — OK for non-issuer services)"
    continue
  fi

  # Check pattern: must be ${JWT_SECRET} WITHOUT default (NO `:` after JWT_SECRET)
  # OK:    secret: ${JWT_SECRET}
  # BAD:   secret: ${JWT_SECRET:anything...}
  if echo "$SECRET_LINE" | grep -qE "secret:[[:space:]]*[\"']?\\\$\{JWT_SECRET(:[^}]+)?\}[[:space:]]*\$"; then
    # Has ${JWT_SECRET:default} pattern — VIOLATION
    if echo "$SECRET_LINE" | grep -qE "secret:[[:space:]]*[\"']?\\\$\{JWT_SECRET:"; then
      echo -e "${RED}✗${NC} $f"
      echo "    secret line: $SECRET_LINE"
      echo "    VIOLATION: jwt.secret MUST NOT have default fallback"
      echo "    Per ADR-008: secret phải load trực tiếp từ env, không hard-code."
      FAILED=1
    else
      # ${JWT_SECRET} without default — OK
      echo -e "${GREEN}✓${NC} $f"
    fi
  else
    echo -e "${RED}✗${NC} $f"
    echo "    secret line: $SECRET_LINE"
    echo "    VIOLATION: jwt.secret must reference \${JWT_SECRET} (without default)"
    FAILED=1
  fi
done

# ----------------------------------------------------------------------------
# 2. Common library - check JwtTokenProvider.java has NO default
# ----------------------------------------------------------------------------
echo ""
echo "[2/4] Common library (libs/common-jwt)..."
JWT_PROVIDER="libs/common-jwt/src/main/java/com/ioes/common/security/JwtTokenProvider.java"
if [ -f "$JWT_PROVIDER" ]; then
  # Check for @Value annotation with jwt.secret
  SECRET_LINE=$(grep -E '@Value.*jwt\.secret' "$JWT_PROVIDER" | head -1)

  if [ -z "$SECRET_LINE" ]; then
    # Maybe jwtSecret field directly — skip
    echo -e "${YELLOW}⚠${NC} $JWT_PROVIDER (no @Value jwt.secret annotation — manual check)"
  elif echo "$SECRET_LINE" | grep -qE '@Value\(\"\$\{jwt.secret(:[^}]+)?\}\"\)' \
       && ! echo "$SECRET_LINE" | grep -qE '@Value\(\"\$\{jwt.secret:'; then
    echo -e "${GREEN}✓${NC} $JWT_PROVIDER (no default fallback)"
  else
    echo -e "${RED}✗${NC} $JWT_PROVIDER"
    echo "    annotation: $SECRET_LINE"
    echo "    VIOLATION: @Value must be @Value(\"\${jwt.secret}\") without default"
    FAILED=1
  fi
else
  echo -e "${YELLOW}⚠${NC} $JWT_PROVIDER not found (skip)"
fi

# ----------------------------------------------------------------------------
# 3. Python services - check BaseServiceSettings has no jwt_secret default
# ----------------------------------------------------------------------------
echo ""
echo "[3/4] Python common library (libs/common-python)..."
PY_CONFIG="libs/common-python/src/ioes_common/config.py"
if [ -f "$PY_CONFIG" ]; then
  # Find jwt_secret declaration
  JWT_LINE=$(grep -E "jwt_secret:" "$PY_CONFIG" | head -1)

  if echo "$JWT_LINE" | grep -qE 'jwt_secret:\s*str\s*=\s*Field\(\.\.\.\)'; then
    echo -e "${GREEN}✓${NC} $PY_CONFIG (jwt_secret = Field(...), required)"
  elif echo "$JWT_LINE" | grep -qE 'jwt_secret:\s*str\s*=\s*"'; then
    echo -e "${RED}✗${NC} $PY_CONFIG"
    echo "    declaration: $JWT_LINE"
    echo "    VIOLATION: jwt_secret MUST be required (Field(...)) without default"
    FAILED=1
  else
    echo -e "${YELLOW}⚠${NC} $PY_CONFIG (manual check: $JWT_LINE)"
  fi
else
  echo -e "${YELLOW}⚠${NC} $PY_CONFIG not found (skip)"
fi

# Check security.py — should NOT have _default_secret() with fallback
PY_SECURITY="libs/common-python/src/ioes_common/security.py"
if [ -f "$PY_SECURITY" ]; then
  if grep -qE "_default_secret|JWT_SECRET.*default|ioes-jwt-secret" "$PY_SECURITY"; then
    echo -e "${RED}✗${NC} $PY_SECURITY"
    echo "    VIOLATION: security.py must NOT have default JWT_SECRET fallback"
    FAILED=1
  else
    echo -e "${GREEN}✓${NC} $PY_SECURITY (no default fallback)"
  fi
fi

# ----------------------------------------------------------------------------
# 4. Node.js services - enforce requiredSecret (no default)
# ----------------------------------------------------------------------------
echo ""
echo "[4/4] Node.js services..."
for f in $(find services -name 'app.config.ts' 2>/dev/null); do
  if ! grep -q "jwtConfig\|JWT_SECRET" "$f"; then
    continue
  fi

  # Check if file defines requiredSecret function
  if ! grep -q "function requiredSecret" "$f"; then
    # No requiredSecret function → must use required('JWT_SECRET') without fallback
    JWT_LINE=$(grep -E "secret:[[:space:]]*required\(" "$f" | head -1)
    if echo "$JWT_LINE" | grep -qE "required\(\s*['\"]JWT_SECRET['\"]\)"; then
      echo -e "${GREEN}✓${NC} $f (required('JWT_SECRET') no fallback)"
    else
      echo -e "${RED}✗${NC} $f"
      echo "    jwt line: $JWT_LINE"
      echo "    VIOLATION: jwt secret must be required('JWT_SECRET') without fallback"
      FAILED=1
    fi
  else
    # Has requiredSecret function — use it
    JWT_LINE=$(grep -E "secret:[[:space:]]*requiredSecret\(" "$f" | head -1)
    if [ -z "$JWT_LINE" ]; then
      echo -e "${RED}✗${NC} $f"
      echo "    VIOLATION: jwt secret must use requiredSecret('JWT_SECRET')"
      FAILED=1
    else
      echo -e "${GREEN}✓${NC} $f (requiredSecret)"
    fi
  fi
done

# ----------------------------------------------------------------------------
# 5. Single source of truth: chỉ root .env.example được phép
# ----------------------------------------------------------------------------
echo ""
echo "[5/5] Single source of truth — no service-level .env files..."

# 5a. KHÔNG ĐƯỢC có services/**/.env.example
SVC_ENV_EXAMPLES=$(find services -name '.env.example' 2>/dev/null)
if [ -n "$SVC_ENV_EXAMPLES" ]; then
  echo -e "${RED}✗${NC} Service-level .env.example files found (BỊ CẤM):"
  for f in $SVC_ENV_EXAMPLES; do
    echo "    - $f"
  done
  echo "    Per ADR-008: tất cả config phải đặt ở root .env.example"
  FAILED=1
else
  echo -e "${GREEN}✓${NC} No service-level .env.example (single source of truth)"
fi

# 5b. KHÔNG ĐƯỢC có services/**/.env
SVC_ENVS=$(find services -name '.env' -not -name '.env.example' 2>/dev/null)
if [ -n "$SVC_ENVS" ]; then
  echo -e "${RED}✗${NC} Service-level .env files found (BỊ CẤM):"
  for f in $SVC_ENVS; do
    echo "    - $f"
  done
  FAILED=1
else
  echo -e "${GREEN}✓${NC} No service-level .env files"
fi

# 5c. Root .env và .env.example phải có JWT_SECRET match
ROOT_ENV=".env"
ROOT_SECRET=""
if [ -f "$ROOT_ENV" ]; then
  ROOT_SECRET=$(grep -E "^JWT_SECRET=" "$ROOT_ENV" | head -1 | sed -E 's/^JWT_SECRET=//' | tr -d '"' | tr -d "'")
fi

if [ -z "$ROOT_SECRET" ]; then
  echo -e "${YELLOW}⚠${NC} Root .env not found or JWT_SECRET not set (skip value check)"
else
  echo -e "    Root .env JWT_SECRET: length=${#ROOT_SECRET}"

  if [ -f ".env.example" ]; then
    EXAMPLE_SECRET=$(grep -E "^JWT_SECRET=" ".env.example" | head -1 | sed -E 's/^JWT_SECRET=//' | tr -d '"' | tr -d "'")
    if [ "$EXAMPLE_SECRET" != "$ROOT_SECRET" ]; then
      echo -e "${RED}✗${NC} .env.example"
      echo "    got:      length=${#EXAMPLE_SECRET}"
      echo "    expected: length=${#ROOT_SECRET}"
      FAILED=1
    else
      echo -e "${GREEN}✓${NC} .env.example matches .env"
    fi
  else
    echo -e "${RED}✗${NC} .env.example missing"
    FAILED=1
  fi
fi

echo ""
echo "=============================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ JWT secret config OK — NO DEFAULT FALLBACK${NC}"
  exit 0
else
  echo -e "${RED}❌ JWT secret violation — BLOCK MERGE${NC}"
  echo "Fix per ADR-008: docs/02-architecture/adr/ADR-008-jwt-secret-synchronization.md"
  exit 1
fi