import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from '../config/app.config';

/**
 * Kết nối PostgreSQL ioes_ai.
 *
 * synchronize luôn để false — lược đồ do migration trong
 * database/migrations/ai/ nắm giữ, theo PROJECT_RULES §4.3. Bật synchronize
 * sẽ khiến TypeORM tự sửa bảng và ghi đè migration.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres' as const,
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        autoLoadEntities: true,
        synchronize: false,
        extra: { max: dbConfig.poolMax },
      }),
    }),
  ],
})
export class DatabaseModule {}
