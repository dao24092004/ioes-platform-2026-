import { Injectable } from '@nestjs/common';
import { ApiResponse, EventPublisher } from '@ioes/common-node';

@Injectable()
export class CertificateService {
  constructor(private readonly eventPublisher: EventPublisher) {}

  async issue(userId: string, courseId: string): Promise<ApiResponse<any>> {
    // TODO: sign on chain via ethers.js, persist record
    return ApiResponse.success({ userId, courseId, status: 'issued' });
  }

  async verify(tokenId: string): Promise<ApiResponse<any>> {
    // TODO: query chain for proof
    return ApiResponse.success({ tokenId, status: 'verified' });
  }
}
