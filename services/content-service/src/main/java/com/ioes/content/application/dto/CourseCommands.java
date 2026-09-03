package com.ioes.content.application.dto;

import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.LessonType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Lệnh ghi cho khoá học, chương và bài học.
 *
 * <p>Gom vào một file vì đều là record ngắn thuộc cùng một luồng nghiệp vụ;
 * tách mỗi record một file chỉ làm loãng chứ không rõ thêm.
 */
public final class CourseCommands {

    private CourseCommands() {
    }

    /**
     * Tạo khoá học. {@code instructorId} không nằm ở đây: nó lấy từ người dùng
     * đã xác thực, để một giảng viên không thể tạo khoá đứng tên người khác.
     */
    public record CreateCourse(
            @NotBlank @Size(max = 255) String title,
            @NotBlank @Size(max = 255) String slug,
            UUID categoryId,
            @Size(max = 5000) String shortDescription,
            String description,
            @Size(max = 500) String thumbnailUrl,
            @Size(max = 500) String previewVideoUrl,
            BigDecimal price,
            @Size(max = 3) String currency,
            Integer durationHours,
            @Min(1) @Max(5) Integer difficultyLevel,
            @Size(max = 10) String language
    ) {}

    /** Cập nhật khoá học. Trường null nghĩa là giữ nguyên, không phải xoá. */
    public record UpdateCourse(
            @Size(max = 255) String title,
            UUID categoryId,
            @Size(max = 5000) String shortDescription,
            String description,
            @Size(max = 500) String thumbnailUrl,
            @Size(max = 500) String previewVideoUrl,
            BigDecimal price,
            @Size(max = 3) String currency,
            Integer durationHours,
            @Min(1) @Max(5) Integer difficultyLevel,
            @Size(max = 10) String language,
            CourseStatus status
    ) {}

    /** Từ chối duyệt. Lý do là bắt buộc — giảng viên cần biết phải sửa gì. */
    public record RejectCourse(@NotBlank @Size(max = 1000) String reason) {}

    public record CreateCategory(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 100) String slug,
            String description,
            UUID parentId,
            @Size(max = 50) String icon,
            Integer sortOrder
    ) {}

    public record CreateChapter(
            @NotBlank @Size(max = 255) String title,
            String description,
            Integer sortOrder,
            Boolean isFree
    ) {}

    public record CreateLesson(
            @NotBlank @Size(max = 255) String title,
            String description,
            @NotNull LessonType lessonType,
            @Size(max = 500) String contentUrl,
            Integer durationMinutes,
            Integer sortOrder,
            Boolean isFree,
            Boolean isPreview
    ) {}
}
