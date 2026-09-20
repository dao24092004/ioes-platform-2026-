package com.ioes.content.interfaces.rest;

import com.ioes.content.application.dto.ReviewCommands;
import com.ioes.content.application.dto.ReviewResponses;
import com.ioes.content.application.usecase.ReviewUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Đánh giá khoá học, ở {@code /api/v1/courses/{courseId}/reviews}.
 *
 * <p>Đọc công khai (ai cũng xem được đánh giá); ghi/chỉnh sửa/xoá chỉ user đã đăng nhập.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/courses/{courseId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewUseCase reviewUseCase;

    /** Thống kê đánh giá: trung bình sao, tổng số, phân bố theo sao. */
    @GetMapping("/stats")
    public ReviewResponses.ReviewStatsView stats(@PathVariable UUID courseId) {
        return reviewUseCase.stats(courseId);
    }

    /** Danh sách đánh giá, mới nhất trước, có phân trang. */
    @GetMapping
    public ReviewResponses.PageView<ReviewResponses.ReviewView> list(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int perPage) {
        return reviewUseCase.listByCourse(courseId, page, Math.min(perPage, 50));
    }

    /** Tạo hoặc cập nhật đánh giá của user hiện tại cho khoá này. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponses.ReviewView upsert(
            @PathVariable UUID courseId,
            @Valid @RequestBody ReviewCommands.CreateReview command) {
        return reviewUseCase.upsert(courseId, command, Caller.id());
    }

    /** Xoá đánh giá. Chỉ người viết hoặc admin. */
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID courseId,
            @PathVariable UUID reviewId) {
        reviewUseCase.delete(reviewId, Caller.id(), Caller.role());
        return ResponseEntity.noContent().build();
    }

    /** Vote hữu ích / không hữu ích cho một đánh giá. */
    @PostMapping("/{reviewId}/vote")
    @ResponseStatus(HttpStatus.CREATED)
    public VoteResult vote(
            @PathVariable UUID courseId,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewCommands.VoteReview command) {
        reviewUseCase.vote(reviewId, command, Caller.id());
        return new VoteResult("voted");
    }

    public record VoteResult(String action) {}
}
