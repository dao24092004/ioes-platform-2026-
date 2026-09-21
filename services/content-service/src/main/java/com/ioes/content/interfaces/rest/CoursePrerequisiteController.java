package com.ioes.content.interfaces.rest;

import com.ioes.content.application.usecase.CoursePrerequisiteUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Khoá tiên quyết của khoá học, ở {@code /api/v1/courses/{courseId}/prerequisites}.
 *
 * <p>Đọc công khai; thêm/bớt chỉ chủ khoá hoặc quản trị.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/courses/{courseId}/prerequisites")
@RequiredArgsConstructor
public class CoursePrerequisiteController {

    private final CoursePrerequisiteUseCase prerequisiteUseCase;

    /** Danh sách khoá tiên quyết (IDs). */
    @GetMapping
    public List<UUID> list(@PathVariable UUID courseId) {
        return prerequisiteUseCase.list(courseId);
    }

    /** Thêm một khoá tiên quyết. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrereqResult add(
            @PathVariable UUID courseId,
            @Valid @RequestBody PrereqPayload payload) {
        prerequisiteUseCase.add(courseId, payload.prerequisiteCourseId(), Caller.id(), Caller.role());
        return new PrereqResult("added", payload.prerequisiteCourseId());
    }

    /** Gỡ một khoá tiên quyết. */
    @DeleteMapping("/{prerequisiteCourseId}")
    public PrereqResult remove(
            @PathVariable UUID courseId,
            @PathVariable UUID prerequisiteCourseId) {
        prerequisiteUseCase.remove(courseId, prerequisiteCourseId, Caller.id(), Caller.role());
        return new PrereqResult("removed", prerequisiteCourseId);
    }

    /** Thay toàn bộ danh sách tiên quyết. */
    @PutMapping
    public PrereqListResult setPrerequisites(
            @PathVariable UUID courseId,
            @Valid @RequestBody PrereqListPayload payload) {
        prerequisiteUseCase.setPrerequisites(courseId, payload.prerequisiteCourseIds(), Caller.id(), Caller.role());
        return new PrereqListResult("updated", prerequisiteUseCase.list(courseId));
    }

    public record PrereqPayload(@NotNull UUID prerequisiteCourseId) {}

    public record PrereqResult(String action, UUID prerequisiteCourseId) {}

    public record PrereqListPayload(
            @NotEmpty List<@NotNull UUID> prerequisiteCourseIds) {}

    public record PrereqListResult(String action, List<UUID> prerequisiteCourseIds) {}
}
