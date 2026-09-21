package com.ioes.content.application.port;

/**
 * Cổng lưu trữ file (MinIO/S3-compatible).
 *
 * <p>Content-service dùng MinIO để lưu:
 * <ul>
 *   <li>Video, PDF, tài liệu bài học</li>
 *   <li>Thumbnail khoá học</li>
 *   <li>File đính kèm</li>
 * </ul>
 *
 * <p>File URL trả về là public URL của MinIO, không cần presigned URL vì
 * bucket đã được set anonymous download trong init script.
 */
public interface FileStoragePort {

    /**
     * Upload một file.
     *
     * @param bucket  tên bucket (e.g. {@code ioes-media})
     * @param key     đường dẫn object trong bucket (e.g. {@code courses/abc/thumb.png})
     * @param data    nội dung file
     * @param contentType MIME type (e.g. {@code image/png}, {@code application/pdf})
     * @param size    kích thước file (bytes)
     * @return URL công khai của file đã upload
     */
    String upload(String bucket, String key, byte[] data, String contentType, long size);

    /**
     * Xoá một file.
     *
     * @param bucket tên bucket
     * @param key    đường dẫn object
     */
    void delete(String bucket, String key);

    /**
     * Kiểm tra file có tồn tại không.
     */
    boolean exists(String bucket, String key);
}
