import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateModule } from './modules/certificate/certificate.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER ?? 'ioes_blockchain',
        password: process.env.DB_PASSWORD ?? 'ioes_blockchain',
        database: process.env.DB_NAME ?? 'ioes_blockchain',
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    CertificateModule,
    HealthModule,
  ],
})
export class AppModule {}
