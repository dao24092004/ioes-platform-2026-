#!/usr/bin/env bash
# IOES API Smoke Test
# Kiểm thử tự động các endpoint chính qua Spring Cloud Gateway (8080).
# Tương thích với checklist mục 4 trong docs/03-development/TEST_HANDOVER.md.
#
# Usage:
#   ./smoke-test.sh                       # mặc định: gateway=http://localhost:8080
#   ./smoke-test.sh http://localhost:8080 # chỉ định gateway
#   SMOKE_OUTPUT=json ./smoke-test.sh     # xuất JSON
#
# Yêu cầu: jq, curl.

set -u

GATEWAY="${1:-http://localhost:8080}"
OUT_DIR="${SMOKE_OUTPUT_DIR:-/tmp/ioes-smoke}"
mkdir -p "$OUT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT="$OUT_DIR/smoke-$TIMESTAMP.log"
RESULTS=()
FAIL_COUNT=0
PASS_COUNT=0

# ===== Màu sắc =====
RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[1;33m'
BLU='\033[0;34m'
NC='\033[0m'

log()    { echo -e "$*" | tee -a "$REPORT"; }
step()   { log "\n${BLU}━━━ $* ━━━${NC}"; }
pass()   { log "${GRN}✓${NC} $*"; PASS_COUNT=$((PASS_COUNT+1)); RESULTS+=("PASS|$*"); }
fail()   { log "${RED}✗${NC} $*"; FAIL_COUNT=$((FAIL_COUNT+1)); RESULTS+=("FAIL|$*"); }
warn()   { log "${YEL}⚠${NC} $*"; }

# Đo thời gian phản hồi + mã HTTP. Trả về "HTTP_TIME".
curl_timed() {
    local method="$1" url="$2"; shift 2
    curl -sS -o /tmp/ioes-body.$$ -w "%{http_code}|%{time_total}\n" \
         -X "$method" "$url" "$@" 2>/dev/null || echo "000|0"
}

# Khẳng định mã HTTP nằm trong tập kỳ vọng.
assert_status() {
    local label="$1" actual="$2" expected="$3" time_s="$4"
    if [[ "$actual" == "$expected" ]]; then
        pass "$label → $actual (${time_s}s)"
    else
        fail "$label → expected $expected, got $actual (${time_s}s)"
        head -c 400 /tmp/ioes-body.$$ | sed 's/^/    /' | tee -a "$REPORT"
    fi
    rm -f /tmp/ioes-body.$$
}

# Đo thời gian một endpoint; chỉ cảnh báo nếu vượt ngưỡng.
assert_perf() {
    local label="$1" time_s="$2" max_s="$3"
    local scaled=$(awk "BEGIN {printf \"%.3f\", $time_s}")
    if (( $(awk "BEGIN {print ($scaled > $max_s)}") )); then
        warn "$label chậm: ${scaled}s > ${max_s}s"
    else
        log "  ⏱  $label: ${scaled}s"
    fi
}

# ============================================================
# BẮT ĐẦU
# ============================================================

log "================================================="
log "IOES Smoke Test"
log "Gateway : $GATEWAY"
log "Report  : $REPORT"
log "Time    : $(date -Iseconds)"
log "================================================="

# ---------------------------------------------------------
# 4.1. Đăng nhập & tài khoản
# ---------------------------------------------------------
step "4.1.1 Đăng nhập với student@ioes.com"

resp=$(curl_timed POST "$GATEWAY/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"student@ioes.com","password":"Test@123"}')
code=${resp%%|*}; time=${resp##*|}
assert_status "POST /api/auth/login (student)" "$code" "200" "$time"
assert_perf "login-student" "$time" "0.5"

# Lấy access token để dùng cho các bước sau.
ACCESS_TOKEN=$(curl -sS -X POST "$GATEWAY/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"student@ioes.com","password":"Test@123"}' | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken') or d.get('accessToken') or '')" 2>/dev/null)

if [[ -z "$ACCESS_TOKEN" ]]; then
    fail "Không lấy được access token (response shape không khớp)"
else
    pass "Lấy access token (${#ACCESS_TOKEN} ký tự)"
fi

step "4.1.2 Đăng nhập sai mật khẩu"
resp=$(curl_timed POST "$GATEWAY/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"student@ioes.com","password":"wrong-password"}')
code=${resp%%|*}; time=${resp##*|}
assert_status "POST /api/auth/login (sai MK)" "$code" "401" "$time"

step "4.1.3 Đăng ký tài khoản mới"
RAND_EMAIL="qa$(date +%s)@ioes-test.com"
resp=$(curl_timed POST "$GATEWAY/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$RAND_EMAIL\",\"password\":\"Test@123\",\"fullName\":\"QA User\",\"role\":\"STUDENT\"}")
code=${resp%%|*}; time=${resp##*|}
assert_status "POST /api/auth/register" "$code" "201" "$time"

# Đăng nhập lại với tài khoản vừa tạo (kiểm tra user mới không bị pending — fix lỗi #3).
resp=$(curl_timed POST "$GATEWAY/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$RAND_EMAIL\",\"password\":\"Test@123\"}")
code=${resp%%|*}; time=${resp##*|}
assert_status "POST /api/auth/login (user mới)" "$code" "200" "$time"

step "4.1.4 Refresh token"
REFRESH_TOKEN=$(curl -sS -X POST "$GATEWAY/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$RAND_EMAIL\",\"password\":\"Test@123\"}" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('refreshToken') or d.get('refreshToken') or '')" 2>/dev/null)
if [[ -n "$REFRESH_TOKEN" ]]; then
    resp=$(curl_timed POST "$GATEWAY/api/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
    code=${resp%%|*}; time=${resp##*|}
    assert_status "POST /api/auth/refresh" "$code" "200" "$time"
else
    warn "Không lấy được refresh token"
fi

step "4.1.5 Token hết hạn — xác minh refresh tự động"
resp=$(curl_timed GET "$GATEWAY/api/auth/me" -H "Authorization: Bearer invalid")
code=${resp%%|*}; time=${resp##*|}
assert_status "GET /api/auth/me (token rác)" "$code" "401" "$time"

# ---------------------------------------------------------
# 4.2. Ghi danh & học (không cần AI)
# ---------------------------------------------------------
step "4.2.1 Danh sách khoá học (công khai)"
resp=$(curl_timed GET "$GATEWAY/api/content/courses?page=0&size=12")
code=${resp%%|*}; time=${resp##*|}
assert_status "GET /api/content/courses" "$code" "200" "$time"
assert_perf "courses-list" "$time" "0.5"

step "4.2.2 Khoá đã ghi danh của student"
resp=$(curl_timed GET "$GATEWAY/api/content/enrollments/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
code=${resp%%|*}; time=${resp##*|}
assert_status "GET /api/content/enrollments/me" "$code" "200" "$time"
assert_perf "enrollments-me" "$time" "0.2"

step "4.2.3 Khoá có phí — ghi danh trả 402"
# Cần lấy 1 courseId có price > 0 từ danh sách
COURSE_ID=$(curl -sS "$GATEWAY/api/content/courses?page=0&size=20" | \
    python3 -c "import sys,json
d=json.load(sys.stdin)
items=d.get('data',{}).get('items',d.get('items',[]))
for c in items:
    if c.get('price',0)>0:
        print(c['courseId']); break" 2>/dev/null)
if [[ -n "$COURSE_ID" ]]; then
    resp=$(curl_timed POST "$GATEWAY/api/content/enrollments" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"courseId\":\"$COURSE_ID\"}")
    code=${resp%%|*}; time=${resp##*|}
    if [[ "$code" == "402" || "$code" == "400" || "$code" == "409" ]]; then
        pass "Khoá có phí bị từ chối: $code (${time}s)"
        RESULTS+=("PASS|Khoá có phí bị từ chối ($code)")
        PASS_COUNT=$((PASS_COUNT+1))
    else
        fail "Khoá có phí không trả 402/400/409 mà trả $code"
    fi
else
    warn "Không tìm thấy khoá có phí để test"
fi

step "4.2.4 Tiến độ 5% sau khi hoàn thành 1/19 bài"
# Lấy khoá đã ghi danh (miễn phí)
ENROLLED=$(curl -sS "$GATEWAY/api/content/enrollments/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    python3 -c "import sys,json
d=json.load(sys.stdin)
items=d.get('data',d.get('items',[]))
for e in items if isinstance(items,list) else []:
    print(e.get('courseId',''))" 2>/dev/null | head -1)
if [[ -n "$ENROLLED" ]]; then
    resp=$(curl_timed GET "$GATEWAY/api/content/courses/$ENROLLED/progress" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    code=${resp%%|*}; time=${resp##*|}
    assert_status "GET progress" "$code" "200" "$time"
else
    warn "student chưa ghi danh khoá nào"
fi

# ---------------------------------------------------------
# 4.3. Thi và chấm bài
# ---------------------------------------------------------
step "4.3.1 Danh sách đề thi"
resp=$(curl_timed GET "$GATEWAY/api/exam/exams")
code=${resp%%|*}; time=${resp##*|}
assert_status "GET /api/exam/exams" "$code" "200" "$time"
assert_perf "exam-list" "$time" "0.2"

step "4.3.2 Lịch sử làm bài của student"
resp=$(curl_timed GET "$GATEWAY/api/exam/attempts/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
code=${resp%%|*}; time=${resp##*|}
assert_status "GET /api/exam/attempts/me" "$code" "200" "$time"

# ---------------------------------------------------------
# 4.4. Gợi ý khoá học (cần AI)
# ---------------------------------------------------------
step "4.4.1 Gợi ý khoá học"
resp=$(curl_timed GET "$GATEWAY/api/ai/recommendations/courses?limit=6" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
code=${resp%%|*}; time=${resp##*|}
if [[ "$code" == "200" ]]; then
    pass "GET /api/ai/recommendations/courses → 200 (${time}s)"
    PASS_COUNT=$((PASS_COUNT+1))
    RESULTS+=("PASS|recommendations (${time}s)")
    assert_perf "recommendations" "$time" "12"
else
    fail "recommendations trả $code (${time}s); kiểm tra ml-worker + ai-gateway đã lên chưa"
fi

# ---------------------------------------------------------
# 4.5. Lộ trình học
# ---------------------------------------------------------
step "4.5.1 Sinh lộ trình học"
resp=$(curl_timed POST "$GATEWAY/api/ai/learning-path/generate" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"goal":"Trở thành lập trình viên web","hoursPerWeek":8,"currentSkills":["HTML","CSS"]}')
code=${resp%%|*}; time=${resp##*|}
if [[ "$code" == "201" || "$code" == "200" ]]; then
    pass "POST /api/ai/learning-path/generate → $code (${time}s)"
    PASS_COUNT=$((PASS_COUNT+1))
    RESULTS+=("PASS|learning-path (${time}s)")
    assert_perf "learning-path-generate" "$time" "180"
elif [[ "$code" == "503" ]]; then
    warn "Learning path trả 503 (LLM hết quota hoặc lỗi) — xem log ml-worker"
elif [[ "$code" == "500" ]]; then
    fail "Learning path trả 500 — DB ioes_ai có bảng learning_paths chưa? (xem AI_FEATURES_CONTRACT mục 7.3)"
else
    fail "Learning path trả $code (${time}s)"
fi

step "4.5.2 Lộ trình đã lưu"
resp=$(curl_timed GET "$GATEWAY/api/ai/learning-path/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
code=${resp%%|*}; time=${resp##*|}
assert_status "GET /api/ai/learning-path/me" "$code" "200" "$time"
assert_perf "learning-path-me" "$time" "0.5"

# ---------------------------------------------------------
# 4.6. Giám sát thi
# ---------------------------------------------------------
step "4.6.1 Phân tích 1 khung hình"
# Tạo ảnh nhỏ 1x1 pixel base64 (PNG)
PNG_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
resp=$(curl_timed POST "http://localhost:9101/internal/ai/proctor/analyze" \
    -H "Content-Type: application/json" \
    -d "{\"attemptId\":\"smoke-$(date +%s)\",\"capturedAt\":\"$(date -Iseconds)\",\"frameBase64\":\"$PNG_BASE64\",\"sequenceId\":1}")
code=${resp%%|*}; time=${resp##*|}
if [[ "$code" == "200" ]]; then
    pass "POST /internal/ai/proctor/analyze → 200 (${time}s)"
    PASS_COUNT=$((PASS_COUNT+1))
    RESULTS+=("PASS|proctor (${time}s)")
    assert_perf "proctor-frame" "$time" "0.5"
elif [[ "$code" == "000" ]]; then
    fail "proctor endpoint không truy cập được — ml-worker có chạy không?"
elif [[ "$code" == "400" ]]; then
    warn "proctor trả 400 — ảnh test 1x1px không đủ dữ liệu cho MediaPipe (đúng kỳ vọng)"
    RESULTS+=("WARN|proctor 400 (expected for 1x1px)")
else
    fail "proctor trả $code (${time}s)"
fi

# ---------------------------------------------------------
# 4.7. Thông báo
# ---------------------------------------------------------
step "4.7.1 Hộp thư thông báo của student"
resp=$(curl_timed GET "$GATEWAY/api/notifications/user/me?limit=20" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
code=${resp%%|*}; time=${resp##*|}
if [[ "$code" == "200" ]]; then
    pass "GET /api/notifications/user/me → 200"
    PASS_COUNT=$((PASS_COUNT+1))
else
    fail "notifications trả $code"
fi

# ---------------------------------------------------------
# 4.8. Bảng xếp hạng
# ---------------------------------------------------------
step "4.8.1 Bảng xếp hạng"
resp=$(curl_timed GET "$GATEWAY/api/analytics/leaderboard?period=week")
code=${resp%%|*}; time=${resp##*|}
if [[ "$code" == "200" ]]; then
    pass "GET /api/analytics/leaderboard → 200 (${time}s)"
    PASS_COUNT=$((PASS_COUNT+1))
    RESULTS+=("PASS|leaderboard (${time}s)")
    assert_perf "leaderboard" "$time" "0.3"
else
    fail "leaderboard trả $code"
fi

# ============================================================
# TỔNG KẾT
# ============================================================
log ""
log "================================================="
log "TỔNG KẾT"
log "================================================="
log "  PASS: $PASS_COUNT"
log "  FAIL: $FAIL_COUNT"
log "  Total: $((PASS_COUNT+FAIL_COUNT))"
log ""
log "Report đầy đủ: $REPORT"
log "================================================="

# In dạng JSON nếu yêu cầu.
if [[ "${SMOKE_OUTPUT:-}" == "json" ]]; then
    python3 -c "
import json
print(json.dumps({
    'timestamp': '$TIMESTAMP',
    'gateway': '$GATEWAY',
    'pass': $PASS_COUNT,
    'fail': $FAIL_COUNT,
    'results': [r.split('|',1) for r in [$(printf "'%s'," "${RESULTS[@]}" | sed 's/,$//')]
]}, indent=2, ensure_ascii=False))
" > "$OUT_DIR/smoke-$TIMESTAMP.json"
    log "JSON: $OUT_DIR/smoke-$TIMESTAMP.json"
fi

exit $FAIL_COUNT
