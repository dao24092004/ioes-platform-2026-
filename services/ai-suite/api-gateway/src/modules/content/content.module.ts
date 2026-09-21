import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContentClient } from './content.client';
import { CourseContextService } from './course-context.service';

/**
 * Cửa ngõ duy nhất sang content-service.
 *
 * Gợi ý khoá học và lộ trình học đều cần catalogue cùng ghi danh, nên client
 * nằm ở module riêng thay vì trong một trong hai — giống lý do tách
 * MlWorkerModule ra khỏi ChatModule.
 */
@Module({
  imports: [HttpModule],
  providers: [ContentClient, CourseContextService],
  exports: [ContentClient, CourseContextService],
})
export class ContentModule {}
