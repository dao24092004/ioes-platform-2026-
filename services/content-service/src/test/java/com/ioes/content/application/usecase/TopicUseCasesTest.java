package com.ioes.content.application.usecase;

import com.ioes.content.application.dto.CreateTopicCommand;
import com.ioes.content.application.dto.TopicResponse;
import com.ioes.content.application.dto.UpdateTopicCommand;
import com.ioes.content.application.port.TopicRepository;
import com.ioes.content.domain.event.TopicCreatedEvent;
import com.ioes.content.domain.event.TopicDeletedEvent;
import com.ioes.content.domain.event.TopicUpdatedEvent;
import com.ioes.content.domain.exception.InvalidTopicHierarchyException;
import com.ioes.content.domain.exception.TopicHasQuestionsException;
import com.ioes.content.domain.exception.TopicNotFoundException;
import com.ioes.content.domain.model.Topic;
import com.ioes.content.infrastructure.kafka.TopicEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TopicUseCasesTest {

    @Mock
    private TopicRepository topicRepository;

    @Mock
    private TopicEventPublisher eventPublisher;

    @InjectMocks
    private CreateTopicUseCase createTopicUseCase;

    @InjectMocks
    private UpdateTopicUseCase updateTopicUseCase;

    @InjectMocks
    private DeleteTopicUseCase deleteTopicUseCase;

    @InjectMocks
    private GetTopicUseCase getTopicUseCase;

    private static final String CORRELATION_ID = "test-correlation-id";

    @BeforeEach
    void setUp() {
        // Setup mocks
    }

    @Test
    void should_createTopic_when_commandIsValid() {
        // Given
        CreateTopicCommand command = CreateTopicCommand.builder()
                .name("Java Fundamentals")
                .description("Basic Java programming")
                .build();

        Topic savedTopic = Topic.builder()
                .id(UUID.randomUUID())
                .name("Java Fundamentals")
                .slug("java-fundamentals")
                .description("Basic Java programming")
                .level(0)
                .isActive(true)
                .build();

        when(topicRepository.save(any(Topic.class))).thenReturn(savedTopic);
        when(topicRepository.existsBySlug(anyString())).thenReturn(false);

        // When
        TopicResponse response = createTopicUseCase.execute(command, CORRELATION_ID);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Java Fundamentals");
        assertThat(response.getSlug()).isEqualTo("java-fundamentals");
        assertThat(response.getLevel()).isEqualTo(0);

        verify(topicRepository).save(any(Topic.class));
        verify(eventPublisher).publishTopicCreated(any(TopicCreatedEvent.class));
    }

    @Test
    void should_createSubTopic_when_parentTopicExists() {
        // Given
        UUID parentId = UUID.randomUUID();
        Topic parentTopic = Topic.builder()
                .id(parentId)
                .name("Programming")
                .level(0)
                .isActive(true)
                .build();

        CreateTopicCommand command = CreateTopicCommand.builder()
                .name("Java")
                .parentTopicId(parentId)
                .build();

        Topic savedTopic = Topic.builder()
                .id(UUID.randomUUID())
                .name("Java")
                .slug("java")
                .level(1)
                .parentTopic(parentTopic)
                .isActive(true)
                .build();

        when(topicRepository.findById(parentId)).thenReturn(Optional.of(parentTopic));
        when(topicRepository.existsBySlug(anyString())).thenReturn(false);
        when(topicRepository.save(any(Topic.class))).thenReturn(savedTopic);

        // When
        TopicResponse response = createTopicUseCase.execute(command, CORRELATION_ID);

        // Then
        assertThat(response.getLevel()).isEqualTo(1);
        assertThat(response.getParentTopicId()).isEqualTo(parentId);
    }

    @Test
    void should_throwException_when_parentTopicNotFound() {
        // Given
        UUID parentId = UUID.randomUUID();
        CreateTopicCommand command = CreateTopicCommand.builder()
                .name("Java")
                .parentTopicId(parentId)
                .build();

        when(topicRepository.findById(parentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> createTopicUseCase.execute(command, CORRELATION_ID))
                .isInstanceOf(TopicNotFoundException.class);
    }

    @Test
    void should_updateTopic_when_topicExists() {
        // Given
        UUID topicId = UUID.randomUUID();
        Topic existingTopic = Topic.builder()
                .id(topicId)
                .name("Old Name")
                .slug("old-name")
                .level(0)
                .isActive(true)
                .build();

        UpdateTopicCommand command = UpdateTopicCommand.builder()
                .name("New Name")
                .description("Updated description")
                .build();

        when(topicRepository.findById(topicId)).thenReturn(Optional.of(existingTopic));
        when(topicRepository.save(any(Topic.class))).thenReturn(existingTopic);

        // When
        TopicResponse response = updateTopicUseCase.execute(topicId, command, CORRELATION_ID);

        // Then
        assertThat(response.getName()).isEqualTo("New Name");
        verify(eventPublisher).publishTopicUpdated(any(TopicUpdatedEvent.class));
    }

    @Test
    void should_throwException_when_updateTopicNotFound() {
        // Given
        UUID topicId = UUID.randomUUID();
        UpdateTopicCommand command = UpdateTopicCommand.builder().name("New Name").build();

        when(topicRepository.findById(topicId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> updateTopicUseCase.execute(topicId, command, CORRELATION_ID))
                .isInstanceOf(TopicNotFoundException.class);
    }

    @Test
    void should_throwException_when_updateTopicIsOwnParent() {
        // Given
        UUID topicId = UUID.randomUUID();
        Topic topic = Topic.builder().id(topicId).name("Test").build();

        UpdateTopicCommand command = UpdateTopicCommand.builder()
                .parentTopicId(topicId)
                .build();

        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));

        // When & Then
        assertThatThrownBy(() -> updateTopicUseCase.execute(topicId, command, CORRELATION_ID))
                .isInstanceOf(InvalidTopicHierarchyException.class);
    }

    @Test
    void should_softDeleteTopic_when_topicExists() {
        // Given
        UUID topicId = UUID.randomUUID();
        Topic topic = Topic.builder()
                .id(topicId)
                .name("Test")
                .isActive(true)
                .build();

        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));
        when(topicRepository.countByParentTopicId(topicId)).thenReturn(0L);
        when(topicRepository.save(any(Topic.class))).thenReturn(topic);

        // When
        deleteTopicUseCase.execute(topicId, CORRELATION_ID);

        // Then
        ArgumentCaptor<Topic> topicCaptor = ArgumentCaptor.forClass(Topic.class);
        verify(topicRepository).save(topicCaptor.capture());
        assertThat(topicCaptor.getValue().getIsActive()).isFalse();
        assertThat(topicCaptor.getValue().getDeletedAt()).isNotNull();

        verify(eventPublisher).publishTopicDeleted(any(TopicDeletedEvent.class));
    }

    @Test
    void should_throwException_when_deleteTopicHasChildren() {
        // Given
        UUID topicId = UUID.randomUUID();
        Topic topic = Topic.builder().id(topicId).name("Test").build();

        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));
        when(topicRepository.countByParentTopicId(topicId)).thenReturn(3L);

        // When & Then
        assertThatThrownBy(() -> deleteTopicUseCase.execute(topicId, CORRELATION_ID))
                .isInstanceOf(TopicHasQuestionsException.class);

        verify(eventPublisher, never()).publishTopicDeleted(any());
    }

    @Test
    void should_returnTrue_when_topicExists() {
        // Given
        UUID topicId = UUID.randomUUID();
        Topic topic = Topic.builder().id(topicId).name("Test").build();
        when(topicRepository.findById(topicId)).thenReturn(Optional.of(topic));

        // When
        boolean exists = getTopicUseCase.exists(topicId);

        // Then
        assertThat(exists).isTrue();
    }

    @Test
    void should_returnFalse_when_topicDoesNotExist() {
        // Given
        UUID topicId = UUID.randomUUID();
        when(topicRepository.findById(topicId)).thenReturn(Optional.empty());

        // When
        boolean exists = getTopicUseCase.exists(topicId);

        // Then
        assertThat(exists).isFalse();
    }
}