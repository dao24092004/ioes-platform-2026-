import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { ExamModule } from '../exam/exam.module';
import { OutboxEvent } from '../question-bank/entities/outbox-event.entity';
import { ProcessedEvent } from '../question-bank/entities/processed-event.entity';
import { Answer } from '../exam/entities/answer.entity';
import { AnswerSnapshot } from '../exam/entities/answer-snapshot.entity';
import { ExamAttempt } from '../exam/entities/exam-attempt.entity';
import { Question, QuestionOption } from '../question-bank/entities/question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutboxEvent,
      ProcessedEvent,
      Answer,
      AnswerSnapshot,
      ExamAttempt,
      Question,
      QuestionOption,
    ]),
    ExamModule,
  ],
  controllers: [SubmissionController],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}
