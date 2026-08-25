import { Injectable } from '@nestjs/common';
import { ApiResponse } from '@ioes/common-node';

@Injectable()
export class SubmissionService {
  async submit(examId: string, userId: string, answers: unknown): Promise<ApiResponse<any>> {
    // TODO: persist submission, trigger grading
    return ApiResponse.success({ examId, userId, status: 'submitted' });
  }
}
