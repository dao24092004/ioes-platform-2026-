package com.ioes.content.domain.exception;

/** Slug đã có bản ghi khác dùng. Slug nằm trên URL công khai nên phải là duy nhất. */
public class DuplicateSlugException extends RuntimeException {

    private final String slug;

    public DuplicateSlugException(String slug) {
        super("Slug already in use: " + slug);
        this.slug = slug;
    }

    public String getSlug() {
        return slug;
    }
}
