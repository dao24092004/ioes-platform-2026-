import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Eureka } from 'eureka-js-client';
import { createLogger } from '@ioes/common-node';
import { appConfig, eurekaConfig } from '../../config/app.config';

/**
 * Đăng ký service vào Eureka để api-gateway (Spring Cloud Gateway) phân giải
 * được `lb://ai-suite`.
 *
 * Không đăng ký thì gateway trả 503 cho mọi request tới /api/ai/**.
 */
@Injectable()
export class EurekaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('EurekaService');
  private client: Eureka | null = null;

  onModuleInit(): void {
    if (!eurekaConfig.enabled) {
      this.logger.warn('Eureka disabled — gateway sẽ không định tuyến được tới service này');
      return;
    }

    const instanceId = `${eurekaConfig.instanceHost}:${eurekaConfig.serviceName}:${appConfig.port}`;

    this.client = new Eureka({
      instance: {
        app: eurekaConfig.serviceName,
        instanceId,
        hostName: eurekaConfig.instanceHost,
        ipAddr: '127.0.0.1',
        port: { $: appConfig.port, '@enabled': true },
        vipAddress: eurekaConfig.serviceName,
        statusPageUrl: `http://${eurekaConfig.instanceHost}:${appConfig.port}/health`,
        healthCheckUrl: `http://${eurekaConfig.instanceHost}:${appConfig.port}/health`,
        homePageUrl: `http://${eurekaConfig.instanceHost}:${appConfig.port}/`,
        dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: 'MyOwn',
        },
      },
      eureka: {
        host: eurekaConfig.host,
        port: eurekaConfig.port,
        servicePath: eurekaConfig.servicePath,
        heartbeatInterval: eurekaConfig.heartbeatIntervalMs,
        registryFetchInterval: eurekaConfig.registryFetchIntervalMs,
        fetchRegistry: true,
        registerWithEureka: true,
      },
    });

    this.client.on('deregistered', () => {
      this.logger.log('Đã hủy đăng ký khỏi Eureka');
    });

    this.client.start((error?: Error) => {
      if (error) {
        this.logger.error(`Đăng ký Eureka thất bại: ${error.message}`);
        return;
      }
      this.logger.log(
        `Đã đăng ký Eureka: ${eurekaConfig.serviceName} tại cổng ${appConfig.port}`,
      );
    });
  }

  onModuleDestroy(): void {
    if (!this.client) {
      return;
    }
    this.client.stop();
  }
}
