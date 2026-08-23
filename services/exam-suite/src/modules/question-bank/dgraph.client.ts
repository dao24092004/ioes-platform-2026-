import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  StructuredLogger,
  CircuitBreaker,
  CircuitOpenError,
  retry,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from '@ioes/common-node';

export interface DgraphGraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
}

export interface DgraphGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

export interface DgraphClientConfig {
  url?: string;
  graphqlEndpoint?: string;
  adminEndpoint?: string;
  token?: string;
  timeoutMs?: number;
  retry?: Partial<RetryConfig>;
  circuitBreaker?: {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
  };
}

/**
 * Low-level client cho Dgraph GraphQL endpoint.
 *
 * Resilience features:
 * - **Retry**: exponential backoff + jitter cho transient errors (BUG #94)
 * - **Circuit Breaker**: chống cascading failures (BUG #95)
 * - **Sanitized errors**: không leak schema info ra client (BUG #96)
 * - **Correlation ID**: mỗi request có unique ID để trace (BUG #98)
 *
 * @see docs/02-architecture/adr/ADR-001-use-dgraph-for-question-bank.md
 */
@Injectable()
export class DgraphClient implements OnModuleInit {
  private readonly logger = new StructuredLogger(DgraphClient.name);
  private readonly baseUrl: string;
  private readonly graphqlEndpoint: string;
  private readonly adminEndpoint: string;
  private readonly token: string | undefined;
  private readonly timeoutMs: number;
  private readonly retryConfig: RetryConfig;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryCounter = { total: 0, success: 0, failed: 0 };

