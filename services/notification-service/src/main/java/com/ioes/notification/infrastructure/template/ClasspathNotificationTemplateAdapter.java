package com.ioes.notification.infrastructure.template;

import com.ioes.notification.domain.model.NotificationTemplate;
import com.ioes.notification.domain.port.out.NotificationTemplatePort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * Lists the Thymeleaf templates on the classpath.
 *
 * <p>Reads the same location the view resolver renders from, so the listing
 * cannot drift from what {@code sendTemplated} will actually accept. The
 * {@code classpath*:} pattern works from an exploded target/classes and from
 * inside the packaged jar alike.
 */
@Slf4j
@Component
public class ClasspathNotificationTemplateAdapter implements NotificationTemplatePort {

    /** Matches spring.thymeleaf's default prefix and suffix. */
    static final String TEMPLATE_PATTERN = "classpath*:/templates/*.html";

    private static final String SUFFIX = ".html";

    private final ResourcePatternResolver resolver;

    public ClasspathNotificationTemplateAdapter() {
        this(new PathMatchingResourcePatternResolver());
    }

    ClasspathNotificationTemplateAdapter(ResourcePatternResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public List<NotificationTemplate> list() {
        Resource[] resources;
        try {
            resources = resolver.getResources(TEMPLATE_PATTERN);
        } catch (IOException ex) {
            // A missing templates directory is a legitimate state (nothing
            // templated has been added yet), not a reason to fail the request.
            log.warn("Could not scan {}: {}", TEMPLATE_PATTERN, ex.getMessage());
            return List.of();
        }

        return Arrays.stream(resources)
                .map(Resource::getFilename)
                .filter(name -> name != null && name.endsWith(SUFFIX))
                .map(name -> name.substring(0, name.length() - SUFFIX.length()))
                .distinct()
                .sorted(Comparator.naturalOrder())
                .map(NotificationTemplate::new)
                .toList();
    }
}
