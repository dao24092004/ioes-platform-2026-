import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DgraphClient } from '../question-bank/dgraph.client';
import { QuestionBankModule } from '../question-bank/question-bank.module';

@Module({
  imports: [QuestionBankModule],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class HealthModule {}
