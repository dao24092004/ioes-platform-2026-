import i18n from 'i18next';

/**
 * Formats a timestamp into a relative-time string using the current i18n language.
 * Examples: "just now", "5m ago", "3h ago", "2d ago".
 */
export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return i18n.t('shared.justNow');
  if (min < 60) return i18n.t('shared.minutesAgo', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return i18n.t('shared.hoursAgo', { n: h });
  const d = Math.floor(h / 24);
  return i18n.t('shared.daysAgo', { n: d });
}