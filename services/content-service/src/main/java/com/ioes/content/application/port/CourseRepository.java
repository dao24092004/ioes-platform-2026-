package com.ioes.content.application.port;

import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.ReviewStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Cổng đọc/ghi khoá học. */
public interface CourseRepository {

    Course save(Course course);

    Optional<Course> findById(UUID id);

    boolean existsBySlug(String slug);

    /**
     * Một trang khoá học chưa xoá mềm, đã lọc và sắp xếp.
     *
     * @param reviewStatus lọc theo trạng thái duyệt trong metadata; null là bỏ qua
     */
    CoursePage search(
            String search,
            UUID categoryId,
            UUID instructorId,
            CourseStatus status,
            ReviewStatus reviewStatus,
            int page,
            int perPage);

    /** Đếm khoá học theo từng trạng thái xuất bản, bỏ qua bản đã xoá mềm. */
    Map<CourseStatus, Long> tallyByStatus();

    /** Đếm khoá học theo từng trạng thái duyệt. Khoá chưa gửi duyệt không tính. */
    Map<ReviewStatus, Long> tallyByReviewStatus();

    /** Một trang kết quả kèm tổng số bản ghi khớp bộ lọc. */
    record CoursePage(List<Course> items, long total, int page, int perPage, int totalPages) {

        public static CoursePage of(List<Course> items, long total, int page, int perPage) {
            int totalPages = perPage > 0 ? Math.max(1, (int) Math.ceil((double) total / perPage)) : 1;
            return new CoursePage(items, total, page, perPage, totalPages);
        }
    }
}
