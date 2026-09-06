import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BaseEventConsumer,
  EventEnvelope,
  EXAM_KAFKA_TOPICS,
  CourseEnrolledPayload,
  ProcessedEvent,
  KafkaConsumer,
  StructuredLogger,
} from '@ioes/common-node';

/**
 * CourseEventConsumer - consume course events từ content-service.
 *
 * Theo BA §3.1.2 (Module Content Management): khi user enroll vào course,
 * exam-suite cần biết để:
 * - Track user-course relationship cho adaptive learning
 * - Trigger AI-suite để generate learning path
 *
 * Topic: content.course.events
 * Group: exam-suite-course-consumer
 */
@Injectable()
export class CourseEventConsumer extends BaseEventConsumer<CourseEnrolledPayload> {
  protected readonly logger = new StructuredLogger(CourseEventConsumer.name);

  constructor(
    @InjectRepository(ProcessedEvent)
    processedRepo: Repository<ProcessedEvent>,
    kafka: KafkaConsumer,
  ) {
    super(
      processedRepo,
      kafka,
      EXAM_KAFKA_TOPICS.COURSE_EVENTS,
      'exam-suite-course-consumer',
      'CourseEventConsumer',
    );
  }

  protected async handleEvent(
    envelope: EventEnvelope<CourseEnrolledPayload>,
  ): Promise<void> {
    const { userId, courseId, enrolledAt, expiresAt } = envelope.payload;

    this.logger.log(
      `Course enrolled: userId=${userId} courseId=${courseId} enrolledAt=${enrolledAt} expiresAt=${expiresAt ?? 'never'}`,
    );

    // TODO: Save vào exam DB (vd: UserCourseLink)
    // await this.userCourseRepo.save({ userId, courseId, expiresAt });

    // TODO: Optionally call AI-suite để generate learning path
    // await this.aiClient.generateLearningPath(userId, courseId);
  }
}
