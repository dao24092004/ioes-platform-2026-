package com.ioes.content.interfaces.rest;

import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.exception.DuplicateSlugException;
import com.ioes.content.domain.exception.InvalidCourseStateException;
import com.ioes.content.domain.exception.InvalidTopicHierarchyException;
import com.ioes.content.domain.exception.PaymentRequiredException;
import com.ioes.content.domain.exception.TopicHasQuestionsException;
import com.ioes.content.domain.exception.TopicNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Đổi exception nghiệp vụ của content-service thành mã HTTP.
 *
 * <p>Khôi phục sau khi bị xoá ở 3d1e8b4: thiếu lớp này, {@code GlobalExceptionHandler}
 * của common-core bắt mọi exception ở nhánh {@code Exception.class} và trả 500 cho cả
 * "không tìm thấy" lẫn "không có quyền". {@code HIGHEST_PRECEDENCE} để lớp này được
 * xét trước handler chung đó.
 */
@Slf4j
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ContentExceptionHandler {

    @ExceptionHandler({ContentNotFoundException.class, TopicNotFoundException.class})
    public ResponseEntity<Map<String, Object>> handleNotFound(RuntimeException ex) {
        return respond(HttpStatus.NOT_FOUND, "NOT_FOUND", ex);
    }

    @ExceptionHandler(ContentAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(ContentAccessDeniedException ex) {
        return respond(HttpStatus.FORBIDDEN, "ACCESS_DENIED", ex);
    }

    @ExceptionHandler(PaymentRequiredException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentRequired(PaymentRequiredException ex) {
        return respond(HttpStatus.PAYMENT_REQUIRED, "PAYMENT_REQUIRED", ex);
    }

    @ExceptionHandler({InvalidCourseStateException.class, DuplicateSlugException.class, TopicHasQuestionsException.class})
    public ResponseEntity<Map<String, Object>> handleConflict(RuntimeException ex) {
        return respond(HttpStatus.CONFLICT, "CONFLICT", ex);
    }

    @ExceptionHandler({InvalidTopicHierarchyException.class, IllegalArgumentException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(RuntimeException ex) {
        return respond(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));

        Map<String, Object> body = body("VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ");
        body.put("errors", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    private ResponseEntity<Map<String, Object>> respond(HttpStatus status, String code, RuntimeException ex) {
        log.warn("{}: {}", code, ex.getMessage());
        return ResponseEntity.status(status).body(body(code, ex.getMessage()));
    }

    private Map<String, Object> body(String code, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("code", code);
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        return body;
    }
}
