package com.ioes.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Reactive CORS filter applied to all services that use webflux.
 */
@Configuration
public class CommonCorsConfig {

    @Value("${ioes.cors.allowed-origins:http://localhost:3000,http://localhost:4200}")
    private String[] allowedOrigins;

    @Value("${ioes.cors.allowed-methods:GET,POST,PUT,PATCH,DELETE,OPTIONS}")
    private String[] allowedMethods;

    @Value("${ioes.cors.allowed-headers:*}")
    private String[] allowedHeaders;

    @Value("${ioes.cors.exposed-headers:X-Request-Id,X-Correlation-Id,X-Trace-Id}")
    private String[] exposedHeaders;

    @Value("${ioes.cors.max-age:3600}")
    private long maxAge;

    @Bean
    public CorsWebFilter commonCorsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins));
        config.setAllowedMethods(Arrays.asList(allowedMethods));
        config.setAllowedHeaders(List.of(allowedHeaders));
        config.setExposedHeaders(List.of(exposedHeaders));
        config.setAllowCredentials(true);
        config.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }
}