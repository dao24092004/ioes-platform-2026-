package com.ioes.content.application.dto;

import jakarta.validation.constraints.*;

/** Lệnh cho đánh giá khoá học. */
public final class ReviewCommands {

    private ReviewCommands() {
    }

    /** Gửi đánh giá mới hoặc cập nhật đánh giá đã có. */
    public record CreateReview(
            @NotNull @Min(1) @Max(5) Integer rating,
            @Size(max = 255) String title,
            @Size(max = 10000) String content
    ) {}

    /** Cập nhật đánh giá. Trường null giữ nguyên. */
    public record UpdateReview(
            @Min(1) @Max(5) Integer rating,
            @Size(max = 255) String title,
            @Size(max = 10000) String content
    ) {}

    /** Vote hữu ích / không hữu ích. */
    public record VoteReview(@NotNull Boolean isHelpful) {}
}
