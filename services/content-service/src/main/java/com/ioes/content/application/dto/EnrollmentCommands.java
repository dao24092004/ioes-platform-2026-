package com.ioes.content.application.dto;

import jakarta.validation.constraints.NotNull;

/** Lệnh ghi cho luồng ghi danh. */
public final class EnrollmentCommands {

    private EnrollmentCommands() {
    }

    /** Đánh dấu hoặc bỏ đánh dấu hoàn thành một bài học. */
    public record SetLessonProgress(@NotNull Boolean completed) {}
}
