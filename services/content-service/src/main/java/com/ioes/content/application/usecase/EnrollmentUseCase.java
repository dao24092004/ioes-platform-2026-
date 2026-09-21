package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CourseResponses.CourseView;
import com.ioes.content.application.dto.EnrollmentResponses.EnrollmentStateView;
import com.ioes.content.application.dto.EnrollmentResponses.EnrollmentView;
import com.ioes.content.application.dto.EnrollmentResponses.MyEnrollmentView;
import com.ioes.content.application.dto.EnrollmentResponses.StudentEnrollmentView;
import com.ioes.content.application.port.ChapterRepository;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.EnrollmentRepository;
import com.ioes.content.application.port.LessonProgressRepository;
import com.ioes.content.application.port.LessonRepository;
import com.ioes.content.application.usecase.CoursePrerequisiteUseCase;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.exception.InvalidCourseStateException;
import com.ioes.content.domain.exception.PaymentRequiredException;
import com.ioes.content.domain.exception.PrerequisiteNotMetException;
import com.ioes.content.domain.model.Chapter;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.Enrollment;
import com.ioes.content.domain.model.Lesson;
import com.ioes.content.domain.model.LessonProgress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Ghi danh khoá học và tiến độ bài học.
 *
 * <p>Chỉ ghi danh được khoá đã xuất bản và miễn phí: hệ thống chưa có thanh
 * toán, nên khoá có giá bị từ chối (402) thay vì cho học mà không trả tiền.
 *
 * <p>Huỷ ghi danh xoá hẳn bản ghi (tiến độ bài học đi theo nhờ ON DELETE CASCADE)
 * chứ không đổi status sang {@code cancelled}: trigger
 * {@code enrollment_stats_trigger} chỉ đếm INSERT/DELETE, đổi status sẽ làm
 * {@code courses.stats.enrollments} lệch với thực tế.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnrollmentUseCase {

    private static final String COURSE = "Course";
    private static final String LESSON = "Lesson";
    private static final String ENROLLMENT = "Enrollment";

    private final CourseRepository courseRepository;
    private final ChapterRepository chapterRepository;
    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final CoursePrerequisiteUseCase prerequisiteUseCase;

    /** Người học lấy từ token. Tên và email có thể null nếu token không mang claim đó. */
    public record Learner(UUID id, String fullName, String email) {}

    @Transactional
    public EnrollmentView enroll(UUID courseId, Learner learner) {
        Course course = requireLiveCourse(courseId);

        Optional<Enrollment> existing = enrollmentRepository.findByUserIdAndCourseId(learner.id(), courseId);
        if (existing.isPresent()) {
            // Bấm ghi danh lần hai không phải lỗi: trả lại lượt ghi danh đang có.
            return EnrollmentView.from(existing.get());
        }
        if (course.getStatus() != CourseStatus.published) {
            throw new InvalidCourseStateException("Chỉ ghi danh được khoá học đã xuất bản");
        }

        // Kiểm tra khoá tiên quyết
        var missing = prerequisiteUseCase.findMissingPrerequisites(courseId, learner.id());
        if (!missing.isEmpty()) {
            throw new PrerequisiteNotMetException(
                    "Bạn chưa hoàn thành " + missing.size() + " khoá tiên quyết trước khi ghi danh");
        }

        if (course.getPrice() != null && course.getPrice().signum() > 0) {
            throw new PaymentRequiredException("Khoá học có phí, hệ thống chưa hỗ trợ thanh toán");
        }

        Map<String, Object> metadata = new HashMap<>();
        if (learner.fullName() != null) {
            metadata.put(Enrollment.STUDENT_NAME_KEY, learner.fullName());
        }
        if (learner.email() != null) {
            metadata.put(Enrollment.STUDENT_EMAIL_KEY, learner.email());
        }

        Enrollment saved = enrollmentRepository.save(Enrollment.builder()
                .userId(learner.id())
                .courseId(courseId)
                .enrolledAt(Instant.now())
                .metadata(metadata)
                .build());
        log.info("Học viên {} ghi danh khoá học {}", learner.id(), courseId);
        return EnrollmentView.from(saved);
    }

    @Transactional
    public void cancel(UUID courseId, UUID userId) {
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new ContentNotFoundException(ENROLLMENT, courseId));
        enrollmentRepository.delete(enrollment);
        log.info("Học viên {} huỷ ghi danh khoá học {}", userId, courseId);
    }

    @Transactional(readOnly = true)
    public EnrollmentStateView getState(UUID courseId, UUID userId) {
        requireLiveCourse(courseId);
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .map(enrollment -> stateOf(enrollment, completedLessonIds(enrollment, lessonIdsOf(courseId))))
                .orElseGet(EnrollmentStateView::notEnrolled);
    }

    @Transactional
    public EnrollmentStateView setLessonCompleted(UUID courseId, UUID lessonId, UUID userId, boolean completed) {
        requireLiveCourse(courseId);
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new ContentAccessDeniedException("Bạn chưa ghi danh khoá học này"));

        Set<UUID> lessonIds = lessonIdsOf(courseId);
        if (!lessonIds.contains(lessonId)) {
            throw new ContentNotFoundException(LESSON, lessonId);
        }

        Instant now = Instant.now();
        LessonProgress progress = lessonProgressRepository
                .findByEnrollmentIdAndLessonId(enrollment.getId(), lessonId)
                .orElseGet(() -> LessonProgress.builder()
                        .enrollmentId(enrollment.getId())
                        .lessonId(lessonId)
                        .build());
        progress.setIsCompleted(completed);
        progress.setCompletedAt(completed ? now : null);
        lessonProgressRepository.save(progress);

        // Đọc tiến độ đã lưu rồi áp thay đổi vừa ghi, để không phụ thuộc lúc Hibernate flush.
        Set<UUID> done = completedLessonIds(enrollment, lessonIds);
        if (completed) {
            done.add(lessonId);
        } else {
            done.remove(lessonId);
        }

        enrollment.applyProgress(done.size(), lessonIds.size(), now);
        return stateOf(enrollmentRepository.save(enrollment), done);
    }

    @Transactional(readOnly = true)
    public List<MyEnrollmentView> listMine(UUID userId) {
        List<Enrollment> enrollments = enrollmentRepository.findByUserId(userId);
        Map<UUID, Course> courses = liveCoursesById(enrollments.stream().map(Enrollment::getCourseId).toList());
        return enrollments.stream()
                .filter(e -> courses.containsKey(e.getCourseId()))
                .map(e -> new MyEnrollmentView(EnrollmentView.from(e), CourseView.from(courses.get(e.getCourseId()))))
                .toList();
    }

    /**
     * Học viên trong khoá học của giảng viên.
     *
     * @param courseId một khoá cụ thể (chủ khoá hoặc quản trị xem được), hoặc
     *                 {@code null} để lấy học viên của mọi khoá người gọi đứng tên
     */
    @Transactional(readOnly = true)
    public List<StudentEnrollmentView> listStudents(UUID courseId, UUID actorId, String role) {
        List<UUID> courseIds;
        if (courseId != null) {
            requireOwnerOrAdmin(requireLiveCourse(courseId), actorId, role);
            courseIds = List.of(courseId);
        } else {
            courseIds = courseRepository.findIdsByInstructorId(actorId);
        }
        if (courseIds.isEmpty()) {
            return List.of();
        }

        Map<UUID, Course> courses = liveCoursesById(courseIds);
        return enrollmentRepository.findByCourseIdIn(courseIds).stream()
                .filter(e -> courses.containsKey(e.getCourseId()))
                .map(e -> StudentEnrollmentView.from(e, courses.get(e.getCourseId())))
                .toList();
    }

    private Set<UUID> lessonIdsOf(UUID courseId) {
        List<UUID> chapterIds = chapterRepository.findByCourseId(courseId).stream()
                .map(Chapter::getId)
                .toList();
        if (chapterIds.isEmpty()) {
            return new HashSet<>();
        }
        return lessonRepository.findByChapterIdIn(chapterIds).stream()
                .map(Lesson::getId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    /** Bài đã hoàn thành, chỉ tính những bài còn nằm trong khoá. */
    private Set<UUID> completedLessonIds(Enrollment enrollment, Set<UUID> lessonIds) {
        return lessonProgressRepository.findByEnrollmentId(enrollment.getId()).stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
                .map(LessonProgress::getLessonId)
                .filter(lessonIds::contains)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private EnrollmentStateView stateOf(Enrollment enrollment, Set<UUID> completed) {
        return new EnrollmentStateView(true, EnrollmentView.from(enrollment), List.copyOf(completed));
    }

    private Map<UUID, Course> liveCoursesById(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return courseRepository.findAllByIds(ids).stream()
                .filter(c -> !c.isDeleted())
                .collect(Collectors.toMap(Course::getId, Function.identity(), (a, b) -> a));
    }

    private Course requireLiveCourse(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, courseId));
        if (course.isDeleted()) {
            throw new ContentNotFoundException(COURSE, courseId);
        }
        return course;
    }

    private void requireOwnerOrAdmin(Course course, UUID actorId, String role) {
        if ("admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role)) {
            return;
        }
        if (!course.getInstructorId().equals(actorId)) {
            throw new ContentAccessDeniedException("Không thể xem học viên của khoá học người khác");
        }
    }
}
