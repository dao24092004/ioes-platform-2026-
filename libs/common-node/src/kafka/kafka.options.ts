/**
 * Injection tokens cho Kafka client + producer.
 * Dùng để inject KafkaOptions vào KafkaModule.forRootAsync().
 */
export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');
export const KAFKA_PRODUCER = Symbol('KAFKA_PRODUCER');
export const KAFKA_CONSUMER = Symbol('KAFKA_CONSUMER');

export interface KafkaOptions {
  clientId: string;
  brokers: string[];
  consumerGroupId?: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}
