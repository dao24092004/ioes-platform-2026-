# IOES Common Library (Java)

Shared library for all Java microservices in the IOES platform
(`auth-service`, `content-service`, `analytics-service`, `notification-service`,
`api-gateway`, plus discovery-service and config-server).

## Purpose

Avoid duplicating low-level infrastructure across Java services. Each
service imports a consistent set of DTOs, events, Kafka helpers, security
filters, and utilities so the team can focus on business logic.

## What's inside

| Package | Contents |
|---|---|
| `dto/` | `ApiResponse<T>`, `UserPrincipal` (set on JWT claims) |
| `exception/` | `ApiException` + `GlobalExceptionHandler` (auto-wired by `@RestControllerAdvice`) |
| `security/` | `JwtTokenProvider` (`generateAccessToken`, `validateToken`, `getUserPrincipalFromToken`) |
| `event/` | `EventEnvelope`, `DomainEvent` (marker), `EventPublisher` (port), `EventResult` |
| `kafka/` | `KafkaConfig`, `KafkaTopicConfig`, `KafkaEventPublisher`, `AbstractKafkaConsumer` |
| `config/` | `WebClientConfig`, `CorsConfig`, `ObjectMapperConfig`, `FeignConfig` |
| `constant/` | `ErrorCodes`, `KafkaTopics`, `KafkaGroups`, `Roles`, `HttpHeaders` |
| `util/` | `PageUtils`, `DateUtils`, `ValidationUtils`, `RequestUtils`, `IdUtils` |
| `audit/` | `AuditableEntity`, `AuditorAwareImpl`, `JpaAuditingConfig` |

## Quick usage

### 1. Build it

```bash
mvn -pl libs/common-library -am clean install
```

### 2. In a service `pom.xml`

```xml
<dependency>
    <groupId>com.ioes</groupId>
    <artifactId>common-library</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 3. Publish a domain event

```java
// 1. Define the event payload (record implementing DomainEvent)
public record UserRegisteredEvent(
        UUID userId, String email, String fullName, Instant registeredAt)
        implements DomainEvent {
    public String aggregateId()   { return userId.toString(); }
    public String aggregateType() { return "User"; }
    public String eventType()     { return "UserRegistered"; }
}

// 2. Inject the publisher and call it
@RequiredArgsConstructor
public class RegisterUserService {
    private final EventPublisher publisher;

    public User register(RegisterCommand cmd) {
        User user = userRepository.save(...);
        publisher.publish(
                new UserRegisteredEvent(user.getId(), user.getEmail(), user.getFullName(), Instant.now()),
                "auth-service");
        return user;
    }
}
```

### 4. Consume a domain event

```java
@Component
public class UserEventConsumer extends AbstractKafkaConsumer {

    public UserEventConsumer() {
        on("auth.user.registered", this::handleUserRegistered);
    }

    @KafkaListener(topics = "auth.user.registered",
                   groupId = "content-service")
    public void listen(ConsumerRecord<String, EventEnvelope<?>> record, Acknowledgment ack) {
        dispatch(record, ack);
    }

    private void handleUserRegistered(EventEnvelope<?> env) {
        // payload is a LinkedHashMap - convert to your DTO
        UserRegisteredEvent payload = objectMapper.convertValue(
                env.getPayload(), UserRegisteredEvent.class);
        log.info("Welcome email queued for {}", payload.email());
    }
}
```

### 5. Audited entity

```java
@Entity
@Table(name = "courses")
public class CourseEntity extends AuditableEntity {
    @Id @GeneratedValue private UUID id;
    private String title;
    // createdAt, updatedAt, createdBy, updatedBy auto-populated
}
```

## Tests

```bash
mvn -pl libs/common-library test
```

## Mandatory wiring

Every Java service that uses this library should:

1. Annotate the application class with `@SpringBootApplication`
   (auto-scans this library).
2. Add `@EnableJpaAuditing(auditorAwareRef = "auditorAwareImpl")` if it
   uses JPA entities (already exposed via `JpaAuditingConfig`).
3. Configure `spring.kafka.bootstrap-servers` in `application.yml`.

See `services/auth-service` for a complete example.
