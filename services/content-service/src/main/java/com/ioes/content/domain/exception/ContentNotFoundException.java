package com.ioes.content.domain.exception;

/**
 * Không tìm thấy một bản ghi nội dung (khoá học, danh mục, chương, bài học).
 *
 * <p>Một lớp dùng chung thay vì bốn lớp gần giống hệt nhau: chỗ gọi phân biệt
 * bằng {@code resourceType}, còn tầng REST chỉ cần biết đây là 404.
 */
public class ContentNotFoundException extends RuntimeException {

    private final String resourceType;
    private final String resourceId;

    public ContentNotFoundException(String resourceType, Object resourceId) {
        super(resourceType + " not found with id: " + resourceId);
        this.resourceType = resourceType;
        this.resourceId = String.valueOf(resourceId);
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }
}
