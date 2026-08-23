import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DgraphClient } from '@ioes/common-node';

@Module({
  controllers: [HealthController],
  providers: [DgraphClient],
  exports: [DgraphClient],
})
export class HealthModule {}
