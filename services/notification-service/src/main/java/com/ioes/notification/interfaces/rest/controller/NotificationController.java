package com.ioes.notification.interfaces.rest.controller;

import com.ioes.common.dto.ApiResponse;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.interfaces.rest.dto.NotificationResponse;
import com.ioes.notification.interfaces.rest.dto.SendNotificationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationUseCase notificationUseCase;

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<NotificationResponse>> send(@Valid @RequestBody SendNotificationRequest request) {
        log.info("Sending notification: type={}, recipient={}", request.type(), request.recipient());

        NotificationUseCase.SendCommand command = new NotificationUseCase.SendCommand(
                null,
                request.type(),
                request.recipient(),
                request.subject(),
                request.content()
        );

        var notification = notificationUseCase.send(command);
        return ResponseEntity.ok(ApiResponse.success("Notification queued", NotificationResponse.from(notification)));
    }

    @PostMapping("/send-templated")
    public ResponseEntity<ApiResponse<NotificationResponse>> sendTemplated(@Valid @RequestBody SendNotificationRequest request) {
        log.info("Sending templated notification: template={}, recipient={}", request.template(), request.recipient());

        NotificationUseCase.TemplatedCommand command = new NotificationUseCase.TemplatedCommand(
                null,
                request.type(),
                request.recipient(),
                request.template(),
                request.data()
        );

        var notification = notificationUseCase.sendTemplated(command);
        return ResponseEntity.ok(ApiResponse.success("Templated notification queued", NotificationResponse.from(notification)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getUserNotifications(@PathVariable UUID userId) {
        // For now, this is a placeholder - need to add this method to use case
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationResponse>> getNotification(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Notification retrieved", null));
    }
}