package com.ioes.content.domain.exception;

/**
 * Thao tác không hợp lệ với trạng thái hiện tại của khoá học — ví dụ xuất bản
 * một khoá chưa được duyệt.
 */
public class InvalidCourseStateException extends RuntimeException {

    public InvalidCourseStateException(String message) {
        super(message);
    }
}
