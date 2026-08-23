import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse as ApiDocResponse, ApiTags } from '@nestjs/swagger';
import { Public, ApiResponse } from '@ioes/common-node';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Trả về `{ status: "ok" }` nếu service đang chạy. Không cần auth.',
  })
  @ApiDocResponse({
    status: 200,
    description: 'Service đang live.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: { status: { type: 'string', example: 'ok' } },
        },
        message: { type: 'string', example: null },
        timestamp: { type: 'string', example: '2026-08-23T10:00:00.000Z' },
      },
    },
  })
  check(): ApiResponse<{ status: string }> {
    return ApiResponse.success({ status: 'ok' });
  }
}
