import { Controller, Get } from '@nestjs/common';
import { Public, ApiResponse } from '@ioes/common-node';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check(): ApiResponse<{ status: string }> {
    return ApiResponse.success({ status: 'ok' });
  }
}
