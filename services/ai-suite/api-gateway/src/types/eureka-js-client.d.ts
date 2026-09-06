/**
 * Khai báo kiểu tối thiểu cho `eureka-js-client`.
 *
 * Gói này không phát hành type, và DefinitelyTyped cũng chưa có bản cho v4.
 * Chỉ khai những gì EurekaService thực sự dùng — tránh `any` theo
 * node-styleguide §11.
 */
declare module 'eureka-js-client' {
  export interface EurekaInstanceConfig {
    app: string;
    instanceId: string;
    hostName: string;
    ipAddr: string;
    port: { $: number; '@enabled': boolean };
    vipAddress: string;
    statusPageUrl?: string;
    healthCheckUrl?: string;
    homePageUrl?: string;
    dataCenterInfo: {
      '@class': string;
      name: string;
    };
  }

  export interface EurekaClientConfig {
    instance: EurekaInstanceConfig;
    eureka: {
      host: string;
      port: number;
      servicePath: string;
      maxRetries?: number;
      requestRetryDelay?: number;
      heartbeatInterval?: number;
      registryFetchInterval?: number;
      fetchRegistry?: boolean;
      registerWithEureka?: boolean;
    };
    logger?: unknown;
  }

  export class Eureka {
    constructor(config: EurekaClientConfig);
    start(callback?: (error?: Error) => void): void;
    stop(callback?: (error?: Error) => void): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
  }

  export default Eureka;
}
