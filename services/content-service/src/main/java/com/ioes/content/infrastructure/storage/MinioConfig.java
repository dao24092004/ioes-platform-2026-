package com.ioes.content.infrastructure.storage;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Cấu hình MinIO client.
 *
 * <p>Tự động tạo bucket khi khởi động nếu chưa có.
 */
@Slf4j
@Configuration
public class MinioConfig {

    @Value("${minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${minio.access-key:minio}")
    private String accessKey;

    @Value("${minio.secret-key:minio123}")
    private String secretKey;

    /** Các bucket ứng dụng dùng. Tạo tự động nếu chưa có. */
    @Value("${minio.buckets:ioes-media}")
    private String bucketsConfig;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @PostConstruct
    void ensureBuckets() {
        MinioClient client = minioClient();
        List<String> buckets = List.of(bucketsConfig.split(","));
        for (String bucket : buckets) {
            bucket = bucket.trim();
            try {
                if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
                    client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                    log.info("Đã tạo bucket '{}'", bucket);
                }
            } catch (Exception e) {
                log.warn("Không tạo được bucket '{}': {}", bucket, e.getMessage());
            }
        }
    }
}
