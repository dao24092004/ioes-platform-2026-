package com.ioes.gateway.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ioes.common.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.cloud.gateway.support.NotFoundException;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.net.ConnectException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeoutException;

/**
 * Bien loi cua gateway thanh ma trang thai that, thay cho
 * {@code com.ioes.common.exception.GlobalExceptionHandler}.
 *
 * <p>Handler dung chung o common-core bat {@code Exception.class} roi tra 500 cho
 * moi thu. No duoc viet cho service servlet, va javadoc cua chinh no da ghi ro
 * "Reactive services (e.g. api-gateway) should define their own". Gateway van
 * quet phai no qua {@code @ComponentScan("com.ioes.common")}, nen mot request het
 * gio (504), mot service khong con instance trong Eureka (503) va mot duong dan
 * khong ton tai (404) deu ve chung mot ma 500.
 *
 * <p>Dieu do khong chi lam xau log: {@code apps/web} phan nhanh thong bao theo
 * 502/503/504 ("dich vu AI dang ban, thu lai sau") va 429 ("qua nhieu yeu cau").
 * Moi thu ve 500 thi cac nhanh do khong bao gio chay, nguoi dung luon thay loi
 * chung chung, con nguoi truc thi khong phan biet duoc "service chet" voi
 * "endpoint khong ton tai".
 *
 * <p>Handler nay chi dung cho loi do CHINH gateway sinh ra. Phan hoi that cua
 * service dich — ke ca 4xx/5xx — duoc NettyRoutingFilter chuyen tiep nguyen ven
 * ca status lan body, khong di qua day.
 *
 * <p>{@code @Order(-2)} de chay truoc {@code DefaultErrorWebExceptionHandler}
 * cua Spring Boot (dang ky o -1).
 */
@Slf4j
@Component
@Order(-2)
public class GatewayErrorWebExceptionHandler implements ErrorWebExceptionHandler {

    private final ObjectMapper objectMapper;

    public GatewayErrorWebExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();
        // Da tra byte dau tien cho client thi khong doi status duoc nua.
        if (response.isCommitted()) {
            return Mono.error(ex);
        }

        HttpStatusCode status = resolveStatus(ex);
        String message = resolveMessage(ex, status);
        String path = exchange.getRequest().getPath().value();

        if (status.is5xxServerError()) {
            log.error("Gateway {} cho {}: {}", status.value(), path, ex.toString());
        } else {
            log.warn("Gateway {} cho {}: {}", status.value(), path, ex.toString());
        }

        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(ApiResponse.error(message));
        } catch (Exception serialisationFailure) {
            log.error("Khong serialise duoc than loi", serialisationFailure);
            bytes = ("{\"success\":false,\"message\":\"" + HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase() + "\"}")
                    .getBytes(StandardCharsets.UTF_8);
            response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
        }
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }

    /**
     * Anh xa ngoai le sang ma trang thai.
     *
     * <p>{@link NotFoundException} la loi cua Spring Cloud Gateway khi khong phan
     * giai duoc {@code lb://<service>} — service chua dang ky hoac da rot khoi
     * Eureka. Do la "tam thoi khong phuc vu duoc" nen phai la 503, khong phai 404
     * (duong dan co that) va cung khong phai 500 (gateway khong hong).
     */
    private HttpStatusCode resolveStatus(Throwable ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof NotFoundException) {
                return HttpStatus.SERVICE_UNAVAILABLE;
            }
            if (cause instanceof ResponseStatusException responseStatus) {
                return responseStatus.getStatusCode();
            }
            if (cause instanceof TimeoutException) {
                return HttpStatus.GATEWAY_TIMEOUT;
            }
            // Netty boc ConnectException trong AnnotatedConnectException.
            if (cause instanceof ConnectException) {
                return HttpStatus.SERVICE_UNAVAILABLE;
            }
            if (cause instanceof IOException) {
                return HttpStatus.BAD_GATEWAY;
            }
            if (cause.getCause() == cause) {
                break;
            }
        }
        // Chi loi that su cua ban than gateway moi con lai 500.
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private String resolveMessage(Throwable ex, HttpStatusCode status) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof ResponseStatusException responseStatus
                    && responseStatus.getReason() != null
                    && !responseStatus.getReason().isBlank()) {
                return responseStatus.getReason();
            }
            if (cause.getCause() == cause) {
                break;
            }
        }
        if (status.value() == HttpStatus.SERVICE_UNAVAILABLE.value()) {
            return "Service temporarily unavailable. Please try again later.";
        }
        if (status.value() == HttpStatus.GATEWAY_TIMEOUT.value()) {
            return "Upstream service did not respond in time.";
        }
        if (status.value() == HttpStatus.BAD_GATEWAY.value()) {
            return "Upstream service returned an invalid response.";
        }
        if (status.is5xxServerError()) {
            return "Internal server error";
        }
        return HttpStatus.valueOf(status.value()).getReasonPhrase();
    }
}
