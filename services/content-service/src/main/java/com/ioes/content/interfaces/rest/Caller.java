package com.ioes.content.interfaces.rest;

import com.ioes.content.domain.exception.ContentAccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Set;
import java.util.UUID;

/**
 * Danh tính người gọi, lấy từ {@code SecurityContext} mà
 * {@code common-jwt}'s JwtAuthenticationFilter dựng từ bearer token đã kiểm chứng.
 *
 * <p>Không bao giờ đọc {@code X-User-Id} hay {@code X-User-Role}: client gọi
 * thẳng vào cổng service (bỏ qua gateway) có thể đặt header tuỳ ý.
 */
final class Caller {

    private static final Set<String> ADMIN_ROLES = Set.of("admin", "super_admin");

    private Caller() {
    }

    /** Id người gọi. Ném 403 nếu context rỗng — nghĩa là filter chưa xác thực được ai. */
    static UUID id() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID callerId)) {
            throw new ContentAccessDeniedException("Không xác định được người gọi");
        }
        return callerId;
    }

    /**
     * Vai trò đầu tiên trong token, hoặc chuỗi rỗng nếu không có. Tầng use case
     * chỉ cần biết có phải admin không, nên một vai trò là đủ.
     */
    static String role() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return "";
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("");
    }

    static boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(ADMIN_ROLES::contains);
    }
}
