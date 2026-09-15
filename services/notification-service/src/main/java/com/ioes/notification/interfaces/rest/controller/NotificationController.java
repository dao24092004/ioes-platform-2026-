package com.ioes.notification.interfaces.rest.controller;

import com.ioes.common.dto.ApiResponse;
import com.ioes.common.exception.ApiException;
import com.ioes.notification.domain.port.in.NotificationUseCase;
import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.interfaces.rest.dto.NotificationResponse;
import com.ioes.notification.interfaces.rest.dto.NotificationStatsResponse;
import com.ioes.notification.interfaces.rest.dto.NotificationTemplateResponse;
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
                request.userId(),
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
                request.userId(),
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

    /**
     * GET /notifications/stats — delivery head-count across the whole table.
     *
     * <p>Declared before {@code /{id}} so the literal path is not swallowed by
     * the UUID pattern.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<NotificationStatsResponse>> stats() {
        NotificationStatsResponse stats = NotificationStatsResponse.from(notificationUseCase.stats());
        return ResponseEntity.ok(ApiResponse.success("Notification stats retrieved", stats));
    }

    /** GET /notifications/templates — what sendTemplated will accept. */
    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<NotificationTemplateResponse>>> templates() {
        List<NotificationTemplateResponse> templates = notificationUseCase.templates().stream()
                .map(NotificationTemplateResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Notification templates retrieved", templates));
    }

    /**
     * GET /notifications/{id} — one notification.
     *
     * <p>The row has to be loaded before the caller can be checked against it,
     * since ownership lives on the row. A notification with no user attached
     * (one addressed straight to an email address) is readable by admins only,
     * because there is no owner for it to belong to.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationResponse>> getNotification(@PathVariable UUID id) {
        Notification notification = notificationUseCase.getNotification(id);

        if (notification.getUserId() == null) {
            requireAdmin();
        } else {
            requireOwnerOrAdmin(notification.getUserId());
        }

        return ResponseEntity.ok(
                ApiResponse.success("Notification retrieved", NotificationResponse.from(notification)));
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

    private void requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(ADMIN_ROLES::contains);

        if (!isAdmin) {
            throw ApiException.forbidden("Cannot view another user's notifications");
        }
    }

    private static final Set<String> ADMIN_ROLES = Set.of("admin", "super_admin");
}