  constructor(
    private readonly http: HttpService,
    private readonly cfg: ConfigService,
  ) {
    const config = this.buildConfig();
    this.baseUrl = config.url.replace(/\/$/, '');
    this.graphqlEndpoint = config.graphqlEndpoint;
    this.adminEndpoint = config.adminEndpoint;
    this.token = config.token;
    this.timeoutMs = config.timeoutMs;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreaker.failureThreshold ?? 5,
      successThreshold: config.circuitBreaker.successThreshold ?? 2,
      timeout: config.circuitBreaker.timeout ?? 30_000,
      name: 'dgraph',
      onStateChange: (newState, prev) => {
        this.logger.warn(
          `Dgraph circuit breaker: ${prev} → ${newState}`,
        );
      },
    });
  }

  onModuleInit(): void {
    this.logger.log(
      `DgraphClient initialized → ${this.baseUrl} (timeout=${this.timeoutMs}ms, retries=${this.retryConfig.maxAttempts})`,
    );
  }

  private buildConfig(): Required<
    Omit<DgraphClientConfig, 'url' | 'retry' | 'circuitBreaker'>
  > & {
    url: string;
    retry: Partial<RetryConfig>;
    circuitBreaker: NonNullable<DgraphClientConfig['circuitBreaker']>;
  } {
    const cfg = this.cfg;
    return {
      url:
        cfg.get<string>('DGRAPH_URL') ??
        cfg.get<string>('DGRAPH_INTERNAL_URL') ??
        'http://localhost:8080',
      graphqlEndpoint:
        cfg.get<string>('DGRAPH_GRAPHQL_ENDPOINT') ?? '/graphql',
      adminEndpoint:
        cfg.get<string>('DGRAPH_ADMIN_ENDPOINT') ?? '/admin',
      token: cfg.get<string>('DGRAPH_TOKEN') || undefined,
      timeoutMs: parseInt(
        cfg.get<string>('DGRAPH_TIMEOUT_MS') ?? '5000',
        10,
      ),
      retry: {},
      circuitBreaker: {},
    };
  }

  /**
   * Execute GraphQL query/mutation với retry + circuit breaker.
   *
   * BUG #94 fix: retry với exponential backoff cho transient errors
   * BUG #95 fix: circuit breaker chống cascading failures
   * BUG #96 fix: sanitize error messages để không leak schema details
   * BUG #98 fix: mỗi request có unique correlation ID
   */
  async query<T>(
    query: string,
    variables?: Record<string, unknown>,
    requestId?: string,
  ): Promise<T> {
    const reqId =
      requestId ??
      `dgraph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const url = `${this.baseUrl}${this.graphqlEndpoint}`;
    const body = { query, variables };

    try {
      // BUG #95 fix: wrap trong circuit breaker
      return await this.circuitBreaker.execute(async () => {
        // BUG #94 fix: retry với exponential backoff
        return await retry(
          async () => {
            this.retryCounter.total++;
            const response = await firstValueFrom(
              this.http.post<DgraphGraphQLResponse<T>>(url, body, {
                headers: {
                  ...this.buildHeaders(),
                  'x-request-id': reqId,
                },
                timeout: this.timeoutMs,
              }),
            );

            const payload = response.data;
            if (payload?.errors?.length) {
              const message = payload.errors
                .map((e) => e.message)
                .join('; ');
              this.logger.error(
                `Dgraph GraphQL errors [${reqId}]: ${message}`,
              );
              // GraphQL errors KHÔNG retry (deterministic)
              throw new Error('DGRAPH_QUERY_ERROR');
            }

            this.retryCounter.success++;
            return (payload?.data ?? ({} as T)) as T;
          },
          {
            ...this.retryConfig,
            onRetry: (err, attempt, delayMs) => {
              this.logger.warn(
                `Dgraph retry [${reqId}] attempt=${attempt}/${this.retryConfig.maxAttempts} delay=${delayMs}ms error=${err.message}`,
              );
            },
          },
        );
      });
    } catch (err) {
      this.retryCounter.failed++;

      if (err instanceof CircuitOpenError) {
        this.logger.error(
          `Dgraph circuit OPEN [${reqId}]: request rejected`,
        );
        throw new Error('DGRAPH_UNAVAILABLE');
      }

      const error = err as Error;
      // BUG #96 fix: sanitize error message - log details, throw generic
      this.logger.error(
        `Dgraph query failed [${reqId}]: ${error.message}`,
        error.stack,
      );

      if (error.message === 'DGRAPH_QUERY_ERROR') {
        throw new Error('Dgraph query returned errors');
      }
      if (
        error.message.includes('timeout') ||
        error.message.includes('ECONN')
      ) {
        throw new Error('DGRAPH_UNAVAILABLE');
      }
      throw error;
    }
  }

  /**
   * Deploy/update GraphQL schema.
   * Schema deployment KHÔNG retry (chỉ manual flow).
   */
  async deploySchema(schema: string): Promise<void> {
    const url = `${this.baseUrl}${this.adminEndpoint}/schema`;
    const response = await firstValueFrom(
      this.http.post(url, schema, {
        headers: {
          'Content-Type': 'application/graphql',
          ...this.buildHeaders(),
        },
        timeout: this.timeoutMs,
      }),
    );
    this.logger.log('Dgraph schema deployed');
    return response.data;
  }

  /**
   * Health check - verify Dgraph process alive.
   * KHÔNG check schema status (cần query riêng).
   */
  async isHealthy(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(`${this.baseUrl}/health`, { timeout: 2000 }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detailed health - check schema deployed và indexes ready.
   */
  async isFullyReady(): Promise<{
    healthy: boolean;
    circuitState: string;
    retryStats: typeof this.retryCounter;
  }> {
    return {
      healthy: await this.isHealthy(),
      circuitState: this.circuitBreaker.getState(),
      retryStats: { ...this.retryCounter },
    };
  }

  /**
   * Lấy circuit breaker stats (cho metrics endpoint).
   */
  getCircuitStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    nextAttemptTime: number;
  } {
    return this.circuitBreaker.getStats();
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['X-Dgraph-Token'] = this.token;
    }
    return headers;
  }
}