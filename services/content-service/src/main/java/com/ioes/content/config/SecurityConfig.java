package com.ioes.content.config;

import com.ioes.common.security.JwtAuthenticationFilter;
import com.ioes.common.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security cho content-service.
 *
 * <p>Trước đây service này không có security nào: không có Spring Security trong
 * pom, không có filter, và {@code TopicController} nhận mọi request. Điều đó tạm
 * chấp nhận được khi service chưa boot được và route ở gateway thì hỏng, nhưng
 * không thể giữ khi đã có endpoint tạo, duyệt và xuất bản khoá học.
 *
 * <p>Giống analytics-service và notification-service: content-service có thể bị
 * gọi thẳng vào cổng 9001, bỏ qua gateway, nên không tin được header
 * {@code X-User-Id} / {@code X-User-Role} — ai gọi thẳng cũng đặt được. Service
 * tự kiểm chứng bearer token qua {@link JwtAuthenticationFilter} của
 * {@code common-jwt} và controller lấy danh tính từ {@code SecurityContext}.
 *
 * <p>Phân quyền:
 * <ul>
 *   <li>{@code GET /api/v1/categories/**} — công khai. Danh mục là phân loại
 *       công khai của catalogue, không lộ gì.</li>
 *   <li>{@code /api/v1/courses/stats} và các route duyệt — admin/super_admin.</li>
 *   <li>Còn lại — phải đăng nhập. Quyền sở hữu (giảng viên chỉ sửa khoá của
 *       mình) do tầng use case kiểm, vì nó cần đọc bản ghi mới biết chủ là ai.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    /**
     * {@code common-jwt} để filter là lớp thường chứ không phải {@code @Component},
     * nên mỗi service phải tự đăng ký — thêm dependency không bao giờ âm thầm
     * đổi thế trận bảo mật của service.
     */
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider);
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus")
                            .permitAll()
                        .requestMatchers("/error").permitAll()

                        // Danh mục: đọc công khai, ghi thì chỉ quản trị.
                        .requestMatchers(HttpMethod.GET, "/api/v1/categories/**").permitAll()
                        .requestMatchers("/api/v1/categories/**")
                            .hasAnyAuthority("admin", "super_admin")

                        // Duyệt khoá học và số liệu tổng: chỉ quản trị.
                        .requestMatchers(HttpMethod.GET, "/api/v1/courses/stats")
                            .hasAnyAuthority("admin", "super_admin")
                        .requestMatchers(HttpMethod.POST, "/api/v1/courses/*/approve", "/api/v1/courses/*/reject")
                            .hasAnyAuthority("admin", "super_admin")

                        .anyRequest().authenticated()
                )
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
