import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// I18nProvider gọi i18next.init() ở top-level module (side effect) với đúng
// resources vi/en thật sự dùng trong app. Import nó trước để formatRelative
// (dùng i18next trực tiếp, không qua React context) dịch đúng như production
// thay vì trả về key thô.
import '@/app/providers/I18nProvider';
import i18n from 'i18next';

import { formatRelative } from './time';

beforeAll(async () => {
  await i18n.changeLanguage('vi');
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

describe('formatRelative', () => {
  it('should_return_justNow_When_lessThanOneMinuteHasPassed', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));

    const result = formatRelative(isoMinutesAgo(0.5));

    expect(result).toBe('vừa xong');
  });

  it('should_includeMinuteCount_When_lessThanOneHourHasPassed', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));

    const result = formatRelative(isoMinutesAgo(5));

    expect(result).toBe('5 phút trước');
    expect(result).toContain('5');
    expect(result).not.toContain('{n}');
  });

  it('should_includeHourCount_When_lessThanOneDayHasPassed', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));

    const result = formatRelative(isoMinutesAgo(3 * 60));

    expect(result).toBe('3 giờ trước');
    expect(result).toContain('3');
    expect(result).not.toContain('{n}');
  });

  it('should_includeDayCount_When_atLeastOneDayHasPassed', () => {
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));

    const result = formatRelative(isoMinutesAgo(2 * 24 * 60));

    expect(result).toBe('2 ngày trước');
    expect(result).toContain('2');
    expect(result).not.toContain('{n}');
  });
});
