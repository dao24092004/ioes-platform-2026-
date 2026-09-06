export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricMeta {
  name: string;
  type: MetricType;
  help: string;
  labelNames: string[];
}

export abstract class BaseMetric {
  protected meta: MetricMeta;
  protected values: Map<string, number> = new Map();
  protected histograms: Map<string, number[]> = new Map();

  constructor(meta: MetricMeta) {
    this.meta = meta;
  }

  protected getKey(labels: Record<string, string> | undefined): string {
    if (!labels || Object.keys(labels).length === 0) return '';
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`).join(',');
  }

  abstract reset(): void;

  serialize(): string {
    const lines: string[] = [];
    lines.push(`# HELP ${this.meta.name} ${this.meta.help}`);
    lines.push(`# TYPE ${this.meta.name} ${this.meta.type}`);
    if (this.meta.type === 'histogram') {
      this.serializeHistogram(lines);
    } else {
      for (const [key, value] of this.values) {
        const labelsStr = key ? `{${key}}` : '';
        lines.push(`${this.meta.name}${labelsStr} ${value}`);
      }
    }
    return lines.join('\n') + '\n';
  }

  private serializeHistogram(lines: string[]): void {
    const buckets = (this.meta as any).buckets as number[];
    for (const [key, observations] of this.histograms) {
      const sorted = [...observations].sort((a, b) => a - b);
      const previousBucketValues = new Map<number, number>();
      for (const bucket of buckets) {
        const count = sorted.filter((v) => v <= bucket).length;
        previousBucketValues.set(bucket, count);
      }
      for (const bucket of buckets) {
        const cumulative = previousBucketValues.get(bucket) ?? 0;
        const labelPart = key ? `${key},le="${bucket}"` : `le="${bucket}"`;
        lines.push(`${this.meta.name}_bucket{${labelPart}} ${cumulative}`);
      }
      const infLabel = key ? `${key},le="+Inf"` : 'le="+Inf"';
      lines.push(`${this.meta.name}_bucket{${infLabel}} ${sorted.length}`);
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const sumLabels = key ? `{${key}}` : '';
      lines.push(`${this.meta.name}_sum${sumLabels} ${sum}`);
      const countLabels = key ? `{${key}}` : '';
      lines.push(`${this.meta.name}_count${countLabels} ${sorted.length}`);
    }
  }
}
