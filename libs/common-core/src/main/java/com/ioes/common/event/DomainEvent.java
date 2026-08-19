package com.ioes.common.event;

/**
 * Marker interface for every domain event payload.
 * <p>
 * Naming convention: past-tense verb phrase (UserRegistered, ExamSubmitted,
 * CourseEnrolled). Each event payload must be a Java record or immutable POJO.
 */
public interface DomainEvent {
    /**
     * @return the aggregate ID this event is about (e.g. the userId).
     */
    String aggregateId();

    /**
     * @return the aggregate type (e.g. "User", "Course", "Exam").
     */
    String aggregateType();

    /**
     * @return the event type name (e.g. "UserRegistered"). Must match the
     *         consumer's {@code @KafkaListener} topic / handler routing key.
     */
    String eventType();
}