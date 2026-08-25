import { BaseMetric } from './base.metric';

class MetricsRegistry {
  private metrics: Map<string, BaseMetric> = new Map();

  register(metric: BaseMetric): BaseMetric {
    if (this.metrics.has(metric['meta'].name)) return this.metrics.get(metric['meta'].name)!;
    this.metrics.set(metric['meta'].name, metric);
    return metric;
  }

  serialize(): string {
    return Array.from(this.metrics.values()).map((m) => m.serialize()).join('\n');
  }

  resetAll(): void { this.metrics.forEach((m) => m.reset()); }
}

export const registry = new MetricsRegistry();
