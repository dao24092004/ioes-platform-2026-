import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MlWorkerClient } from './ml-worker.client';

/**
 * Client dùng chung cho ml-worker.
 *
 * Tách khỏi ChatModule khi thêm phần sinh câu hỏi: hai module đều gọi
 * ml-worker, mà để client nằm trong ChatModule thì QuestionsModule phải import
 * ChatModule — một phụ thuộc không có thật.
 */
@Module({
  imports: [HttpModule],
  providers: [MlWorkerClient],
  exports: [MlWorkerClient],
})
export class MlWorkerModule {}
