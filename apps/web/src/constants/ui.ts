/**
 * UI constants — single source of truth for animation timings, chart sizes,
 * and other magic numbers used across admin pages.
 */
export const ANIMATION = {
  STAGGER_MS: 50,
  CARD_STAGGER_MS: 100,
  STAGGER_DURATION_S: 0.05,
  CARD_STAGGER_DURATION_S: 0.1,
  FADE_IN_DURATION_S: 0.6,
} as const;

export const CHART_SIZES = {
  LINE_DEFAULT_PX: 240,
  LINE_SMALL_PX: 200,
  BAR_DEFAULT_PX: 200,
  BAR_LARGE_PX: 260,
  WEEKLY_REWARDS_PX: 224,
} as const;

export const TEST_IDS = {
  // Exam admin
  EXAM_ROW: 'admin-exam-row',
  EXAM_STATUS_TAB: 'admin-exam-status-tab',
  EXAM_SEARCH: 'admin-exam-search',
  EXAM_ACTIONS: 'admin-exam-actions',
  // Blockchain
  TX_ROW: 'admin-tx-row',
  CONTRACT_CARD: 'admin-contract-card',
  WEEKLY_REWARDS_CHART: 'admin-weekly-rewards',
  // Security
  EVENT_ROW: 'admin-event-row',
  AUDIT_ROW: 'admin-audit-row',
  SEVERITY_FILTER: 'admin-severity-filter',
  // Notifications
  NOTIF_ITEM: 'admin-notif-item',
  NOTIF_FILTER_PILL: 'admin-notif-filter',
  BROADCAST_AUDIENCE: 'admin-broadcast-audience',
  BROADCAST_CHANNEL: 'admin-broadcast-channel',
  BROADCAST_TITLE: 'admin-broadcast-title',
  BROADCAST_MESSAGE: 'admin-broadcast-message',
  BROADCAST_SEND: 'admin-broadcast-send',
  TEMPLATE_ROW: 'admin-template-row',
  // Analytics
  ANALYTICS_RANGE: 'analytics-range',
  ANALYTICS_KPI: 'analytics-kpi',
  // System config
  CONFIG_SAVE: 'admin-config-save',
  CONFIG_RUN_BACKUP: 'admin-config-run-backup',
} as const;

export const ARIA_LABELS = {
  VIEW: 'View details',
  EDIT: 'Edit',
  EXTEND: 'Extend',
  EXPORT: 'Export',
  BLOCK_IP: 'Block IP',
  INVESTIGATE: 'Investigate',
  DISMISS: 'Dismiss',
  MARK_READ: 'Mark as read',
  SAVE: 'Save',
  RUN_BACKUP: 'Run backup now',
  SEND: 'Send',
  MENU: 'Open menu',
  TOGGLE: 'Toggle',
} as const;