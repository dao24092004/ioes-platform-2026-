import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { MlWorkerModule } from '../ml-worker/ml-worker.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

/** FR-AI-002 — gợi ý khoá học. Không lưu gì: kết quả tính lại mỗi lần, có cache ngắn. */
@Module({
  imports: [ContentModule, MlWorkerModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
