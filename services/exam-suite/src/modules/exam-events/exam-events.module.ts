import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import {
  KafkaModule,
  KafkaConsumer,
  KafkaProducer,
  OutboxService,
  EventPublisher,
  OutboxEvent,
  ProcessedEvent,
} from '@ioes/common-node';
import { ExamEventsPublisher } from './exam-events.publisher';
import { UserEventConsumer } from './consumers/user-event.consumer';
import { CourseEventConsumer } from './consumers/course-event.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent, ProcessedEvent]),
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 3,
      }),
    }),
    KafkaModule.forRoot({
      clientId: process.env.KAFKA_CLIENT_ID ?? 'exam-suite',
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
      consumerGroupId:
        process.env.KAFKA_CONSUMER_GROUP_ID ?? 'exam-suite-events',
    }),
  ],
  providers: [
    KafkaProducer,
    KafkaConsumer,
    OutboxService,
    EventPublisher,
    ExamEventsPublisher,
    UserEventConsumer,
    CourseEventConsumer,
  ],
  exports: [ExamEventsPublisher, OutboxService, EventPublisher],
})
export class ExamEventsModule {}
