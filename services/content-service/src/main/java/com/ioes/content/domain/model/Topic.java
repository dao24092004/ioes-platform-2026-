package com.ioes.content.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "topics")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_topic_id")
    private Topic parentTopic;

    @OneToMany(mappedBy = "parentTopic", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Topic> subTopics = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private Integer level = 0;

    /**
     * Materialized path, one {@code ltree} label per ancestor (ADR-012).
     *
     * <p>{@code ltree} is a Postgres extension type, so the column is bound as
     * {@link SqlTypes#OTHER} — the same shape the repo already uses for other
     * vendor types (see {@code UserEntity.role}, {@code NotificationEntity.metadata}).
     * That is what lets {@code ddl-auto: validate} pass; mapping it as a plain
     * varchar made Hibernate expect {@code varchar} and fail against {@code ltree}.
     * The write transformer casts the bound string so Postgres accepts it.
     */
    @Column(name = "path", columnDefinition = "ltree")
    @JdbcTypeCode(SqlTypes.OTHER)
    @ColumnTransformer(read = "path::text", write = "?::ltree")
    private String path;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    public void prePersist() {
        if (this.path == null && this.parentTopic != null) {
            this.path = this.parentTopic.getPath() + "." + pathLabel(this.id);
        } else if (this.path == null) {
            this.path = pathLabel(this.id);
        }
        if (this.level == 0 && this.parentTopic != null) {
            this.level = this.parentTopic.getLevel() + 1;
        }
    }

    /**
     * Renders one id as a legal {@code ltree} label.
     *
     * <p>An ltree label may only contain {@code [A-Za-z0-9_]}, so the hyphens in
     * a UUID have to go — the previous {@code id.toString()} form could never be
     * stored in the {@code ltree} column the migration declares. The leading
     * {@code t} keeps the label readable as a topic id rather than a bare hex run.
     */
    static String pathLabel(UUID id) {
        return "t" + id.toString().replace('-', '_');
    }

    public void softDelete() {
        this.isActive = false;
        this.deletedAt = Instant.now();
    }

    public boolean hasSubTopics() {
        return subTopics != null && !subTopics.isEmpty();
    }

    public boolean isRootTopic() {
        return parentTopic == null;
    }
}
