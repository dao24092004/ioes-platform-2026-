package com.ioes.notification.interfaces.rest.controller;

import com.ioes.common.dto.ApiResponse;
import com.ioes.common.exception.ApiException;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.interfaces.rest.dto.NotificationResponse;
import com.ioes.notification.interfaces.rest.dto.SendNotificationRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
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
        requireOwnerOrAdmin(userId);

        List<NotificationResponse> notifications = notificationUseCase.getUserNotifications(userId).stream()
                .map(NotificationResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", notifications));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationResponse>> getNotification(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Notification retrieved", null));
    }

    /**
     * A student may read only their own notifications; admin/super_admin may
     * read anyone's. The caller id and role come from the SecurityContext
     * populated by {@code JwtAuthenticationFilter} from the validated bearer
     * token — never from the client-controllable {@code X-User-Id} header.
     * {@code anyRequest().authenticated()} in {@code SecurityConfig} already
     * guarantees {@code authentication} is non-null and non-anonymous here.
     */
    private void requireOwnerOrAdmin(UUID userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication.getPrincipal() instanceof UUID callerId)) {
            throw ApiException.forbidden("Cannot view another user's notifications");
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(ADMIN_ROLES::contains);

        if (!callerId.equals(userId) && !isAdmin) {
            throw ApiException.forbidden("Cannot view another user's notifications");
        }
    }

    private static final Set<String> ADMIN_ROLES = Set.of("admin", "super_admin");
}