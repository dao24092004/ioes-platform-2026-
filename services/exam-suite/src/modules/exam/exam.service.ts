import { Injectable } from '@nestjs/common';
import { ApiResponse } from '@ioes/common-node';

@Injectable()
export class ExamService {
  async list(_userId: string): Promise<ApiResponse<any[]>> {
    // TODO: query from DB
    return ApiResponse.success([]);
  }
}
