package com.ioes.content.domain.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The {@code topics.path} column is {@code ltree} (ADR-012, V2__topics.sql).
 * Postgres only accepts {@code [A-Za-z0-9_]} inside a label and {@code .} as the
 * separator, so every segment this entity builds has to survive that rule —
 * a raw {@code UUID.toString()} does not, because of its hyphens.
 */
class TopicPathLabelTest {

    /** One ltree label: at least one character, letters/digits/underscore only. */
    private static final Pattern LABEL = Pattern.compile("[A-Za-z0-9_]+");

    private static Topic topic(UUID id) {
        Topic topic = new Topic();
        topic.setId(id);
        topic.setLevel(0);
        return topic;
    }

    @Test
    @DisplayName("pathLabel strips the hyphens that ltree rejects")
    void pathLabelIsALegalLtreeLabel() {
        String label = Topic.pathLabel(UUID.fromString("3f1a7c58-1b2d-4e6f-8a90-0c1d2e3f4a5b"));

        assertThat(label).doesNotContain("-");
        assertThat(label).matches(LABEL);
        assertThat(label).isEqualTo("t3f1a7c58_1b2d_4e6f_8a90_0c1d2e3f4a5b");
    }

    @Test
    @DisplayName("pathLabel keeps distinct ids distinct")
    void pathLabelIsInjective() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();

        assertThat(Topic.pathLabel(first)).isNotEqualTo(Topic.pathLabel(second));
    }

    @Test
    @DisplayName("a root topic gets a single-label path")
    void rootPathIsOneLabel() {
        UUID id = UUID.randomUUID();
        Topic root = topic(id);

        root.prePersist();

        assertThat(root.getPath()).isEqualTo(Topic.pathLabel(id));
        assertThat(root.getPath()).matches(LABEL);
        assertThat(root.getLevel()).isZero();
    }

    @Test
    @DisplayName("a child path appends its own label to the parent path")
    void childPathExtendsParentPath() {
        UUID parentId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();

        Topic parent = topic(parentId);
        parent.prePersist();

        Topic child = topic(childId);
        child.setParentTopic(parent);
        child.prePersist();

        assertThat(child.getPath())
                .isEqualTo(parent.getPath() + "." + Topic.pathLabel(childId));
        assertThat(child.getLevel()).isEqualTo(1);
    }

    @Test
    @DisplayName("every segment of a three-level path is a legal label")
    void everySegmentOfADeepPathIsALegalLabel() {
        Topic root = topic(UUID.randomUUID());
        root.prePersist();

        Topic middle = topic(UUID.randomUUID());
        middle.setParentTopic(root);
        middle.prePersist();

        Topic leaf = topic(UUID.randomUUID());
        leaf.setParentTopic(middle);
        leaf.prePersist();

        assertThat(leaf.getPath().split("\\.")).hasSize(3).allSatisfy(
                segment -> assertThat(segment).matches(LABEL));
        assertThat(leaf.getLevel()).isEqualTo(2);
    }

    @Test
    @DisplayName("an explicitly set path is left alone")
    void explicitPathIsPreserved() {
        Topic root = topic(UUID.randomUUID());
        root.setPath("root");

        root.prePersist();

        assertThat(root.getPath()).isEqualTo("root");
    }
}
