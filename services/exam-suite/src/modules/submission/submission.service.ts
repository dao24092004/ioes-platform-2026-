import { Injectable } from '@nestjs/common';
import { ApiResponse, EventPublisher } from '@ioes/common-node';

@Injectable()
export class SubmissionService {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async submit(examId: string, userId: string, answers: unknown): Promise<ApiResponse<any>> {
    // TODO: persist submission, trigger grading
    return ApiResponse.success({ examId, userId, status: 'submitted' });
  }
}
