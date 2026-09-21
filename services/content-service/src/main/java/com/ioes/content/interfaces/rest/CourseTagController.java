package com.ioes.content.interfaces.rest;

import com.ioes.content.application.usecase.CourseTagUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Tag của khoá học, ở {@code /api/v1/courses/{courseId}/tags}.
 *
 * <p>Đọc tag công khai; ghi/chỉnh sửa tag phải là chủ khoá hoặc quản trị.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/courses/{courseId}/tags")
@RequiredArgsConstructor
public class CourseTagController {

    private final CourseTagUseCase tagUseCase;

    @GetMapping
    public List<String> list(@PathVariable UUID courseId) {
        return tagUseCase.listByCourse(courseId);
    }

    /** Thêm một tag. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TagResult addTag(
            @PathVariable UUID courseId,
            @Valid @RequestBody TagPayload payload) {
        tagUseCase.addTag(courseId, payload.tag(), Caller.id(), Caller.role());
        return new TagResult("added", payload.tag());
    }

    /** Gỡ một tag. */
    @DeleteMapping("/{tag}")
    public TagResult removeTag(@PathVariable UUID courseId, @PathVariable String tag) {
        tagUseCase.removeTag(courseId, tag, Caller.id(), Caller.role());
        return new TagResult("removed", tag);
    }

    /**
     * Thay toàn bộ tag của khoá.
     * Gửi danh sách tag mới; tag trùng với hiện có được giữ nguyên.
     */
    @PutMapping
    public TagsResult setTags(
            @PathVariable UUID courseId,
            @Valid @RequestBody TagsPayload payload) {
        tagUseCase.setTags(courseId, payload.tags(), Caller.id(), Caller.role());
        return new TagsResult("updated", tagUseCase.listByCourse(courseId));
    }

    public record TagPayload(@NotBlank @Size(max = 50) String tag) {}

    public record TagResult(String action, String tag) {}

    public record TagsPayload(@Size(max = 20) List<@NotBlank @Size(max = 50) String> tags) {}

    public record TagsResult(String action, List<String> tags) {}
}
