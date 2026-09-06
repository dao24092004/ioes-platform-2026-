import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BaseEventConsumer,
  EventEnvelope,
  EXAM_KAFKA_TOPICS,
  UserRegisteredPayload,
  ProcessedEvent,
  KafkaConsumer,
  StructuredLogger,
} from '@ioes/common-node';

/**
 * UserEventConsumer - consume user events từ auth-service.
 *
 * Theo BA §3.1.1 (Module Auth): khi user đăng ký, exam-suite cần biết
 * để:
 * - Tạo UserProfile exam-side (nếu cần cho adaptive learning)
 * - Track user cho analytics
 *
 * Topic: auth.user.events
 * Group: exam-suite-user-consumer
 */
@Injectable()
export class UserEventConsumer extends BaseEventConsumer<UserRegisteredPayload> {
  protected readonly logger = new StructuredLogger(UserEventConsumer.name);

  constructor(
    @InjectRepository(ProcessedEvent)
    processedRepo: Repository<ProcessedEvent>,
    kafka: KafkaConsumer,
  ) {
    super(
      processedRepo,
      kafka,
      EXAM_KAFKA_TOPICS.USER_EVENTS,
      'exam-suite-user-consumer',
      'UserEventConsumer',
    );
  }

  protected async handleEvent(
    envelope: EventEnvelope<UserRegisteredPayload>,
  ): Promise<void> {
    const { userId, email, fullName, role } = envelope.payload;

    this.logger.log(
      `User registered: id=${userId} email=${email} role=${role} name=${fullName ?? 'N/A'}`,
    );

    // TODO Phase 2: Save vào exam DB nếu cần (vd: exam-specific preferences)
    // await this.userProfileRepo.save({ userId, email, role });
  }
}
