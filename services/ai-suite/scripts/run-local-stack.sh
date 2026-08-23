#!/usr/bin/env bash
# Dung toan bo stack can cho US-017 Chatbot RAG tren may local.
#
# Vi sao co file nay thay vi go tay tung lenh: api-gateway phai chay kem hai
# thuoc tinh ghi de, thieu mot cai la luong chat hong. Ca hai deu la loi trong
# cau hinh cua api-gateway (Epic 1 - Dao), khong phai cua ai-suite, nen khong
# sua thang vao repo cua ho. Ban va de nghi: docs/04-operations/known-issues/
#
#   1. resilience4j.timelimiter.instances.default.timeoutDuration
#      Mac dinh cua Resilience4j la 1 giay. Moi route deu dinh filter
#      CircuitBreaker ten "default", nen loi goi nao cham hon 1 giay deu bi cat
#      va tra 500, ke ca khi service dich da tra loi xong. Do thuc te tren
#      POST /api/ai/chat: 1.012s.
#
#   2. jwt.secret
#      JwtTokenProvider (libs/common-jwt) doc khoa jwt.secret. api-gateway
#      khong khai khoa nay nen roi ve mac dinh "change-me-in-production...",
#      trong khi auth-service ky bang secret rieng. Lech khoa nen gateway tra
#      401 cho MOI token do auth-service phat ra.
#
# Sau khi Dao ap ban va, xoa hai bien GATEWAY_OVERRIDES o duoi.
#
# Cach dung:
#   bash services/ai-suite/scripts/run-local-stack.sh          # dung stack
#   bash services/ai-suite/scripts/run-local-stack.sh --ingest # dung roi nap corpus
#   bash services/ai-suite/scripts/run-local-stack.sh --stop   # dung stack lai

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOG_DIR="${IOES_LOG_DIR:-$REPO_ROOT/.local-logs}"
JAVA_HOME="${JAVA_HOME:-/c/Users/ADMIN/tools/jdk-17.0.20+8}"
JAVA="$JAVA_HOME/bin/java.exe"

JWT_SECRET_LOCAL="ioes-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256-signing-algorithm"
GATEWAY_OVERRIDES=(
  "--resilience4j.timelimiter.instances.default.timeoutDuration=30s"
  "--jwt.secret=$JWT_SECRET_LOCAL"
)

log()  { printf '\n=== %s\n' "$*"; }
fail() { printf '\nLOI: %s\n' "$*" >&2; exit 1; }

port_open() { (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

wait_port() {
  local port=$1 name=$2 tries=${3:-90} n=0
  until port_open "$port"; do
    n=$((n + 1))
    if [ "$n" -gt "$tries" ]; then
      printf 'TIMEOUT cho %s (cong %s). 20 dong log cuoi:\n' "$name" "$port" >&2
      tail -20 "$LOG_DIR/$name.log" >&2 2>/dev/null
      return 1
    fi
    sleep 2
  done
  printf '  %-14s cong %-5s UP\n' "$name" "$port"
}

kill_port() {
  local pid
  pid=$(powershell.exe -NoProfile -Command \
    "(Get-NetTCPConnection -LocalPort $1 -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique" \
    2>/dev/null | tr -d '\r' | head -1)
  [ -n "${pid:-}" ] && powershell.exe -NoProfile -Command "Stop-Process -Id $pid -Force" >/dev/null 2>&1
}

stop_stack() {
  log "Dung cac service"
  for port in 8080 9100 9101 9009 9000 8888 9999; do
    kill_port "$port"
    printf '  cong %s da giai phong\n' "$port"
  done
  exit 0
}

[ "${1:-}" = "--stop" ] && stop_stack

[ -x "$JAVA" ] || fail "khong thay java tai $JAVA (dat JAVA_HOME)"
mkdir -p "$LOG_DIR"

# ---------------------------------------------------------------- ha tang
log "Ha tang Docker"
docker info >/dev/null 2>&1 || fail "Docker daemon chua chay"
(cd "$REPO_ROOT/infrastructure" && docker compose up -d >/dev/null 2>&1)

# Tat may dot ngot lam znode ephemeral cua broker ket lai trong zookeeper, va
# kafka chet luc khoi dong voi "NodeExists ... registerBroker". Khoi dong lai
# zookeeper cho session het han la het.
if [ "$(docker inspect -f '{{.State.Health.Status}}' ioes-kafka 2>/dev/null)" != "healthy" ]; then
  log "Kafka khong healthy - khoi dong lai zookeeper roi kafka"
  docker restart ioes-zookeeper >/dev/null
  until [ "$(docker inspect -f '{{.State.Health.Status}}' ioes-zookeeper 2>/dev/null)" = "healthy" ]; do sleep 3; done
  docker restart ioes-kafka >/dev/null
  n=0
  until [ "$(docker inspect -f '{{.State.Health.Status}}' ioes-kafka 2>/dev/null)" = "healthy" ]; do
    n=$((n + 1)); [ "$n" -gt 40 ] && fail "kafka van khong healthy"; sleep 5
  done
  (cd "$REPO_ROOT/infrastructure" && docker compose up -d >/dev/null 2>&1)
fi
printf '  %s container dang chay\n' "$(docker ps -q | wc -l | tr -d ' ')"

# ------------------------------------------------------- java: theo thu tu
# discovery truoc, roi config, roi cac service dang ky vao discovery.
log "Java services"
start_java() {
  local name=$1 jar=$2 port=$3; shift 3
  port_open "$port" && { printf '  %-14s cong %-5s da chay san\n' "$name" "$port"; return 0; }
  nohup "$JAVA" -jar "$REPO_ROOT/$jar" "$@" > "$LOG_DIR/$name.log" 2>&1 &
}

start_java discovery services/discovery-service/target/discovery-service-1.0.0.jar 9999
wait_port 9999 discovery || exit 1
start_java config services/config-server/target/config-server-1.0.0.jar 8888
wait_port 8888 config || exit 1

start_java auth         services/auth-service/target/auth-service-1.0.0.jar 9000
start_java notification services/notification-service/target/notification-service-1.0.0.jar 9009
start_java api-gateway  services/api-gateway/target/api-gateway-1.0.0.jar 8080 "${GATEWAY_OVERRIDES[@]}"

# ----------------------------------------------------------------- ai-suite
log "AI Suite"
if ! port_open 9101; then
  (cd "$REPO_ROOT/services/ai-suite/ml-worker" \
    && nohup .venv/Scripts/python.exe -m uvicorn ml_worker.main:app --host 0.0.0.0 --port 9101 \
       > "$LOG_DIR/ml-worker.log" 2>&1 &)
fi
if ! port_open 9100; then
  (cd "$REPO_ROOT/services/ai-suite/api-gateway" \
    && nohup node dist/services/ai-suite/api-gateway/src/main.js \
       > "$LOG_DIR/ai-gateway.log" 2>&1 &)
fi

for entry in "9000 auth" "9009 notification" "8080 api-gateway" "9101 ml-worker" "9100 ai-gateway"; do
  wait_port ${entry} || exit 1
done

# ------------------------------------------------------------------- corpus
if [ "${1:-}" = "--ingest" ]; then
  log "Nap corpus vao Milvus (khoang 2-3 phut)"
  curl -s -X POST --max-time 900 http://localhost:9101/v1/rag/ingest; echo
fi

log "Xong"
printf 'Log: %s\n' "$LOG_DIR"
printf 'Thu nhanh: curl -s -X POST http://localhost:9101/v1/rag/query -H "Content-Type: application/json" -d "{\\"question\\":\\"Box model gom nhung lop nao?\\"}"\n'
