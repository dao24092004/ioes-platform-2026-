package com.ioes.content.infrastructure.persistence;

import com.ioes.content.domain.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaCategoryRepository extends JpaRepository<Category, UUID> {

    boolean existsBySlug(String slug);

    List<Category> findByIsActiveTrueOrderBySortOrderAscNameAsc();
}
