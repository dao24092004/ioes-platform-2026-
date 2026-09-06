import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StructuredLogger } from '../logger/structured-logger';
import { retry, DEFAULT_RETRY_CONFIG, CircuitBreaker, CircuitOpenError } from '../index';

/**
 * Base class cho inter-service HTTP calls.
 *
 * Theo service-boundaries §2.2:
 * - Frontend -> service: QUA Gateway
 * - Service-to-service sync: QUA Gateway hoặc direct URL
 *
 * Mặc định: QUA Gateway (single entry point, unified auth + rate limit).
 *
 * @example
 * ```ts
 * @Injectable()
 * export class AuthClient extends ServiceClient {
 *   constructor(http: HttpService) {
 *     super(http, 'auth-service', process.env.API_GATEWAY_URL);
 *   }
 * }
 * ```
 */
export abstract class ServiceClient {
  protected readonly logger: StructuredLogger;

  constructor(
    protected readonly http: HttpService,
    protected readonly serviceName: string,
    protected readonly baseUrl: string,
    protected readonly timeoutMs: number = 5000,
  ) {
    this.logger = new StructuredLogger(this.constructor.name);
  }

  /**
   * GET request tới service QUA Gateway.
   * Path KHÔNG bao gồm `/api/{serviceName}/` prefix (gateway tự strip).
   */
  protected async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  protected async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  protected async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  protected async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/${this.serviceName}${path}`;

    return retry(
      async () => {
        const response = await firstValueFrom(
          this.http.request<T>({
            method,
            url,
            data: body,
            params,
            timeout: this.timeoutMs,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );
        return response.data;
      },
      {
        ...DEFAULT_RETRY_CONFIG,
        maxAttempts: 3,
        initialDelayMs: 100,
        onRetry: (err, attempt, delay) => {
          this.logger.warn(
            `${this.serviceName} ${method} ${path} retry attempt=${attempt} delay=${delay}ms error=${err.message}`,
          );
        },
      },
    );
  }
}
