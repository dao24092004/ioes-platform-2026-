package com.ioes.content.infrastructure.storage;

import com.ioes.content.application.port.FileStoragePort;
import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Adapter MinIO cho {@link FileStoragePort}.
 *
 * <p>Upload với object size giới hạn bởi config. File đủ nhỏ được đọc toàn bộ
 * vào memory; với file lớn hơn nên dùng streaming nhưng ở mức 500MB controller
 * đọc multipart thì approach này vẫn chấp nhận được vì Java heap đủ.
 *
 * <p>URL trả về dùng endpoint gốc của MinIO. Trong production có thể thay bằng
 * CDN prefix qua config.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MinioAdapter implements FileStoragePort {

    private final MinioClient minioClient;

    @Value("${minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${minio.public-endpoint:${minio.endpoint}}")
    private String publicEndpoint;

    @Value("${minio.max-file-size-mb:500}")
    private int maxFileSizeMb;

    @Override
    public String upload(String bucket, String key, byte[] data, String contentType, long size) {
        if (size > (long) maxFileSizeMb * 1024 * 1024) {
            throw new IllegalArgumentException(
                    "File vượt kích thước cho phép (" + maxFileSizeMb + " MB)");
        }

        try (var stream = new ByteArrayInputStream(data)) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .stream(stream, size, -1)
                    .contentType(contentType)
                    .build());

            String publicUrl = resolvePublicUrl(bucket, key);
            log.info("Uploaded {} bytes to {}/{} -> {}", size, bucket, key, publicUrl);
            return publicUrl;
        } catch (Exception e) {
            throw new RuntimeException("Upload thất bại: " + bucket + "/" + key, e);
        }
    }

    @Override
    public void delete(String bucket, String key) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .build());
            log.info("Deleted {}/{}", bucket, key);
        } catch (Exception e) {
            throw new RuntimeException("Delete thất bại: " + bucket + "/" + key, e);
        }
    }

    @Override
    public boolean exists(String bucket, String key) {
        try {
            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .build());
            return true;
        } catch (Exception e) {
            // 404 = not found, any other error = assume not found
            if (e.getMessage() != null && e.getMessage().contains("404")) {
                return false;
            }
            log.warn("StatObject {} failed: {}", key, e.getMessage());
            return false;
        }
    }

    /**
     * Resolves public URL. If {@code public-endpoint} config equals {@code endpoint},
     * returns direct MinIO URL; otherwise uses configured CDN/proxy prefix.
     */
    private String resolvePublicUrl(String bucket, String key) {
        String base = publicEndpoint.replaceAll("/$", "");
        return base + "/" + bucket + "/" + key;
    }
}
