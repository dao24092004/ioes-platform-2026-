package com.ioes.content.application.dto;

import com.ioes.content.application.dto.CourseResponses.CourseView;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.Enrollment;
import com.ioes.content.domain.model.EnrollmentStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Các bản ghi trả về cho client của luồng ghi danh. */
public final class EnrollmentResponses {

    private EnrollmentResponses() {
    }

    public record EnrollmentView(
            UUID id,
            UUID courseId,
            UUID userId,
            EnrollmentStatus status,
            Integer progressPercent,
            Instant enrolledAt,
            Instant completedAt,
            Instant lastAccessedAt
    ) {
        public static EnrollmentView from(Enrollment e) {
            return new EnrollmentView(
                    e.getId(),
                    e.getCourseId(),
                    e.getUserId(),
                    e.getStatus(),
                    e.getProgressPercent(),
                    e.getEnrolledAt(),
                    e.getCompletedAt(),
                    e.getLastAccessedAt());
        }
    }

    /**
     * Trạng thái ghi danh của người gọi với một khoá. Chưa ghi danh vẫn là 200
     * với {@code enrolled=false}, để trang khoá học không phải coi 404 là bình thường.
     */
    public record EnrollmentStateView(
            boolean enrolled,
            EnrollmentView enrollment,
            List<UUID> completedLessonIds
    ) {
        public static EnrollmentStateView notEnrolled() {
            return new EnrollmentStateView(false, null, List.of());
        }
    }

    /** Một khoá trong danh sách "khoá học của tôi". */
    public record MyEnrollmentView(EnrollmentView enrollment, CourseView course) {}

    /** Một học viên trong danh sách của giảng viên. */
    public record StudentEnrollmentView(
            EnrollmentView enrollment,
            String studentName,
            String studentEmail,
            String courseTitle
    ) {
        public static StudentEnrollmentView from(Enrollment e, Course course) {
            return new StudentEnrollmentView(
                    EnrollmentView.from(e),
                    e.getStudentName(),
                    e.getStudentEmail(),
                    course.getTitle());
        }
    }
}
