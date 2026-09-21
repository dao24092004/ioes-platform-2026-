package com.ioes.gateway;

import com.ioes.common.exception.GlobalExceptionHandler;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

/**
 * {@link GlobalExceptionHandler} bi loai khoi pham vi quet: no la handler cho
 * service servlet, bat {@code Exception.class} roi tra 500 cho tat ca, nen o
 * gateway thi 404 / 503 / 504 deu bi lam phang thanh 500 va apps/web mat cac
 * nhanh thong bao theo 502/503/504/429. Javadoc cua chinh lop do da ghi
 * "Reactive services (e.g. api-gateway) should define their own" — ban reactive
 * o day la {@code com.ioes.gateway.exception.GatewayErrorWebExceptionHandler}.
 */
@SpringBootApplication
@EnableDiscoveryClient
@ComponentScan(
        basePackages = {"com.ioes.gateway", "com.ioes.common"},
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = GlobalExceptionHandler.class))
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}