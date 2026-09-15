package com.ioes.notification.domain.service;

import com.ioes.common.exception.ApiException;
import com.ioes.notification.domain.model.Notification;
import com.ioes.notification.domain.model.NotificationStats;
import com.ioes.notification.domain.model.NotificationTemplate;
import com.ioes.notification.domain.port.out.NotificationRepositoryPort;
import com.ioes.notification.domain.port.out.NotificationTemplatePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * The read side that used to be stubbed out: getNotification returned null for
 * every id, and neither stats nor templates existed at all.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceReadsTest {

    @Mock
    private NotificationRepositoryPort repositoryPort;

    @Mock
    private NotificationTemplatePort templatePort;

    @Mock
    private EmailSender emailSender;

    private NotificationService service;

    @BeforeEach
    void setUp() {
        service = new NotificationService(repositoryPort, templatePort, emailSender);
    }

    @Test
    @DisplayName("getNotification returns the row instead of null")
    void returnsTheRow() {
        UUID id = UUID.randomUUID();
        Notification notification = Notification.builder().id(id).subject("Welcome").build();
        when(repositoryPort.findById(id)).thenReturn(Optional.of(notification));

        assertThat(service.getNotification(id)).isSameAs(notification);
    }

    @Test
    @DisplayName("an unknown id is a 404 rather than a null body")
    void unknownIdIsNotFound() {
        UUID id = UUID.randomUUID();
        when(repositoryPort.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getNotification(id))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Notification not found");
    }

    @Test
    @DisplayName("stats come from the repository tallies")
    void statsDelegate() {
        NotificationStats stats = new NotificationStats(6, 1, 4, 1, 0, 5, 0, 0, 1);
        when(repositoryPort.stats()).thenReturn(stats);

        assertThat(service.stats()).isSameAs(stats);
    }

    @Test
    @DisplayName("templates come from the template port")
    void templatesDelegate() {
        List<NotificationTemplate> templates = List.of(new NotificationTemplate("welcome"));
        when(templatePort.list()).thenReturn(templates);

        assertThat(service.templates()).isEqualTo(templates);
    }
}
