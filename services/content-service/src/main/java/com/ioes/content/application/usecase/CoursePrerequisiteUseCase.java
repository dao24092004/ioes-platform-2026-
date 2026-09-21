package com.ioes.content.application.usecase;

import com.ioes.content.application.port.CoursePrerequisiteRepository;
import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.EnrollmentRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.model.CoursePrerequisite;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Quản lý khoá tiên quyết cho khoá học.
 *
 * <p>Khoá tiên quyết được kiểm tra khi ghi danh trong
 * {@link EnrollmentUseCase#enroll}: user phải hoàn thành mọi khoá tiên quyết
 * mới được ghi danh khoá hiện tại.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoursePrerequisiteUseCase {

    private static final String COURSE = "Course";

    private final CoursePrerequisiteRepository prerequisiteRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    /**
     * Lấy danh sách khoá tiên quyết của một khoá.
     */
    @Transactional(readOnly = true)
    public List<UUID> list(UUID courseId) {
        requireCourseExists(courseId);
        return prerequisiteRepository.findPrerequisiteIds(courseId);
    }

    /**
     * Thêm một khoá tiên quyết.
     *
     * @throws ContentNotFoundException khoá tiên quyết không tồn tại
     * @throws IllegalArgumentException thêm chính nó làm tiên quyết
     */
    @Transactional
    public void add(UUID courseId, UUID prerequisiteCourseId, UUID actorId, String role) {
        requireOwnership(courseId, actorId, role);
        requireCourseExists(prerequisiteCourseId);

        if (courseId.equals(prerequisiteCourseId)) {
            throw new IllegalArgumentException("Khoá học không thể là tiên quyết của chính nó");
        }

        prerequisiteRepository.save(CoursePrerequisite.builder()
                .courseId(courseId)
                .prerequisiteCourseId(prerequisiteCourseId)
                .build());
        log.info("Thêm khoá {} làm tiên quyết của khoá {}", prerequisiteCourseId, courseId);
    }

    /**
     * Gỡ một khoá tiên quyết.
     */
    @Transactional
    public void remove(UUID courseId, UUID prerequisiteCourseId, UUID actorId, String role) {
        requireOwnership(courseId, actorId, role);
        prerequisiteRepository.delete(CoursePrerequisite.builder()
                .courseId(courseId)
                .prerequisiteCourseId(prerequisiteCourseId)
                .build());
        log.info("Gỡ khoá {} khỏi tiên quyết của khoá {}", prerequisiteCourseId, courseId);
    }

    /**
     * Thay toàn bộ danh sách tiên quyết.
     *
     * @param prerequisiteIds danh sách khoá tiên quyết mới
     */
    @Transactional
    public void setPrerequisites(UUID courseId, List<UUID> prerequisiteIds, UUID actorId, String role) {
        requireOwnership(courseId, actorId, role);

        // Validate all prerequisite courses exist
        for (UUID prereqId : prerequisiteIds) {
            if (prereqId.equals(courseId)) {
                throw new IllegalArgumentException("Khoá học không thể là tiên quyết của chính nó");
            }
            requireCourseExists(prereqId);
        }

        // Remove all old
        prerequisiteRepository.deleteByCourseId(courseId);

        // Add new ones
        for (UUID prereqId : prerequisiteIds) {
            prerequisiteRepository.save(CoursePrerequisite.builder()
                    .courseId(courseId)
                    .prerequisiteCourseId(prereqId)
                    .build());
        }

        log.info("Cập nhật {} tiên quyết cho khoá {}", prerequisiteIds.size(), courseId);
    }

    /**
     * Kiểm tra user có hoàn thành đủ khoá tiên quyết không.
     * Dùng trong {@link EnrollmentUseCase}.
     *
     * @return danh sách khoá tiên quyết CHƯA hoàn thành (rỗng = đủ điều kiện)
     */
    @Transactional(readOnly = true)
    public List<UUID> findMissingPrerequisites(UUID courseId, UUID userId) {
        List<UUID> prereqIds = prerequisiteRepository.findPrerequisiteIds(courseId);
        if (prereqIds.isEmpty()) {
            return List.of();
        }

        Set<UUID> completed = Set.copyOf(
                prerequisiteRepository.findCompletedByUserIdAndCourseIds(userId, prereqIds));

        return prereqIds.stream()
                .filter(id -> !completed.contains(id))
                .toList();
    }

    private void requireOwnership(UUID courseId, UUID actorId, String role) {
        if ("admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role)) {
            return;
        }
        var course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, courseId));
        if (!course.getInstructorId().equals(actorId)) {
            throw new ContentAccessDeniedException("Không thể sửa tiên quyết của khoá học người khác");
        }
    }

    private void requireCourseExists(UUID courseId) {
        courseRepository.findById(courseId)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, courseId));
    }
}
