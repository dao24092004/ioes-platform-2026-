package com.ioes.content.interfaces.rest;

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
public class GlobalExceptionHandler {

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