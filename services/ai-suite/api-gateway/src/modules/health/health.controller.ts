import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@ioes/common-node';
import { appConfig } from '../../config/app.config';

@Controller('health')
export class HealthController {
  @Get()
  check(): ApiResponse<{ status: string; service: string; version: string }> {
    return ApiResponse.success({
      status: 'ok',
      service: appConfig.name,
      version: appConfig.version,
    });
  }
}
