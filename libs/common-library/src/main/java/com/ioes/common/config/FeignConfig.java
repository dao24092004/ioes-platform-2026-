package com.ioes.common.config;

import com.ioes.common.security.JwtTokenProvider;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Propagates the current user's JWT token on outbound calls when the
 * calling service uses OpenFeign. Auto-wired only when {@code spring-cloud-starter-openfeign}
 * is on the classpath.
 */
@Configuration
public class FeignConfig {

    @Value("${spring.application.name:ioes-service}")
    private String serviceName;

    @Bean
    public RequestInterceptor jwtFeignInterceptor() {
        return template -> {
            template.header("X-Source-Service", serviceName);

            // Forward Authorization header from the current request if available
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder
                    .getRequestAttributes();
            if (attrs != null) {
                String auth = attrs.getRequest().getHeader("Authorization");
                if (auth != null && !auth.isBlank()) {
                    template.header("Authorization", auth);
                }
            }
        };
    }
}
