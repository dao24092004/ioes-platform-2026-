import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../logger/structured-logger';

export interface EurekaConfig {
  serverUrl: string;
  appName: string;
  hostName: string;
  port: number;
  securePort?: number;
  healthCheckUrl?: string;
  statusPageUrl?: string;
  homePageUrl?: string;
  vipAddress?: string;
  secureVipAddress?: string;
  heartbeatIntervalMs?: number;
  renewalThreshold?: number;
  metadata?: Record<string, string>;
}

interface EurekaInstance {
  instanceId: string;
  hostName: string;
  app: string;
  ipAddr: string;
  port: { $: number; '@enabled': string };
  securePort?: { $: number; '@enabled': string };
  homePageUrl?: string;
  statusPageUrl?: string;
  healthCheckUrl?: string;
  vipAddress: string;
  secureVipAddress?: string;
  dataCenterInfo: {
    '@class': string;
    name: string;
  };
  metadata?: Record<string, string>;
  leaseInfo: {
    renewalIntervalInSecs: number;
    durationInSecs: number;
  };
}

@Injectable()
export class EurekaClient implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new StructuredLogger(EurekaClient.name);
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private renewalCount = 0;
  private config: EurekaConfig;

  constructor(
    @Optional() private readonly cfg?: ConfigService,
  ) {
    this.config = this.buildConfig();
  }

  async onModuleInit(): Promise<void> {
    await this.register();
    this.startHeartbeat();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    await this.deregister();
  }

  async register(): Promise<void> {
    const instance = this.buildInstance();

    try {
      const response = await fetch(
        `${this.config.serverUrl}/eureka/apps/${this.config.appName.toUpperCase()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ instance }),
        },
      );

      if (response.ok || response.status === 204) {
        this.logger.log(
          `Eureka registered: ${this.config.appName} -> ${this.config.hostName}:${this.config.port}`,
        );
      } else {
        const body = await response.text();
        this.logger.warn(
          `Eureka register failed: ${response.status} ${response.statusText} ${body}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Eureka register error: ${(err as Error).message}`,
      );
    }
  }

  private startHeartbeat(): void {
    const interval = this.config.heartbeatIntervalMs ?? 30_000;

    this.heartbeatTimer = setInterval(async () => {
      await this.heartbeat();
    }, interval).unref();
  }

  private async heartbeat(): Promise<void> {
    const instanceId = `${this.config.hostName}:${this.config.appName}:${this.config.port}`;
    try {
      const response = await fetch(
        `${this.config.serverUrl}/eureka/apps/${this.config.appName.toUpperCase()}/${instanceId}`,
        {
          method: 'PUT',
          headers: { Accept: 'application/json' },
        },
      );

      if (response.ok || response.status === 200 || response.status === 204) {
        this.renewalCount++;
      } else if (response.status === 404) {
        this.logger.warn('Eureka instance not found, re-registering');
        await this.register();
      } else {
        this.logger.warn(`Eureka heartbeat failed: ${response.status}`);
      }
    } catch (err) {
      this.logger.warn(`Eureka heartbeat error: ${(err as Error).message}`);
    }
  }

  async deregister(): Promise<void> {
    const instanceId = `${this.config.hostName}:${this.config.appName}:${this.config.port}`;
    try {
      await fetch(
        `${this.config.serverUrl}/eureka/apps/${this.config.appName.toUpperCase()}/${instanceId}`,
        { method: 'DELETE' },
      );
      this.logger.log(`Eureka deregistered: ${instanceId}`);
    } catch (err) {
      this.logger.warn(`Eureka deregister error: ${(err as Error).message}`);
    }
  }

  private buildConfig(): EurekaConfig {
    return {
      serverUrl:
        process.env.EUREKA_SERVER_URL ?? 'http://localhost:9999/eureka',
      appName: process.env.EUREKA_APP_NAME ?? 'exam-suite',
      hostName: process.env.EUREKA_HOST_NAME ?? 'exam-suite',
      port: parseInt(process.env.EUREKA_PORT ?? '9005', 10),
      securePort: process.env.EUREKA_SECURE_PORT
        ? parseInt(process.env.EUREKA_SECURE_PORT, 10)
        : undefined,
      healthCheckUrl:
        process.env.EUREKA_HEALTH_URL ?? 'http://localhost:9005/health',
      statusPageUrl:
        process.env.EUREKA_STATUS_URL ?? 'http://localhost:9005/health',
      homePageUrl:
        process.env.EUREKA_HOME_URL ?? 'http://localhost:9005',
      vipAddress: process.env.EUREKA_VIP_ADDRESS ?? 'exam-suite',
      heartbeatIntervalMs: parseInt(
        process.env.EUREKA_HEARTBEAT_INTERVAL_MS ?? '30000',
        10,
      ),
      metadata: {
        'management.port': process.env.MANAGEMENT_PORT ?? '9005',
        version: process.env.APP_VERSION ?? '1.0.0',
      },
    };
  }

  private buildInstance(): EurekaInstance {
    return {
      instanceId: `${this.config.hostName}:${this.config.appName}:${this.config.port}`,
      hostName: this.config.hostName,
      app: this.config.appName.toUpperCase(),
      ipAddr: process.env.HOST_IP ?? '127.0.0.1',
      port: {
        $: this.config.port,
        '@enabled': 'true',
      },
      securePort: this.config.securePort
        ? { $: this.config.securePort, '@enabled': 'false' }
        : undefined,
      homePageUrl: this.config.homePageUrl,
      statusPageUrl: this.config.statusPageUrl,
      healthCheckUrl: this.config.healthCheckUrl,
      vipAddress: this.config.vipAddress ?? this.config.appName,
      secureVipAddress: this.config.secureVipAddress ?? this.config.appName,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
      metadata: this.config.metadata,
      leaseInfo: {
        renewalIntervalInSecs: Math.floor((this.config.heartbeatIntervalMs ?? 30_000) / 1000),
        durationInSecs: 90,
      },
    };
  }
}
