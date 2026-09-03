import { BaseMetric, MetricMeta } from './base.metric';

export class Counter extends BaseMetric {
  constructor(meta: MetricMeta) {
    if (meta.type !== 'counter') throw new Error('Counter must have type=counter');
    super(meta);
  }
  inc(labels?: Record<string, string>, value = 1): void {
    const key = this.getKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }
  reset(): void { this.values.clear(); }
}

export class Gauge extends BaseMetric {
  constructor(meta: MetricMeta) {
    if (meta.type !== 'gauge') throw new Error('Gauge must have type=gauge');
    super(meta);
  }
  set(value: number, labels?: Record<string, string>): void {
    this.values.set(this.getKey(labels), value);
  }
  inc(labels?: Record<string, string>, value = 1): void {
    const key = this.getKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }
  dec(labels?: Record<string, string>, value = 1): void {
    const key = this.getKey(labels);
    this.values.set(key, (this.values.get(key) ?? 0) - value);
  }
  reset(): void { this.values.clear(); }
}

export class Histogram extends BaseMetric {
  private buckets: number[];
  constructor(meta: MetricMeta & { buckets: number[] }) {
    super({ ...meta, type: 'histogram' });
    this.buckets = [...meta.buckets].sort((a, b) => a - b);
  }
  observe(value: number, labels?: Record<string, string>): void {
    const key = this.getKey(labels);
    if (!this.histograms.has(key)) this.histograms.set(key, []);
    this.histograms.get(key)!.push(value);
  }
  reset(): void { this.histograms.clear(); }
}
