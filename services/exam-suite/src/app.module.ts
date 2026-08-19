import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamModule } from './modules/exam/exam.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5433', 10),
        username: process.env.DB_USER ?? 'ioes_exam',
        password: process.env.DB_PASSWORD ?? 'ioes_exam',
        database: process.env.DB_NAME ?? 'ioes_exam',
        autoLoadEntities: true,
        synchronize: false, // Flyway owns schema
      }),
    }),
    ExamModule,
    SubmissionModule,
    HealthModule,
  ],
})
export class AppModule {}
