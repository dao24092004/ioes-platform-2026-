package com.ioes.notification.infrastructure.template;

import com.ioes.notification.domain.model.NotificationTemplate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ClasspathNotificationTemplateAdapterTest {

    /** A resource that only has to answer getFilename(). */
    private static Resource named(String filename) {
        return new ByteArrayResource(new byte[0]) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }

    private static ClasspathNotificationTemplateAdapter withResources(Resource... resources) {
        return new ClasspathNotificationTemplateAdapter(new StubResolver(resources, null));
    }

    @Test
    @DisplayName("finds the templates that ship with the service")
    void findsRealTemplates() {
        List<NotificationTemplate> templates = new ClasspathNotificationTemplateAdapter().list();

        assertThat(templates).extracting(NotificationTemplate::name)
                .contains("welcome", "exam-passed", "exam-failed");
    }

    @Test
    @DisplayName("the .html suffix is stripped, so the name is what sendTemplated takes")
    void stripsTheSuffix() {
        List<NotificationTemplate> templates = withResources(named("welcome.html")).list();

        assertThat(templates).containsExactly(new NotificationTemplate("welcome"));
    }

    @Test
    @DisplayName("names come back sorted")
    void sortsByName() {
        List<NotificationTemplate> templates = withResources(
                named("welcome.html"), named("exam-passed.html"), named("account.html")).list();

        assertThat(templates).extracting(NotificationTemplate::name)
                .containsExactly("account", "exam-passed", "welcome");
    }

    @Test
    @DisplayName("a duplicate on the classpath is listed once")
    void deduplicates() {
        List<NotificationTemplate> templates =
                withResources(named("welcome.html"), named("welcome.html")).list();

        assertThat(templates).containsExactly(new NotificationTemplate("welcome"));
    }

    @Test
    @DisplayName("non-html and unnamed resources are ignored")
    void ignoresNonTemplates() {
        List<NotificationTemplate> templates = withResources(
                named("welcome.html"), named("notes.txt"), named(null)).list();

        assertThat(templates).containsExactly(new NotificationTemplate("welcome"));
    }

    @Test
    @DisplayName("an unscannable classpath yields an empty list, not a failed request")
    void survivesAScanFailure() {
        ClasspathNotificationTemplateAdapter adapter = new ClasspathNotificationTemplateAdapter(
                new StubResolver(null, new IOException("no templates directory")));

        assertThat(adapter.list()).isEmpty();
    }

    /** Returns fixed resources, or throws, without touching the real classpath. */
    private record StubResolver(Resource[] resources, IOException failure)
            implements ResourcePatternResolver {

        @Override
        public Resource[] getResources(String locationPattern) throws IOException {
            if (failure != null) {
                throw failure;
            }
            return resources;
        }

        @Override
        public Resource getResource(String location) {
            throw new UnsupportedOperationException();
        }

        @Override
        public ClassLoader getClassLoader() {
            return getClass().getClassLoader();
        }
    }
}
