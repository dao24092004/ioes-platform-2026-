package com.ioes.content.domain.model;

import jakarta.persistence.*;
import lombok.*;
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

    @Column(name = "path", length = 1000)
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
            this.path = this.parentTopic.getPath() + "." + this.id;
        } else if (this.path == null) {
            this.path = this.id.toString();
        }
        if (this.level == 0 && this.parentTopic != null) {
            this.level = this.parentTopic.getLevel() + 1;
        }
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
