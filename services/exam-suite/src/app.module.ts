import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamSessionModule } from './modules/exam-session/exam-session.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.dev'] }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5433', 10),
        username: process.env.DB_USER ?? 'ioes_exam',
        password: process.env.DB_PASSWORD ?? 'ioes_exam',
        database: process.env.DB_NAME ?? 'ioes_exam',
        autoLoadEntities: true,
        // Dev mode: synchronize=true để bạn test không cần Flyway.
        // Production: set TYPEORM_SYNCHRONIZE=false (mặc định false).
        synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
      }),
    }),
    ExamSessionModule,
    SubmissionModule,
    HealthModule,
  ],
})
export class AppModule {}
