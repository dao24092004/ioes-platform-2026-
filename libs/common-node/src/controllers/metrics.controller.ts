import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { registry } from '../metrics/registry';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Res() res: Response): Promise<void> {
    const output = registry.serialize();
    res.send(output);
  }
}
