package com.ioes.auth.infrastructure.persistence.repository;

import com.ioes.auth.domain.model.UserSearchCriteria;
import com.ioes.auth.infrastructure.persistence.entity.UserEntity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Criteria translation for the admin user list.
 *
 * <p>Built as a {@link Specification} rather than a JPQL string with nullable
 * parameters: {@code role} and {@code status} map to Postgres enum types
 * ({@code user_role}, {@code user_status}), and a bound {@code NULL} against
 * those columns leaves the driver without a type to infer.
 */
public final class UserSpecifications {

    private UserSpecifications() {
    }

    public static Specification<UserEntity> matching(UserSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Soft-deleted users are gone as far as the admin table is concerned.
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (criteria.role() != null) {
                predicates.add(cb.equal(root.get("role"), criteria.role()));
            }
            if (criteria.status() != null) {
                predicates.add(cb.equal(root.get("status"), criteria.status()));
            }
            if (criteria.search() != null) {
                String pattern = "%" + criteria.search().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
