package com.ioes.content.domain.exception;

/**
 * Người gọi đã xác thực nhưng không được phép động vào bản ghi này — thường là
 * giảng viên thao tác lên khoá học của người khác.
 */
public class ContentAccessDeniedException extends RuntimeException {

    public ContentAccessDeniedException(String message) {
        super(message);
    }
}
