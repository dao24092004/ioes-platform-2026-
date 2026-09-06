export { BaseMetric, MetricType, MetricMeta } from './base.metric';
import type { Histogram } from './metric-types';

export { Counter, Gauge, Histogram } from './metric-types';
export { registry } from './registry';
export * from './predefined';

export async function trackDuration<T>(
  histogram: Histogram,
  labels: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    return await fn();
  } finally {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    histogram.observe(durationSeconds, labels);
  }
}
