import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamModule } from './modules/exam/exam.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { HealthModule } from './modules/health/health.module';
import { dbConfig } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
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
