import { Counter, Gauge, Histogram, registry } from './index';

describe('Prometheus Metrics - BUG #120 fix', () => {
  beforeEach(() => {
    registry.resetAll();
  });

  describe('Counter', () => {
    it('should_increment_When_incCalled', () => {
      const counter = new Counter({
        name: 'test_counter',
        type: 'counter',
        help: 'Test counter',
        labelNames: ['method'],
      });

      counter.inc({ method: 'GET' });
      counter.inc({ method: 'GET' });
      counter.inc({ method: 'POST' });

      const serialized = counter.serialize();
      expect(serialized).toContain('test_counter{method="GET"} 2');
      expect(serialized).toContain('test_counter{method="POST"} 1');
    });

    it('should_incrementBy_When_incWithValue', () => {
      const counter = new Counter({
        name: 'test_counter_2',
        type: 'counter',
        help: 'Test',
        labelNames: [],
      });

      counter.inc(undefined, 5);
      const serialized = counter.serialize();
      expect(serialized).toContain('test_counter_2 5');
    });
  });

  describe('Gauge', () => {
    it('should_setAndInc_When_called', () => {
      const gauge = new Gauge({
        name: 'test_gauge',
        type: 'gauge',
        help: 'Test gauge',
        labelNames: ['name'],
      });

      gauge.set(10, { name: 'cpu' });
      gauge.inc({ name: 'cpu' });
      gauge.dec({ name: 'cpu' });

      const serialized = gauge.serialize();
      expect(serialized).toContain('test_gauge{name="cpu"} 10');
    });
  });

  describe('Histogram', () => {
    it('should_computeBuckets_When_observe', () => {
      const histogram = new Histogram({
        name: 'test_histogram',
        type: 'histogram',
        help: 'Test',
        labelNames: ['method'],
        buckets: [1, 5, 10],
      });

      histogram.observe(0.5, { method: 'GET' });
      histogram.observe(2, { method: 'GET' });
      histogram.observe(7, { method: 'GET' });
      histogram.observe(15, { method: 'GET' });

      const serialized = histogram.serialize();

      expect(serialized).toContain('test_histogram_bucket{method="GET",le="1"} 1');
      expect(serialized).toContain('test_histogram_bucket{method="GET",le="5"} 2');
      expect(serialized).toContain('test_histogram_bucket{method="GET",le="10"} 3');
      expect(serialized).toContain('test_histogram_bucket{method="GET",le="+Inf"} 4');
      expect(serialized).toContain('test_histogram_sum{method="GET"} 24.5');
      expect(serialized).toContain('test_histogram_count{method="GET"} 4');
    });
  });

  describe('trackDuration', () => {
    it('should_observeDuration_When_fnExecutes', async () => {
      const histogram = new Histogram({
        name: 'test_duration',
        type: 'histogram',
        help: 'Test',
        labelNames: ['op'],
        buckets: [0.1, 0.5, 1],
      });

      const { trackDuration } = await import('./index');
      await trackDuration(
        histogram,
        { op: 'test' },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'done';
        },
      );

      const serialized = histogram.serialize();
      expect(serialized).toContain('test_duration_count{op="test"} 1');
    });
  });

  describe('Registry', () => {
    it('should_deduplicate_When_sameNameRegistered', () => {
      const c1 = new Counter({
        name: 'dup',
        type: 'counter',
        help: 'D',
        labelNames: [],
      });
      const c2 = new Counter({
        name: 'dup',
        type: 'counter',
        help: 'D2',
        labelNames: [],
      });

      const r1 = registry.register(c1);
      const r2 = registry.register(c2);

      expect(r1).toBe(r2);
    });

    it('should_serializeAll_When_serializeAll', () => {
      const c = new Counter({
        name: 'a',
        type: 'counter',
        help: 'A',
        labelNames: [],
      });
      c.inc();

      const g = new Gauge({
        name: 'b',
        type: 'gauge',
        help: 'B',
        labelNames: [],
      });
      g.set(5);

      registry.register(c);
      registry.register(g);

      const all = registry.serialize();
      expect(all).toContain('a 1');
      expect(all).toContain('b 5');
    });
  });
});
