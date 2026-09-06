package com.ioes.content.application.port;

import com.ioes.content.domain.model.Category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Cổng đọc/ghi danh mục. */
public interface CategoryRepository {

    Category save(Category category);

    Optional<Category> findById(UUID id);

    boolean existsBySlug(String slug);

    /** Danh mục đang bật, sắp theo sortOrder rồi tới tên. */
    List<Category> findActive();
}
