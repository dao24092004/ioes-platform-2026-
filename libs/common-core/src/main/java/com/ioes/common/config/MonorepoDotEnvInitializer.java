package com.ioes.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * ApplicationContextInitializer that loads env vars from the monorepo root
 * <code>.env</code> file BEFORE Spring's placeholder resolution runs.
 *
 * <h2>Why</h2>
 *
 * ADR-008 (v1.2) mandates <b>single source of truth</b>: there is exactly one
 * <code>.env</code> at the monorepo root and <b>no</b> per-service
 * <code>services/&lt;svc&gt;/.env*</code> files. Node.js and Python helpers
 * walk up to find the root <code>.env</code>; this initializer gives the
 * same behaviour to every Spring Boot service that has
 * <code>common-core</code> on the classpath (which is all of them — api-gateway,
 * auth-service, content-service, notification-service, analytics-service,
 * config-server).
 *
 * <h2>How</h2>
 *
 * <ol>
 *   <li>Starting from <code>user.dir</code>, walk up the directory tree until
 *       we find a directory that contains <code>.env.example</code>. That
 *       directory is treated as the monorepo root.</li>
 *   <li>If a sibling <code>.env</code> exists, parse it (KEY=value lines,
 *       comments with <code>#</code>, quoted values).</li>
 *   <li>Push every parsed entry into Spring's environment under a
 *       {@link MapPropertySource} called <code>monorepoDotEnv</code>, so
 *       it becomes available to <code>${JWT_SECRET}</code> placeholders.</li>
 * </ol>
 *
 * <p>The initializer does NOT override values that the OS / JVM already set.
 * Existing environment wins, then process-level env, then this file. That's
 * the same precedence used by Node.js / Python loaders.</p>
 *
 * <h2>Registration</h2>
 *
 * Auto-registered via
 * <code>META-INF/spring/org.springframework.context.ApplicationContextInitializer.imports</code>
 * so every Spring Boot service picks it up without touching its
 * <code>main</code> class.
 *
 * <h2>Production behaviour</h2>
 *
 * In production (Kubernetes / Vault) the orchestrator injects env vars
 * directly into the JVM, so this initializer simply confirms the values are
 * present and exits without writing anything.
 */
@Slf4j
public class MonorepoDotEnvInitializer
        implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    /** PropertySource name visible in actuator/env output. */
    public static final String PROPERTY_SOURCE_NAME = "monorepoDotEnv";

    /** Marker file used to locate the monorepo root. */
    private static final String MARKER_FILE = ".env.example";

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment env = applicationContext.getEnvironment();
        Path monorepoRoot = findMonorepoRoot();
        if (monorepoRoot == null) {
            log.debug("Monorepo root not found (no .env.example). Skipping .env load.");
            return;
        }
        Path dotEnv = monorepoRoot.resolve(".env");
        if (!Files.isRegularFile(dotEnv)) {
            log.debug("Root .env not found at {} — relying on OS env only.", dotEnv);
            return;
        }

        Map<String, Object> props = new LinkedHashMap<>();
        try (BufferedReader reader = Files.newBufferedReader(dotEnv, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                int eq = trimmed.indexOf('=');
                if (eq < 1) {
                    continue;
                }
                String key = trimmed.substring(0, eq).trim();
                String value = trimmed.substring(eq + 1).trim();
                // Strip trailing inline comments ("value # comment"). Only treat '#'
                // as a comment when preceded by whitespace — otherwise it is part of
                // the value (e.g. a hex secret ending in '#').
                int hashIdx = indexOfUnquotedHash(value);
                if (hashIdx >= 0) {
                    value = value.substring(0, hashIdx).trim();
                }
                // Strip optional surrounding quotes ("value" / 'value')
                if (value.length() >= 2
                        && (value.charAt(0) == '"' && value.charAt(value.length() - 1) == '"'
                        || value.charAt(0) == '\'' && value.charAt(value.length() - 1) == '\'')) {
                    value = value.substring(1, value.length() - 1);
                }

                // Honour OS env precedence — never overwrite an existing var.
                if (System.getenv(key) != null) {
                    props.put(key, System.getenv(key));
                } else if (System.getProperty(key) != null) {
                    props.put(key, System.getProperty(key));
                } else {
                    props.put(key, value);
                }
            }
        } catch (IOException ioe) {
            log.warn("Failed to read monorepo .env at {}: {}", dotEnv, ioe.getMessage());
            return;
        }

        if (props.isEmpty()) {
            log.debug("Root .env at {} contained no usable entries.", dotEnv);
            return;
        }

        MapPropertySource source = new MapPropertySource(PROPERTY_SOURCE_NAME, props);
        env.getPropertySources().addLast(source);
        log.info(
                "Loaded {} entries from monorepo .env (root: {}). PropertySource: {}.",
                props.size(),
                monorepoRoot,
                PROPERTY_SOURCE_NAME
        );
    }

    /**
     * Walk up the directory tree starting from {@code user.dir} and return
     * the first directory that contains the {@link #MARKER_FILE}.
     *
     * <p>If we reach the filesystem root without finding the marker, fall
     * back to the directory holding the running JAR's class loader, then
     * to {@code user.dir}. This keeps the initializer benign in environments
     * where the project is shipped as a flat archive.</p>
     */
    private Path findMonorepoRoot() {
        Path start = Paths.get(System.getProperty("user.dir"));
        Path cursor = start.toAbsolutePath();
        Path fallback = cursor;
        while (cursor != null) {
            if (Files.isRegularFile(cursor.resolve(MARKER_FILE))) {
                return cursor;
            }
            fallback = cursor;
            cursor = cursor.getParent();
        }
        log.debug(
                "Marker .env.example not found above {}; using it as fallback root.",
                start
        );
        return fallback;
    }

    /**
     * Find the index of an unquoted '#' that signals an inline comment.
     * Treats '#' inside matching quote pairs as part of the value.
     */
    private static int indexOfUnquotedHash(String value) {
        boolean inDouble = false;
        boolean inSingle = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (c == '"' && !inSingle) {
                inDouble = !inDouble;
            } else if (c == '\'' && !inDouble) {
                inSingle = !inSingle;
            } else if (c == '#' && !inDouble && !inSingle) {
                // Treat '#' as comment start when preceded by whitespace;
                // otherwise it might be value content (rare).
                if (i == 0 || Character.isWhitespace(value.charAt(i - 1))) {
                    return i;
                }
            }
        }
        return -1;
    }
}