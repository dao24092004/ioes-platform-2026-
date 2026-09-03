package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CourseCommands;
import com.ioes.content.application.dto.CourseResponses.CourseStatsView;
import com.ioes.content.application.dto.CourseResponses.CourseView;
import com.ioes.content.application.dto.CourseResponses.PageView;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.exception.DuplicateSlugException;
import com.ioes.content.domain.exception.InvalidCourseStateException;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.ReviewStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Vòng đời khoá học: tạo, sửa, xoá mềm, tìm kiếm, duyệt và xuất bản.
 *
 * <p>Quy tắc quyền: giảng viên chỉ thao tác được trên khoá của chính mình; admin
 * thao tác được trên mọi khoá nhưng KHÔNG tự duyệt khoá do chính mình tạo — nếu
 * không thì bước duyệt chẳng còn là kiểm soát gì cả.
 *
 * <p>Duyệt và xuất bản là hai việc khác nhau: duyệt là quyết định của quản trị
 * ghi trong {@code metadata.review}, xuất bản là hành động của giảng viên đổi
 * cột {@code status}. Một khoá phải được duyệt trước khi xuất bản được.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CourseUseCase {

    /** Số bản ghi tối đa một trang, để một lần gọi không kéo cả bảng về. */
    public static final int MAX_PER_PAGE = 100;

    private static final String COURSE = "Course";

    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public PageView<CourseView> search(
            String search,
            UUID categoryId,
            UUID instructorId,
            CourseStatus status,
            ReviewStatus reviewStatus,
            int page,
            int perPage) {

        CourseRepository.CoursePage result = courseRepository.search(
                search,
                categoryId,
                instructorId,
                status,
                reviewStatus,
                Math.max(1, page),
                Math.min(MAX_PER_PAGE, Math.max(1, perPage)));

        List<CourseView> items = result.items().stream().map(CourseView::from).toList();
        return PageView.of(items, result.total(), result.page(), result.perPage(), result.totalPages());
    }

    @Transactional(readOnly = true)
    public CourseView getById(UUID id) {
        return CourseView.from(requireLiveCourse(id));
    }

    @Transactional(readOnly = true)
    public CourseStatsView stats() {
        return CourseStatsView.from(
                courseRepository.tallyByStatus(), courseRepository.tallyByReviewStatus());
    }

    @Transactional
    public CourseView create(CourseCommands.CreateCourse command, UUID instructorId) {
        if (courseRepository.existsBySlug(command.slug())) {
            throw new DuplicateSlugException(command.slug());
        }

        Course course = Course.builder()
                .instructorId(instructorId)
                .categoryId(command.categoryId())
                .title(command.title())
                .slug(command.slug())
                .shortDescription(command.shortDescription())
                .description(command.description())
                .thumbnailUrl(command.thumbnailUrl())
                .previewVideoUrl(command.previewVideoUrl())
                .difficultyLevel(command.difficultyLevel())
                .durationHours(command.durationHours())
                .status(CourseStatus.draft)
                .build();

        if (command.price() != null) {
            course.setPrice(command.price());
        }
        if (command.currency() != null) {
            course.setCurrency(command.currency());
        }
        if (command.language() != null) {
            course.setLanguage(command.language());
        }

        Course saved = courseRepository.save(course);
        log.info("Giảng viên {} tạo khoá học {}", instructorId, saved.getId());
        return CourseView.from(saved);
    }

    /**
     * Cập nhật khoá học. Trường null nghĩa là giữ nguyên: client gửi bản vá chứ
     * không gửi lại toàn bộ, nên null không được hiểu là xoá giá trị.
     */
    @Transactional
    public CourseView update(UUID id, CourseCommands.UpdateCourse command, UUID actorId, String role) {
        Course course = requireLiveCourse(id);
        requireOwnerOrAdmin(course, actorId, role);

        if (command.title() != null) {
            course.setTitle(command.title());
        }
        if (command.categoryId() != null) {
            course.setCategoryId(command.categoryId());
        }
        if (command.shortDescription() != null) {
            course.setShortDescription(command.shortDescription());
        }
        if (command.description() != null) {
            course.setDescription(command.description());
        }
        if (command.thumbnailUrl() != null) {
            course.setThumbnailUrl(command.thumbnailUrl());
        }
        if (command.previewVideoUrl() != null) {
            course.setPreviewVideoUrl(command.previewVideoUrl());
        }
        if (command.price() != null) {
            course.setPrice(command.price());
        }
        if (command.currency() != null) {
            course.setCurrency(command.currency());
        }
        if (command.durationHours() != null) {
            course.setDurationHours(command.durationHours());
        }
        if (command.difficultyLevel() != null) {
            course.setDifficultyLevel(command.difficultyLevel());
        }
        if (command.language() != null) {
            course.setLanguage(command.language());
        }
        if (command.status() != null) {
            applyStatus(course, command.status());
        }

        return CourseView.from(courseRepository.save(course));
    }

    @Transactional
    public void delete(UUID id, UUID actorId, String role) {
        Course course = requireLiveCourse(id);
        requireOwnerOrAdmin(course, actorId, role);

        course.softDelete();
        courseRepository.save(course);
        log.info("Khoá học {} bị xoá mềm bởi {}", id, actorId);
    }

    /** Giảng viên gửi khoá học đi chờ duyệt. */
    @Transactional
    public CourseView submitForReview(UUID id, UUID actorId, String role) {
        Course course = requireLiveCourse(id);
        requireOwnerOrAdmin(course, actorId, role);

        course.submitForReview();
        return CourseView.from(courseRepository.save(course));
    }

    /** Quản trị duyệt khoá học. */
    @Transactional
    public CourseView approve(UUID id, UUID reviewerId) {
        Course course = requireLiveCourse(id);
        requireDifferentPerson(course, reviewerId);

        course.recordReviewDecision(ReviewStatus.approved, reviewerId, null);
        log.info("Khoá học {} được {} duyệt", id, reviewerId);
        return CourseView.from(courseRepository.save(course));
    }

    /** Quản trị từ chối khoá học, kèm lý do để giảng viên biết phải sửa gì. */
    @Transactional
    public CourseView reject(UUID id, UUID reviewerId, String reason) {
        Course course = requireLiveCourse(id);
        requireDifferentPerson(course, reviewerId);

        course.recordReviewDecision(ReviewStatus.rejected, reviewerId, reason);
        log.info("Khoá học {} bị {} từ chối", id, reviewerId);
        return CourseView.from(courseRepository.save(course));
    }

    /**
     * Xuất bản khoá học. Chỉ khoá đã được duyệt mới xuất bản được — nếu không
     * thì bước duyệt có thể bị đi vòng bằng một lần gọi publish.
     */
    @Transactional
    public CourseView publish(UUID id, UUID actorId, String role) {
        Course course = requireLiveCourse(id);
        requireOwnerOrAdmin(course, actorId, role);

        if (course.getReviewStatus() != ReviewStatus.approved) {
            throw new InvalidCourseStateException(
                    "Khoá học phải được duyệt trước khi xuất bản");
        }

        applyStatus(course, CourseStatus.published);
        return CourseView.from(courseRepository.save(course));
    }

    private void applyStatus(Course course, CourseStatus next) {
        course.setStatus(next);
        if (next == CourseStatus.published && course.getPublishedAt() == null) {
            course.setPublishedAt(Instant.now());
        }
    }

    private Course requireLiveCourse(UUID id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, id));
        if (course.isDeleted()) {
            // Khoá đã xoá mềm coi như không tồn tại, để không ai thao tác tiếp
            // lên thứ mình đã xoá.
            throw new ContentNotFoundException(COURSE, id);
        }
        return course;
    }

    private void requireOwnerOrAdmin(Course course, UUID actorId, String role) {
        if (isAdmin(role)) {
            return;
        }
        if (!course.getInstructorId().equals(actorId)) {
            throw new ContentAccessDeniedException("Không thể thao tác trên khoá học của người khác");
        }
    }

    private void requireDifferentPerson(Course course, UUID reviewerId) {
        if (course.getInstructorId().equals(reviewerId)) {
            throw new ContentAccessDeniedException("Không thể tự duyệt khoá học của chính mình");
        }
    }

    private boolean isAdmin(String role) {
        return "admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role);
    }
}
