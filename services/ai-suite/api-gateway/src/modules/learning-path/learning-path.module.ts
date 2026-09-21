import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentModule } from '../content/content.module';
import { MlWorkerModule } from '../ml-worker/ml-worker.module';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathController } from './learning-path.controller';
import { LearningPathService } from './learning-path.service';

/** FR-AI-005 — sinh và lưu lộ trình học cá nhân hoá. */
@Module({
  imports: [
    TypeOrmModule.forFeature([LearningPath]),
    ContentModule,
    MlWorkerModule,
  ],
  controllers: [LearningPathController],
  providers: [LearningPathService],
  exports: [LearningPathService],
})
export class LearningPathModule {}
