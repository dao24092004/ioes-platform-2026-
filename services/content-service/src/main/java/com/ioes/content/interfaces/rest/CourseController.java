package com.ioes.content.interfaces.rest;

import com.ioes.content.application.dto.CourseCommands;
import com.ioes.content.application.dto.CourseResponses.ChapterView;
import com.ioes.content.application.dto.CourseResponses.CourseDetailView;
import com.ioes.content.application.dto.CourseResponses.CourseStatsView;
import com.ioes.content.application.dto.CourseResponses.CourseView;
import com.ioes.content.application.dto.CourseResponses.LessonView;
import com.ioes.content.application.dto.CourseResponses.PageView;
import com.ioes.content.application.usecase.CourseStructureUseCase;
import com.ioes.content.application.usecase.CourseUseCase;
import com.ioes.content.domain.model.CourseStatus;
import com.ioes.content.domain.model.ReviewStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Khoá học, chương và bài học.
 *
 * <p>Mounted ở {@code /api/v1/courses}. Gateway chuyển tiếp
 * {@code /api/v1/courses/**} tới đây mà không cắt tiền tố, vì controller đã mang
 * sẵn {@code /api/v1} — cùng dạng với route exam-session.
 *
 * <p>Chương và bài học lồng hẳn dưới khoá học ({@code /{courseId}/chapters/...})
 * thay vì có route riêng: quyền của chúng bắt nguồn từ khoá cha, và cách này giữ
 * mọi thứ nằm trong đúng một tiền tố mà gateway biết.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
public class CourseController {

    /** Giá trị client gửi khi không muốn lọc theo enum. */
    private static final String NO_FILTER = "all";

    private final CourseUseCase courseUseCase;
    private final CourseStructureUseCase structureUseCase;

    /**
     * GET /api/v1/courses
     *
     * <p>{@code mine=true} giới hạn về khoá của chính người gọi — đó là thứ trang
     * giảng viên cần, và nó không thể bị nới rộng vì id lấy từ token.
     */
    @GetMapping
    public PageView<CourseView> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String reviewStatus,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(name = "per_page", defaultValue = "20") int perPage) {

        UUID instructorId = mine ? Caller.id() : null;

        return courseUseCase.search(
                search,
                categoryId,
                instructorId,
                parseEnum(status, CourseStatus.class, "status"),
                parseEnum(reviewStatus, ReviewStatus.class, "reviewStatus"),
                page,
                perPage);
    }

    /** GET /api/v1/courses/stats — khai báo trước {@code /{id}} để không bị nuốt. */
    @GetMapping("/stats")
    public CourseStatsView stats() {
        return courseUseCase.stats();
    }

    @GetMapping("/{id}")
    public CourseView getById(@PathVariable UUID id) {
        return courseUseCase.getById(id);
    }

    /** GET /api/v1/courses/{id}/detail — khoá học kèm cây chương và bài học. */
    @GetMapping("/{id}/detail")
    public CourseDetailView getDetail(@PathVariable UUID id) {
        return structureUseCase.getDetail(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CourseView create(@Valid @RequestBody CourseCommands.CreateCourse command) {
        // Khoá học luôn đứng tên người gọi: không nhận instructorId từ body, để
        // không ai tạo khoá mang tên người khác.
        return courseUseCase.create(command, Caller.id());
    }

    @PatchMapping("/{id}")
    public CourseView update(
            @PathVariable UUID id, @Valid @RequestBody CourseCommands.UpdateCourse command) {
        return courseUseCase.update(id, command, Caller.id(), Caller.role());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        courseUseCase.delete(id, Caller.id(), Caller.role());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    public CourseView submitForReview(@PathVariable UUID id) {
        return courseUseCase.submitForReview(id, Caller.id(), Caller.role());
    }

    @PostMapping("/{id}/approve")
    public CourseView approve(@PathVariable UUID id) {
        return courseUseCase.approve(id, Caller.id());
    }

    @PostMapping("/{id}/reject")
    public CourseView reject(
            @PathVariable UUID id, @Valid @RequestBody CourseCommands.RejectCourse command) {
        return courseUseCase.reject(id, Caller.id(), command.reason());
    }

    @PostMapping("/{id}/publish")
    public CourseView publish(@PathVariable UUID id) {
        return courseUseCase.publish(id, Caller.id(), Caller.role());
    }

    // ===== Chương và bài học =====

    @PostMapping("/{courseId}/chapters")
    @ResponseStatus(HttpStatus.CREATED)
    public ChapterView addChapter(
            @PathVariable UUID courseId,
            @Valid @RequestBody CourseCommands.CreateChapter command) {
        return structureUseCase.addChapter(courseId, command, Caller.id(), Caller.role());
    }

    @DeleteMapping("/{courseId}/chapters/{chapterId}")
    public ResponseEntity<Void> deleteChapter(
            @PathVariable UUID courseId, @PathVariable UUID chapterId) {
        structureUseCase.deleteChapter(chapterId, Caller.id(), Caller.role());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{courseId}/chapters/{chapterId}/lessons")
    public List<LessonView> listLessons(
            @PathVariable UUID courseId, @PathVariable UUID chapterId) {
        return structureUseCase.listLessons(chapterId);
    }

    @PostMapping("/{courseId}/chapters/{chapterId}/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    public LessonView addLesson(
            @PathVariable UUID courseId,
            @PathVariable UUID chapterId,
            @Valid @RequestBody CourseCommands.CreateLesson command) {
        return structureUseCase.addLesson(chapterId, command, Caller.id(), Caller.role());
    }

    @DeleteMapping("/{courseId}/chapters/{chapterId}/lessons/{lessonId}")
    public ResponseEntity<Void> deleteLesson(
            @PathVariable UUID courseId,
            @PathVariable UUID chapterId,
            @PathVariable UUID lessonId) {
        structureUseCase.deleteLesson(lessonId, Caller.id(), Caller.role());
        return ResponseEntity.noContent().build();
    }

    /**
     * {@code null}, rỗng và {@code all} đều nghĩa là không lọc. Giá trị lạ thì
     * báo lỗi thay vì im lặng bỏ bộ lọc — nới rộng kết quả một cách âm thầm còn
     * tệ hơn là trả về 400.
     */
    private <E extends Enum<E>> E parseEnum(String raw, Class<E> type, String field) {
        if (raw == null || raw.isBlank() || NO_FILTER.equalsIgnoreCase(raw)) {
            return null;
        }
        try {
            return Enum.valueOf(type, raw.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Giá trị không hợp lệ cho " + field + ": " + raw);
        }
    }
}
