package com.ioes.content.interfaces.rest;

import com.ioes.content.application.port.FileStoragePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Upload file lên MinIO.
 *
 * <p>Supported MIME types:
 * <ul>
 *   <li>Images: {@code image/jpeg}, {@code image/png}, {@code image/gif}, {@code image/webp}</li>
 *   <li>Video: {@code video/mp4}, {@code video/webm}</li>
 *   <li>Documents: {@code application/pdf}</li>
 * </ul>
 *
 * <p>File size tối đa: 500 MB (config {@code minio.max-file-size-mb}).
 *
 * <p>URL trả về là public URL của MinIO.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStoragePort fileStorage;

    private static final String MEDIA_BUCKET = "ioes-media";
    private static final long MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "video/mp4",
            "video/webm",
            "application/pdf"
    );

    private static final Set<String> IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    /**
     * Upload một file.
     *
     * @param type  {@code media} cho video/PDF, {@code image} cho ảnh
     * @param file  file gửi lên
     * @return URL của file đã upload
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResult upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "media") String type) {

        validateFile(file);

        String contentType = file.getContentType();
        String key = buildKey(type, file.getOriginalFilename(), contentType);

        String url;
        try {
            url = fileStorage.upload(
                    MEDIA_BUCKET,
                    key,
                    file.getBytes(),
                    contentType,
                    file.getSize());
        } catch (IOException e) {
            throw new RuntimeException("Không đọc được nội dung file", e);
        }

        return new UploadResult(url, key, file.getSize(), contentType);
    }

    /**
     * Upload nhiều file cùng lúc.
     */
    @PostMapping(value = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public List<UploadResult> uploadBatch(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "type", defaultValue = "media") String type) {

        if (files.length > 10) {
            throw new IllegalArgumentException("Tối đa 10 file mỗi lần upload");
        }

        return java.util.Arrays.stream(files)
                .map(file -> {
                    validateFile(file);
                    String key = buildKey(type, file.getOriginalFilename(), file.getContentType());
                    try {
                        String url = fileStorage.upload(
                                MEDIA_BUCKET, key, file.getBytes(),
                                file.getContentType(), file.getSize());
                        return new UploadResult(url, key, file.getSize(), file.getContentType());
                    } catch (IOException e) {
                        throw new RuntimeException("Không đọc được nội dung file: " + file.getOriginalFilename(), e);
                    }
                })
                .toList();
    }

    /**
     * Xoá file theo URL.
     *
     * @param url URL đầy đủ của file (trích key từ URL để xoá)
     */
    @DeleteMapping
    public void delete(@RequestParam("url") String url) {
        String key = extractKey(url);
        if (key == null) {
            throw new IllegalArgumentException("URL không hợp lệ");
        }
        fileStorage.delete(MEDIA_BUCKET, key);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File rỗng");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "File vượt kích thước cho phép (" + MAX_FILE_SIZE / (1024 * 1024) + " MB)");
        }
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_TYPES.contains(ct)) {
            throw new IllegalArgumentException(
                    "Loại file không được hỗ trợ: " + ct + ". Chỉ chấp nhận: " + ALLOWED_TYPES);
        }
    }

    /**
     * Build object key: {type}/{yyyy}/{uuid}.{ext}
     * Ví dụ: media/2026/abc123.pdf, image/2026/abc123.png
     */
    private String buildKey(String type, String filename, String contentType) {
        String ext = extensionOf(filename, contentType);
        return type + "/" + java.time.Year.now() + "/" + UUID.randomUUID() + ext;
    }

    private String extensionOf(String filename, String contentType) {
        // Extract extension from filename
        if (filename != null && filename.contains(".")) {
            String ext = filename.substring(filename.lastIndexOf('.'));
            if (!ext.isBlank()) {
                return ext;
            }
        }
        // Fallback from content type
        return "." + contentType.split("/")[1];
    }

    /**
     * Trích key từ MinIO URL.
     * Ví dụ: http://localhost:9000/ioes-media/courses/2026/abc.pdf -> courses/2026/abc.pdf
     */
    private String extractKey(String url) {
        // Pattern: {endpoint}/{bucket}/{key}
        int bucketSlash = url.indexOf(MEDIA_BUCKET + "/");
        if (bucketSlash < 0) {
            return null;
        }
        return url.substring(bucketSlash + MEDIA_BUCKET.length() + 1);
    }

    public record UploadResult(String url, String key, long size, String contentType) {}
}
