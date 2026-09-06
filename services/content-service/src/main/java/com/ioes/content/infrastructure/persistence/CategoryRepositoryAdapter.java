package com.ioes.content.infrastructure.persistence;

import com.ioes.content.application.port.CategoryRepository;
import com.ioes.content.domain.model.Category;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CategoryRepositoryAdapter implements CategoryRepository {

    private final JpaCategoryRepository jpaRepository;

    @Override
    public Category save(Category category) {
        return jpaRepository.save(category);
    }

    @Override
    public Optional<Category> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return jpaRepository.existsBySlug(slug);
    }

    @Override
    public List<Category> findActive() {
        return jpaRepository.findByIsActiveTrueOrderBySortOrderAscNameAsc();
    }
}
