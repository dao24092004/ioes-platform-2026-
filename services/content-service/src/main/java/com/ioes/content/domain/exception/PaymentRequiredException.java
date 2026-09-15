package com.ioes.content.domain.exception;

/**
 * Khoá học có phí trong khi hệ thống chưa có thanh toán. Tách khỏi
 * {@link InvalidCourseStateException} để client biết đây là 402 chứ không phải
 * khoá ở sai trạng thái.
 */
public class PaymentRequiredException extends RuntimeException {

    public PaymentRequiredException(String message) {
        super(message);
    }
}
