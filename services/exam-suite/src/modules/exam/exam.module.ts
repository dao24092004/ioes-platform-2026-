import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamController, AttemptController } from './exam.controller';
import { ExamService } from './exam.service';
import { GradingService } from './grading.service';
import { ExamRepository } from './repositories/exam.repository';
import { AttemptRepository } from './repositories/attempt.repository';
import { Exam } from './entities/exam.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { Answer } from './entities/answer.entity';
import { AnswerSnapshot } from './entities/answer-snapshot.entity';
import { Question, QuestionOption } from '../question-bank/entities/question.entity';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { ExamEventsModule } from '../exam-events/exam-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamAttempt,
      Answer,
      AnswerSnapshot,
      Question,
      QuestionOption,
    ]),
    QuestionBankModule,
    ExamEventsModule,
  ],
  controllers: [ExamController, AttemptController],
  providers: [ExamService, GradingService, ExamRepository, AttemptRepository],
  exports: [
    ExamService,
    GradingService,
    ExamRepository,
    AttemptRepository,
  ],
})
export class ExamModule {}
