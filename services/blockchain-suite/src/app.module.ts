import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateModule } from './modules/certificate/certificate.module';
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
        synchronize: false,
      }),
    }),
    CertificateModule,
    HealthModule,
  ],
})
export class AppModule {}
