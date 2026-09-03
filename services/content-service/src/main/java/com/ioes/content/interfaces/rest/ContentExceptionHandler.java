package com.ioes.content.interfaces.rest;

import com.ioes.content.domain.exception.ContentAccessDeniedException;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.exception.DuplicateSlugException;
import com.ioes.content.domain.exception.InvalidCourseStateException;
import com.ioes.content.domain.exception.InvalidTopicHierarchyException;
import com.ioes.content.domain.exception.TopicHasQuestionsException;
import com.ioes.content.domain.exception.TopicNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class ContentExceptionHandler {

    @ExceptionHandler(TopicNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleTopicNotFound(TopicNotFoundException ex) {
        log.warn("Topic not found: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(error("TOPIC_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(TopicHasQuestionsException.class)
    public ResponseEntity<Map<String, Object>> handleTopicHasQuestions(TopicHasQuestionsException ex) {
        log.warn("Topic has questions: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error("TOPIC_HAS_QUESTIONS", ex.getMessage()));
    }

    @ExceptionHandler(InvalidTopicHierarchyException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidHierarchy(InvalidTopicHierarchyException ex) {
        log.warn("Invalid topic hierarchy: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(error("INVALID_TOPIC_HIERARCHY", ex.getMessage()));
    }

    @ExceptionHandler(ContentNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleContentNotFound(ContentNotFoundException ex) {
        log.warn("Content not found: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(error(ex.getResourceType().toUpperCase() + "_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(DuplicateSlugException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateSlug(DuplicateSlugException ex) {
        log.warn("Duplicate slug: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error("DUPLICATE_SLUG", ex.getMessage()));
    }

    @ExceptionHandler(ContentAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(ContentAccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(error("ACCESS_DENIED", ex.getMessage()));
    }

    @ExceptionHandler(InvalidCourseStateException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCourseState(InvalidCourseStateException ex) {
        log.warn("Invalid course state: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(error("INVALID_COURSE_STATE", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(error("BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        log.warn("Validation error: {}", ex.getMessage());

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));

        Map<String, Object> body = error("VALIDATION_ERROR", "Invalid request body");
        body.put("errors", errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error("INTERNAL_ERROR", "An unexpected error occurred"));
    }

    private Map<String, Object> error(String code, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("code", code);
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        return body;
    }
}