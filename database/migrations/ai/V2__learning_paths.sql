-- ============================================
-- IOES - AI Suite Database Schema
-- Version: 2.0.0
-- Database: ioes_ai
-- Epic 5 - FR-AI-005 Lộ trình học cá nhân hoá (Agentic RAG)
-- ============================================
--
-- V1 chỉ dựng hai bảng hội thoại và ghi rõ rằng LearningPath sẽ thêm ở
-- migration sau. Đây là migration đó.
--
-- Hợp đồng cột chốt trong docs/02-architecture/AI_FEATURES_CONTRACT.md §2.
-- Migration chạy một chiều. Không sửa file này sau khi đã chạy.

-- Một lộ trình học đã sinh cho một người dùng.
--
-- payload giữ nguyên văn phản hồi của ml-worker:
--   {"goal": "...", "summary": "...", "totalEstimatedHours": 96, "weeks": 12,
--    "steps": [{"order": 1, "title": "...", "courseId": "...", ...}],
--    "agentTrace": [{"agent": "profiler", "summary": "...", "elapsedMs": 820}],
--    "model": "gemini-...", "generatedAt": "..."}
--
-- Không tách steps ra bảng con: lộ trình là ảnh chụp tại một thời điểm, chỉ
-- đọc lại chứ không sửa từng bước, và hình dạng bên trong còn đổi theo các
-- agent. Tách bảng lúc này chỉ đổi lấy một lược đồ phải migrate theo mỗi lần
-- đổi prompt.
--
-- user_id trỏ tới users.id của auth-service nhưng KHÔNG có khoá ngoại —
-- PROJECT_RULES §4.3 cấm khoá ngoại xuyên database.
CREATE TABLE learning_paths (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id     UUID NOT NULL,
    goal        TEXT NOT NULL,
    payload     JSONB NOT NULL,
    model       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE learning_paths IS
    'Lộ trình học cá nhân hoá do 5 agent sinh ra (FR-AI-005).';
COMMENT ON COLUMN learning_paths.user_id IS
    'users.id bên auth-service. Không đặt khoá ngoại xuyên database.';
COMMENT ON COLUMN learning_paths.payload IS
    'Nguyên văn phản hồi ml-worker: summary, weeks, steps, agentTrace.';
COMMENT ON COLUMN learning_paths.model IS
    'Tên mô hình đã sinh, để truy vết khi kết quả khác nhau giữa các bản.';

-- Hai truy vấn duy nhất là "lộ trình mới nhất của tôi" và "lịch sử của tôi",
-- cả hai đều lọc user_id rồi sắp giảm dần theo created_at. Một chỉ mục ghép
-- đúng thứ tự đó phục vụ được cả hai mà không cần bước sort.
CREATE INDEX idx_learning_paths_user_created
    ON learning_paths (user_id, created_at DESC);
