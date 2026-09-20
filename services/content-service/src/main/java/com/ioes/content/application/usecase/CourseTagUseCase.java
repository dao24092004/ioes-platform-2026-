package com.ioes.content.application.usecase;

import com.ioes.content.application.port.CourseRepository;
import com.ioes.content.application.port.CourseTagRepository;
import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.model.Course;
import com.ioes.content.domain.model.CourseTag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * CRUD tag cho khoá học.
 *
 * <p>Tag là chuỗi ký tự ASCII thường, dấu gạch ngang và số, tối đa 50 ký tự.
 * Client gửi danh sách tag mới — use case so sánh với hiện có rồi thêm bớt.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CourseTagUseCase {

    private static final String COURSE = "Course";
    private static final int MAX_TAG_LENGTH = 50;

    private final CourseTagRepository tagRepository;
    private final CourseRepository courseRepository;

    @Transactional(readOnly = true)
    public List<String> listByCourse(UUID courseId) {
        requireCourseExists(courseId);
        return tagRepository.findByCourseId(courseId);
    }

    /**
     * Gắn tag mới. Tag trùng lặp bị bỏ qua (unique constraint ở DB đảm bảo
     * không lưu trùng).
     *
     * @param tag phải khớp pattern {@code ^[a-z0-9][a-z0-9-]{0,49}$}
     */
    @Transactional
    public void addTag(UUID courseId, String tag, UUID actorId, String role) {
        CourseTag entity = requireOwnership(courseId, actorId, role);
        validateTag(tag);
        tagRepository.save(new CourseTag(entity.getCourseId(), tag.toLowerCase()));
        log.info("Thêm tag '{}' vào khoá {}", tag, courseId);
    }

    /**
     * Gỡ tag. Không tồn tại thì thành công (idempotent).
     */
    @Transactional
    public void removeTag(UUID courseId, String tag, UUID actorId, String role) {
        requireOwnership(courseId, actorId, role);
        tagRepository.deleteByCourseIdAndTag(courseId, tag.toLowerCase());
        log.info("Gỡ tag '{}' khỏi khoá {}", tag, courseId);
    }

    /**
     * Thay toàn bộ tag của khoá. So sánh set cũ → mới để biết thêm/bớt.
     *
     * @param newTags danh sách tag mới, mỗi tag đã validated
     */
    @Transactional
    public void setTags(UUID courseId, List<String> newTags, UUID actorId, String role) {
        requireOwnership(courseId, actorId, role);

        List<String> current = tagRepository.findByCourseId(courseId);
        List<String> normalized = newTags.stream()
                .map(String::trim)
                .filter(t -> !t.isBlank())
                .map(t -> validateTag(t).toLowerCase())
                .distinct()
                .toList();

        List<String> toAdd = normalized.stream()
                .filter(t -> !current.contains(t))
                .toList();
        List<String> toRemove = current.stream()
                .filter(t -> !normalized.contains(t))
                .toList();

        toAdd.forEach(t -> tagRepository.save(new CourseTag(courseId, t)));
        toRemove.forEach(t -> tagRepository.deleteByCourseIdAndTag(courseId, t));

        if (!toAdd.isEmpty() || !toRemove.isEmpty()) {
            log.info("Cập nhật tags khoá {}: +{} -{}", courseId, toAdd, toRemove);
        }
    }

    private CourseTag requireOwnership(UUID courseId, UUID actorId, String role) {
        if ("admin".equalsIgnoreCase(role) || "super_admin".equalsIgnoreCase(role)) {
            return CourseTag.builder().courseId(courseId).build();
        }
        var course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, courseId));
        if (!course.getInstructorId().equals(actorId)) {
            throw new ContentAccessDeniedException("Không thể sửa tags của khoá học người khác");
        }
        return CourseTag.builder().courseId(courseId).build();
    }

    private Course requireCourseExists(UUID courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ContentNotFoundException(COURSE, courseId));
    }

    /**
     * Validate tag: ký tự ASCII thường, gạch ngang, số; bắt đầu bằng chữ/số;
     * tối đa 50 ký tự.
     *
     * @throws IllegalArgumentException nếu không hợp lệ
     */
    private String validateTag(String tag) {
        if (tag == null || tag.isBlank()) {
            throw new IllegalArgumentException("Tag không được rỗng");
        }
        tag = tag.trim().toLowerCase();
        if (tag.length() > MAX_TAG_LENGTH) {
            throw new IllegalArgumentException("Tag tối đa " + MAX_TAG_LENGTH + " ký tự");
        }
        if (!tag.matches("^[a-z0-9][a-z0-9-]{0,49}$")) {
            throw new IllegalArgumentException(
                    "Tag chỉ gồm chữ thường (a-z), số và gạch ngang, bắt đầu bằng chữ hoặc số");
        }
        return tag;
    }
}
