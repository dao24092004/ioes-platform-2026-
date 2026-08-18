import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  ApiResponse,
  UserPrincipalDto,
} from '@ioes/common-node';
import { ExamService } from './exam.service';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get()
  @Roles('STUDENT', 'INSTRUCTOR')
  async list(@CurrentUser() user: UserPrincipalDto): Promise<ApiResponse<any[]>> {
    return this.examService.list(user.userId);
  }
}
