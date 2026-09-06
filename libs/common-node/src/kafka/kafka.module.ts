import { DynamicModule, Module, Provider, Global, Inject } from '@nestjs/common';
import { KafkaOptions, KAFKA_CLIENT } from './kafka.options';
import { KafkaProducer } from './kafka.producer';
import { KafkaConsumer } from './kafka.consumer';

export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  consumerGroupId?: string;
  ssl?: boolean;
  sasl?: KafkaOptions['sasl'];
}

/**
 * Global Kafka module - register 1 lần, share producer/consumer cho mọi feature module.
 *
 * ⚠️ Chỉ được import ở AppModule. Feature modules chỉ inject KafkaProducer/KafkaConsumer.
 */
@Global()
@Module({})
export class KafkaModule {
  static forRoot(options: KafkaModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: KAFKA_CLIENT,
      useValue: {
        clientId: options.clientId,
        brokers: options.brokers,
        consumerGroupId: options.consumerGroupId,
        ssl: options.ssl,
        sasl: options.sasl,
      } satisfies KafkaOptions,
    };

    return {
      module: KafkaModule,
      global: true,
      providers: [optionsProvider, KafkaProducer, KafkaConsumer],
      exports: [KafkaProducer, KafkaConsumer, KAFKA_CLIENT],
    };
  }
}