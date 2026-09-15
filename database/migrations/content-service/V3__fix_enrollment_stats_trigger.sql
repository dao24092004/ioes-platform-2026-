-- V1 gọi jsonb_set(stats, '{enrollments}', <integer>) nhưng tham số thứ ba phải là jsonb,
-- nên mọi INSERT/DELETE vào enrollments đều lỗi
-- "function jsonb_set(jsonb, unknown, integer) does not exist". Chưa ai ghi danh nên lỗi
-- không lộ ra cho tới khi có API ghi danh.
--
-- Sửa thêm hai chỗ: stats NULL hoặc thiếu khoá enrollments thì coi là 0, và khi xoá không
-- để số đếm xuống âm.
CREATE OR REPLACE FUNCTION update_course_enrollment_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE courses
        SET stats = jsonb_set(
                COALESCE(stats, '{}'::jsonb),
                '{enrollments}',
                to_jsonb(COALESCE((stats ->> 'enrollments')::int, 0) + 1))
        WHERE id = NEW.course_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE courses
        SET stats = jsonb_set(
                COALESCE(stats, '{}'::jsonb),
                '{enrollments}',
                to_jsonb(GREATEST(COALESCE((stats ->> 'enrollments')::int, 0) - 1, 0)))
        WHERE id = OLD.course_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
