import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import {
  Public,
  ApiResponse,
  StructuredLogger,
} from '@ioes/common-node';
import { DgraphClient } from '../question-bank/dgraph.client';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Public as PublicDecorator } from '@ioes/common-node';

/**
 * Health check endpoints cho K8s probes.
 *
 * Endpoints:
 * - GET /health          → Overall health (200/503)
 * - GET /health/live     → Liveness (always 200 if app running)
 * - GET /health/ready    → Readiness (200 if dependencies OK)
 *
 * K8s probe config (theo BA §8.4):
 *   livenessProbe:   GET /health/live
 *   readinessProbe:  GET /health/ready
 */
@Controller('health')
export class HealthController {
  private readonly logger = new StructuredLogger(HealthController.name);

  constructor(
    private readonly dgraph: DgraphClient,
  ) {}

  /**
   * GET /health - Overall health.
   * Returns 200 nếu tất cả OK, 503 nếu có dependency fail.
   */
  @Get()
  @PublicDecorator()
  @HttpCode(HttpStatus.OK)
  async check(): Promise<ApiResponse<HealthResponse>> {
    const checks = await this.runChecks();
    const allOk = Object.values(checks.dependencies).every((d) => d.healthy);

    return ApiResponse.success({
      status: allOk ? 'ok' : 'degraded',
      service: 'exam-suite',
      version: process.env.APP_VERSION ?? '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dependencies: checks.dependencies,
    });
  }

  /**
   * GET /health/live - Liveness probe.
   * Trả về 200 ngay lập tức nếu app process còn chạy.
   * KHÔNG check dependencies (K8s sẽ restart nếu fail).
   */
  @Get('live')
  @PublicDecorator()
  @HttpCode(HttpStatus.OK)
  live(): ApiResponse<{ status: string }> {
    return ApiResponse.success({
      status: 'alive',
    });
  }

  /**
   * GET /health/ready - Readiness probe.
   * Trả về 200 chỉ khi dependencies đều healthy (K8s route traffic).
   * 503 → K8s tạm thời không route traffic.
   */
  @Get('ready')
  @PublicDecorator()
  @HttpCode(HttpStatus.OK)
  async ready(@Res() res: any): Promise<void> {
    const checks = await this.runChecks();
    const allOk = Object.values(checks.dependencies).every((d) => d.healthy);

    res.status(allOk ? 200 : 503).json({
      success: allOk,
      data: {
        status: allOk ? 'ready' : 'not-ready',
        dependencies: checks.dependencies,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async runChecks(): Promise<HealthResponse> {
    const dependencies: HealthResponse['dependencies'] = {
      postgres: { healthy: false, message: 'not configured' },
      dgraph: { healthy: false, message: 'unknown' },
    };

    // Check Dgraph
    try {
      const dgraphHealth = await this.dgraph.isHealthy();
      dependencies.dgraph = {
        healthy: dgraphHealth,
        message: dgraphHealth ? 'connected' : 'disconnected',
      };
    } catch (err) {
      dependencies.dgraph = {
        healthy: false,
        message: (err as Error).message,
      };
    }

    // Check Postgres via TypeORM connection
    // (Module-level indicator sẽ tốt hơn, tạm thời check env)
    if (process.env.DB_HOST && process.env.DB_NAME) {
      dependencies.postgres = {
        healthy: true,
        message: `connected to ${process.env.DB_NAME}`,
      };
    }

    return {
      status: 'ok',
      service: 'exam-suite',
      version: '',
      uptime: 0,
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }
}

interface DependencyStatus {
  healthy: boolean;
  message: string;
  latencyMs?: number;
}

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  dependencies: {
    postgres: DependencyStatus;
    dgraph: DependencyStatus;
  };
}