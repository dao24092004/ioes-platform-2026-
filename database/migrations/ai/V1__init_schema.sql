-- ============================================
-- IOES - AI Suite Database Schema
-- Version: 1.0.0
-- Database: ioes_ai
-- Epic 5 - AI-Powered Learning / US-017 Chatbot v1 (RAG)
-- ============================================
--
-- Phạm vi V1 chỉ gồm hai bảng phục vụ US-017. Ba aggregate còn lại mà
-- ai-suite sở hữu theo service-boundaries.md (LearningPath, Recommendation,
-- ModelRegistry) sẽ thêm ở migration sau, khi US-016 và US-018 tới lượt.
--
-- Migration chạy một chiều. Không sửa file này sau khi đã chạy.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_bytes

-- ============================================
-- UUID v7
-- ============================================
-- PROJECT_RULES §4.3 yêu cầu khoá chính dùng UUID v7. PostgreSQL 15 chưa có
-- hàm dựng sẵn và ảnh này không cài pg_uuidv7, nên tự dựng.
--
-- UUID v7 nhúng timestamp Unix mili giây vào 48 bit đầu, nên khoá tăng dần
-- theo thời gian. Chèn vào B-tree không làm phân mảnh chỉ mục như v4, và có
-- thể sắp theo thời gian tạo mà không cần đọc cột created_at.
--
-- Bố cục theo RFC 9562:
--   bit   0-47   unix_ts_ms
--   bit  48-51   version = 7
--   bit  52-63   rand_a
--   bit  64-65   variant = 0b10
--   bit  66-127  rand_b

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    unix_ts_ms BYTEA;
    uuid_bytes BYTEA;
BEGIN
    unix_ts_ms := substring(
        int8send((extract(epoch FROM clock_timestamp()) * 1000)::BIGINT)
        FROM 3
    );

    -- 10 byte ngẫu nhiên cho phần còn lại
    uuid_bytes := unix_ts_ms || gen_random_bytes(10);

    -- Byte 6: giữ 4 bit thấp, đặt nibble cao thành 0x7 (version 7)
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);

    -- Byte 8: giữ 6 bit thấp, đặt hai bit cao thành 0b10 (variant RFC 4122)
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

    RETURN encode(uuid_bytes, 'hex')::UUID;
END
$$;

COMMENT ON FUNCTION uuid_generate_v7() IS
    'Sinh UUID v7 theo RFC 9562. Thay cho pg_uuidv7 vì PostgreSQL 15 chưa hỗ trợ.';

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE chat_session_status AS ENUM ('active', 'archived');
CREATE TYPE chat_message_role  AS ENUM ('user', 'assistant', 'system');

-- ============================================
-- TABLES
-- ============================================

-- Phiên hội thoại giữa học viên và trợ lý AI.
--
-- user_id trỏ tới users.id của auth-service nhưng KHÔNG có khoá ngoại —
-- PROJECT_RULES §4.3 cấm khoá ngoại xuyên database. Tính đúng đắn được
-- bảo đảm qua sự kiện auth.user.registered.
CREATE TABLE chat_sessions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id          UUID NOT NULL,
    title            VARCHAR(255),
    status           chat_session_status NOT NULL DEFAULT 'active',
    message_count    INTEGER NOT NULL DEFAULT 0,
    last_message_at  TIMESTAMP WITH TIME ZONE,
    metadata         JSONB NOT NULL DEFAULT '{}',

    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by       UUID,
    updated_by       UUID,
    deleted_at       TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE chat_sessions IS 'Phiên hội thoại của học viên với trợ lý AI (US-017).';
COMMENT ON COLUMN chat_sessions.user_id IS 'users.id bên auth-service. Không đặt khoá ngoại xuyên database.';

-- Chỉ lấy bản ghi chưa xoá mềm, nên chỉ mục cũng lọc theo deleted_at.
CREATE INDEX idx_chat_sessions_user
    ON chat_sessions (user_id, last_message_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_chat_sessions_status
    ON chat_sessions (status)
    WHERE deleted_at IS NULL;

-- Từng lượt trong hội thoại.
--
-- sources giữ danh sách đoạn văn mà tầng RAG truy xuất được, dạng
--   [{"doc_id": "...", "chunk_id": "...", "score": 0.83, "title": "..."}]
-- Đây là nền cho nút "Vì sao lộ trình này?" ở US-016 (BA_DOCUMENT §11.4).
CREATE TABLE chat_messages (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    session_id         UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
    role               chat_message_role NOT NULL,
    content            TEXT NOT NULL,
    sources            JSONB NOT NULL DEFAULT '[]',

    -- Truy vết lần gọi mô hình. total_tokens KHÔNG bằng prompt + completion:
    -- Gemini tính cả token suy luận ẩn vào tổng, nên hạn mức phải đếm theo
    -- total_tokens, nếu không sẽ tính thiếu vài lần.
    model              VARCHAR(100),
    prompt_tokens      INTEGER,
    completion_tokens  INTEGER,
    total_tokens       INTEGER,
    latency_ms         INTEGER,

    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by         UUID,
    updated_by         UUID,
    deleted_at         TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE chat_messages IS 'Từng lượt hỏi đáp trong một phiên (US-017).';
COMMENT ON COLUMN chat_messages.sources IS 'Đoạn văn RAG truy xuất được, kèm điểm tương đồng.';
COMMENT ON COLUMN chat_messages.total_tokens IS 'Gồm cả token suy luận ẩn. Dùng cột này để tính hạn mức.';

CREATE INDEX idx_chat_messages_session
    ON chat_messages (session_id, created_at)
    WHERE deleted_at IS NULL;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- clock_timestamp() chứ không phải NOW(): NOW() trả về thời điểm mở
    -- transaction, nên hai lần UPDATE trong cùng transaction sẽ có
    -- updated_at giống hệt nhau, và insert rồi update ngay cũng không thấy
    -- thay đổi. clock_timestamp() lấy giờ thật lúc câu lệnh chạy.
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END
$$;

CREATE TRIGGER trg_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
