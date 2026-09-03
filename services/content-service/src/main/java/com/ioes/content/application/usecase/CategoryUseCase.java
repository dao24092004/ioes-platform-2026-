package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CourseCommands;
import com.ioes.content.application.dto.CourseResponses.CategoryView;
import com.ioes.content.application.port.CategoryRepository;
import com.ioes.content.domain.exception.ContentNotFoundException;
import com.ioes.content.domain.exception.DuplicateSlugException;
import com.ioes.content.domain.model.Category;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Danh mục khoá học. Đọc thì công khai, ghi thì chỉ quản trị. */
@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryUseCase {

    private static final String CATEGORY = "Category";

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryView> listActive() {
        return categoryRepository.findActive().stream().map(CategoryView::from).toList();
    }

    @Transactional
    public CategoryView create(CourseCommands.CreateCategory command) {
        if (categoryRepository.existsBySlug(command.slug())) {
            throw new DuplicateSlugException(command.slug());
        }
        if (command.parentId() != null && categoryRepository.findById(command.parentId()).isEmpty()) {
            throw new ContentNotFoundException(CATEGORY, command.parentId());
        }

        Category category = Category.builder()
                .name(command.name())
                .slug(command.slug())
                .description(command.description())
                .parentId(command.parentId())
                .icon(command.icon())
                .sortOrder(command.sortOrder() == null ? 0 : command.sortOrder())
                .isActive(true)
                .build();

        return CategoryView.from(categoryRepository.save(category));
    }

    /**
     * Tắt danh mục thay vì xoá: khoá học tham chiếu tới nó qua khoá ngoại
     * ON DELETE SET NULL, xoá thật sẽ âm thầm gỡ danh mục của mọi khoá đang dùng.
     */
    @Transactional
    public void deactivate(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ContentNotFoundException(CATEGORY, id));

        category.setIsActive(false);
        categoryRepository.save(category);
        log.info("Danh mục {} bị tắt", id);
    }
}
