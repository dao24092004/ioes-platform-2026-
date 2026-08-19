package com.ioes.common.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Propagates the current user's JWT token on outbound calls when the
 * calling service uses OpenFeign. Only active when both the servlet stack
 * and OpenFeign are on the classpath.
 */
@Configuration
@ConditionalOnClass(name = {
        "feign.RequestInterceptor",
        "jakarta.servlet.http.HttpServletRequest"
})
public class FeignConfig {

    @Value("${spring.application.name:ioes-service}")
    private String serviceName;

    @Bean
    public RequestInterceptor jwtFeignInterceptor() {
        return template -> {
            template.header("X-Source-Service", serviceName);

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