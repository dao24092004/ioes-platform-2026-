import { Module } from '@nestjs/common';
import { MlWorkerModule } from '../ml-worker/ml-worker.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

/** Sinh câu hỏi kiểm tra từ học liệu. Không lưu — ngân hàng đề ở exam-suite. */
@Module({
  imports: [MlWorkerModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
