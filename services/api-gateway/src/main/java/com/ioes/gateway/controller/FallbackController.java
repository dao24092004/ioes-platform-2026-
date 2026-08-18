package com.ioes.gateway.controller;

import com.ioes.common.dto.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @GetMapping
    public Mono<ApiResponse<Map<String, Object>>> fallback() {
        return Mono.just(ApiResponse.error("Service temporarily unavailable. Please try again later."));
    }
}