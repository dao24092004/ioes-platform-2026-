package com.ioes.content.interfaces.rest;

import com.ioes.content.application.dto.CourseCommands;
import com.ioes.content.application.dto.CourseResponses.CategoryView;
import com.ioes.content.application.usecase.CategoryUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Danh mục khoá học, ở {@code /api/v1/categories}.
 *
 * <p>Đọc công khai (SecurityConfig cho phép GET không cần token) vì đây là phân
 * loại của catalogue; ghi thì chỉ quản trị.
 */
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryUseCase categoryUseCase;

    @GetMapping
    public List<CategoryView> list() {
        return categoryUseCase.listActive();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryView create(@Valid @RequestBody CourseCommands.CreateCategory command) {
        return categoryUseCase.create(command);
    }

    /** Tắt danh mục thay vì xoá, xem {@code CategoryUseCase#deactivate}. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        categoryUseCase.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
