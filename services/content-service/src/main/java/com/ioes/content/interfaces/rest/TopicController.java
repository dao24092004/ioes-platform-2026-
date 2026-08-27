package com.ioes.content.interfaces.rest;

import com.ioes.content.application.dto.CreateTopicCommand;
import com.ioes.content.application.dto.TopicResponse;
import com.ioes.content.application.dto.UpdateTopicCommand;
import com.ioes.content.application.usecase.CreateTopicUseCase;
import com.ioes.content.application.usecase.DeleteTopicUseCase;
import com.ioes.content.application.usecase.GetTopicUseCase;
import com.ioes.content.application.usecase.UpdateTopicUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/topics")
@RequiredArgsConstructor
@Slf4j
public class TopicController {

    private final CreateTopicUseCase createTopicUseCase;
    private final UpdateTopicUseCase updateTopicUseCase;
    private final DeleteTopicUseCase deleteTopicUseCase;
    private final GetTopicUseCase getTopicUseCase;

    @PostMapping
    public ResponseEntity<TopicResponse> create(
            @Valid @RequestBody CreateTopicCommand command,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        log.info("POST /api/v1/topics - name: {}", command.getName());

        String corrId = correlationId != null ? correlationId : UUID.randomUUID().toString();
        TopicResponse response = createTopicUseCase.execute(command, corrId);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<TopicResponse>> getAll() {
        log.info("GET /api/v1/topics");
        return ResponseEntity.ok(getTopicUseCase.getAll());
    }

    @GetMapping("/{topicId}")
    public ResponseEntity<TopicResponse> getById(@PathVariable UUID topicId) {
        log.info("GET /api/v1/topics/{}", topicId);
        return ResponseEntity.ok(getTopicUseCase.getById(topicId));
    }

    @GetMapping("/{topicId}/children")
    public ResponseEntity<List<TopicResponse>> getChildren(@PathVariable UUID topicId) {
        log.info("GET /api/v1/topics/{}/children", topicId);
        return ResponseEntity.ok(getTopicUseCase.getChildren(topicId));
    }

    @GetMapping("/{topicId}/exists")
    public ResponseEntity<ExistsResponse> exists(@PathVariable UUID topicId) {
        log.info("GET /api/v1/topics/{}/exists", topicId);
        return ResponseEntity.ok(new ExistsResponse(getTopicUseCase.exists(topicId)));
    }

    @PatchMapping("/{topicId}")
    public ResponseEntity<TopicResponse> update(
            @PathVariable UUID topicId,
            @Valid @RequestBody UpdateTopicCommand command,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        log.info("PATCH /api/v1/topics/{}", topicId);

        String corrId = correlationId != null ? correlationId : UUID.randomUUID().toString();
        TopicResponse response = updateTopicUseCase.execute(topicId, command, corrId);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{topicId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID topicId,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        log.info("DELETE /api/v1/topics/{}", topicId);

        String corrId = correlationId != null ? correlationId : UUID.randomUUID().toString();
        deleteTopicUseCase.execute(topicId, corrId);

        return ResponseEntity.noContent().build();
    }

    public record ExistsResponse(boolean exists) {}
}