import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  notificationsApi,
  type AdminNotification,
  type NotifCategory,
  type NotifChannel,
  type NotifTemplate,
} from '@/services/api';
import { notificationApi, type NotificationType } from '@/services/api/notification.api';
import { ApiError } from '@/config/api.config';
import { formatRelative } from '@/utils/time';
import { ANIMATION, TEST_IDS } from '@/constants/ui';

/**
 * Kênh hiển thị trên giao diện sang enum `NotificationType` phía Java. Sai
 * chữ là backend trả 400 vì `@NotNull` trên enum không parse được.
 */
const CHANNEL_TO_TYPE: Record<NotifChannel, NotificationType> = {
  inApp: 'in_app',
  email: 'email',
  push: 'push',
};

/**
 * `NotificationService.deliver()` ném `badRequest("Only EMAIL type is
 * currently supported")` cho mọi kênh khác email, rồi bắt lại và lưu bản ghi
 * ở trạng thái `failed` — tức HTTP vẫn 200. Khoá sẵn hai kênh kia để người
 * dùng không bấm gửi vào chỗ chắc chắn hỏng; mở lại khi backend giao được.
 */
const SUPPORTED_CHANNELS: readonly NotifChannel[] = ['email'];

const categoryStyles: Record<NotifCategory, { bg: string; text: string; icon: React.ReactNode }> = {
  system: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg> },
  user: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  course: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg> },
  exam: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path d="M9 14l2 2 4-4" /></svg> },
};

const channelIcons: Record<NotifChannel, React.ReactNode> = {
  inApp: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
  email: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></svg>,
  push: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
};

const channelStyles: Record<NotifChannel, { bg: string; text: string }> = {
  inApp: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
  email: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  push: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
};

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<NotifCategory | 'all' | 'unread'>('all');
  const [recipient, setRecipient] = useState('');
  const [channel, setChannel] = useState<NotifChannel>('email');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sentFlash, setSentFlash] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Hộp thư, thống kê và mẫu vẫn là dữ liệu giả: `GET /notifications/user/{id}`
  // phía Java mới là chỗ để tạm, trả `List.of()`, còn `stats`/`templates` thì
  // chưa có endpoint nào. Chỉ ô soạn thông báo bên dưới là gọi thật.
  const { data: stats } = useQuery({ queryKey: ['notif', 'stats'], queryFn: () => notificationsApi.stats() });
  const { data: inbox, isLoading } = useQuery({ queryKey: ['notif', 'inbox'], queryFn: () => notificationsApi.inbox() });
  const { data: templates } = useQuery({ queryKey: ['notif', 'templates'], queryFn: () => notificationsApi.templates() });

  const filtered = useMemo(() => {
    let arr = inbox ?? [];
    if (filter === 'unread') arr = arr.filter((n: AdminNotification) => !n.read);
    else if (filter !== 'all') arr = arr.filter((n: AdminNotification) => n.category === filter);
    return arr;
  }, [inbox, filter]);

  const unread = (inbox ?? []).filter((n: AdminNotification) => !n.read).length;

  const handleMarkAllRead = () => {
    qc.setQueryData(['notif', 'inbox'], (prev: AdminNotification[] | undefined) =>
      (prev ?? []).map((n: AdminNotification) => ({ ...n, read: true }))
    );
    qc.setQueryData(['notif', 'stats'], (prev: typeof stats) => prev ? { ...prev, unread: 0 } : prev);
  };

  /**
   * `POST /notifications/send` trả HTTP 200 kèm `status: 'failed'` khi khâu
   * gửi hỏng — service bắt exception rồi vẫn lưu bản ghi. Nên chỉ dựa vào
   * `onSuccess` là chưa đủ, phải xét `status` trong bản ghi trả về.
   */
  const sendMutation = useMutation({
    mutationFn: () =>
      notificationApi.send({
        type: CHANNEL_TO_TYPE[channel],
        recipient: recipient.trim(),
        subject: title.trim(),
        content: message.trim(),
      }),
    onSuccess: (sent) => {
      if (sent.status === 'failed') {
        setSendError(t('notificationsAdmin.broadcast.failed'));
        return;
      }
      setSendError(null);
      setSentFlash(true);
      setTitle('');
      setMessage('');
      setTimeout(() => setSentFlash(false), 2400);
    },
    onError: (err: unknown) => {
      setSendError(err instanceof ApiError ? err.message : t('notificationsAdmin.broadcast.failed'));
    },
  });

  const canSend =
    Boolean(recipient.trim() && title.trim() && message.trim()) && !sendMutation.isPending;

  const handleSend = () => {
    if (!canSend) return;
    setSendError(null);
    sendMutation.mutate();
  };

  const statCards = [
    { value: stats?.sent24h ?? 0, label: t('notificationsAdmin.stats.sent24h'), color: 'blue' },
    { value: stats?.unread ?? 0, label: t('notificationsAdmin.stats.unread'), color: 'amber' },
    { value: stats?.templates ?? 0, label: t('notificationsAdmin.stats.templates'), color: 'emerald' },
    { value: stats?.subscribers ?? 0, label: t('notificationsAdmin.stats.subscribers'), color: 'purple' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const filterKeys: Array<typeof filter> = ['all', 'unread', 'system', 'user', 'course', 'exam'];

  return (
    <AdminLayout title={t('notificationsAdmin.title')} subtitle={t('notificationsAdmin.subtitle')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div
            key={i}
            data-testid={TEST_IDS.ANALYTICS_KPI}
            className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/5 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${(i + 1) * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:rotate-[10deg] ${colorMap[s.color]}`}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div className="text-2xl font-bold tabular-nums mb-1">{s.value.toLocaleString()}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            {s.color === 'amber' && s.value > 0 && (
              <span className="absolute top-3 right-3 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          <div
            data-testid={TEST_IDS.NOTIF_ITEM}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${2 * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </span>
                {t('notificationsAdmin.inbox.title')}
                {unread > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                    {unread}
                  </span>
                )}
              </h2>
              <button
                onClick={handleMarkAllRead}
                disabled={unread === 0}
                aria-label={t('aria.markRead')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                {t('notificationsAdmin.inbox.markAllRead')}
              </button>
            </div>

            <div className="px-6 pt-4 flex flex-wrap gap-1.5" role="group" aria-label={t('aria.filterCategory')}>
              {filterKeys.map(k => {
                const count = k === 'all'
                  ? (inbox?.length ?? 0)
                  : k === 'unread'
                    ? (inbox?.filter((n: AdminNotification) => !n.read).length ?? 0)
                    : (inbox?.filter((n: AdminNotification) => n.category === k).length ?? 0);
                const active = filter === k;
                return (
                  <button
                    key={k}
                    data-testid={TEST_IDS.NOTIF_FILTER_PILL}
                    onClick={() => setFilter(k)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t(`notificationsAdmin.inbox.filters.${k}`)}
                    <span className={`px-1.5 py-0 text-[10px] font-bold rounded ${active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {isLoading && (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-12 text-sm text-slate-500">{t('shared.none')}</div>
              )}
              {filtered.map((n: AdminNotification) => {
                const cs = categoryStyles[n.category];
                const ch = channelStyles[n.channel];
                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-4 px-6 py-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer ${
                      !n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    {!n.read && <span className="absolute left-2 top-5 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cs.bg} ${cs.text} transition-all group-hover:scale-110 group-hover:rotate-[10deg]`}>
                      {cs.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-semibold ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ch.bg} ${ch.text}`}>
                          {channelIcons[n.channel]}
                          {t(`shared.channelShort.${n.channel}`)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{n.body}</div>
                      <div className="text-xs text-slate-400 mt-1">{formatRelative(n.created_at)} · {n.audience}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            data-testid={TEST_IDS.TEMPLATE_ROW}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${3 * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold">{t('notificationsAdmin.templates.title')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="text-left px-6 py-3 font-semibold">{t('notificationsAdmin.templates.name')}</th>
                    <th className="text-left px-6 py-3 font-semibold">{t('notificationsAdmin.templates.trigger')}</th>
                    <th className="text-left px-6 py-3 font-semibold">{t('notificationsAdmin.templates.channel')}</th>
                    <th className="text-left px-6 py-3 font-semibold">{t('notificationsAdmin.templates.active')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(templates ?? []).map((tpl: NotifTemplate) => {
                    const ch = channelStyles[tpl.channel];
                    return (
                      <tr key={tpl.id} className="border-t border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                        <td className="px-6 py-3 text-sm font-semibold">{tpl.name}</td>
                        <td className="px-6 py-3"><code className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{tpl.trigger}</code></td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${ch.bg} ${ch.text}`}>
                            {channelIcons[tpl.channel]}
                            {t(`shared.channelShort.${tpl.channel}`)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            tpl.active
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tpl.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {tpl.active ? t('shared.on') : t('shared.off')}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all">
                            {t('notificationsAdmin.templates.edit')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden sticky top-24 opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${2.5 * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </span>
                {t('notificationsAdmin.broadcast.title')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="broadcast-recipient" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{t('notificationsAdmin.broadcast.recipient')}</label>
                <input
                  id="broadcast-recipient"
                  type="text"
                  data-testid={TEST_IDS.BROADCAST_RECIPIENT}
                  aria-label={t('aria.enterRecipient')}
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder={t('notificationsAdmin.broadcast.recipient_placeholder')}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('notificationsAdmin.broadcast.recipient_hint')}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{t('notificationsAdmin.broadcast.channel')}</label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('aria.selectChannel')}>
                  {(['inApp', 'email', 'push'] as NotifChannel[]).map(c => {
                    const active = channel === c;
                    const supported = SUPPORTED_CHANNELS.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={t(`shared.channels.${c}`)}
                        data-testid={TEST_IDS.BROADCAST_CHANNEL}
                        disabled={!supported}
                        title={supported ? undefined : t('notificationsAdmin.broadcast.channel_unsupported')}
                        onClick={() => setChannel(c)}
                        className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          active
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {channelIcons[c]}
                        <span className="text-xs font-semibold">{t(`shared.channelShort.${c}`)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('notificationsAdmin.broadcast.channel_unsupported')}</p>
              </div>

              <div>
                <label htmlFor="broadcast-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{t('notificationsAdmin.broadcast.title_placeholder')}</label>
                <input
                  id="broadcast-title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('notificationsAdmin.broadcast.title_placeholder')}
                  aria-label={t('aria.enterTitle')}
                  data-testid={TEST_IDS.BROADCAST_TITLE}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label htmlFor="broadcast-message" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{t('notificationsAdmin.broadcast.message')}</label>
                <textarea
                  id="broadcast-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('notificationsAdmin.broadcast.message_placeholder')}
                  aria-label={t('aria.enterMessage')}
                  data-testid={TEST_IDS.BROADCAST_MESSAGE}
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>

              {sendError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">{sendError}</p>
              )}

              <button
                onClick={handleSend}
                disabled={!canSend}
                aria-label={t('aria.sendBroadcast')}
                data-testid={TEST_IDS.BROADCAST_SEND}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {sendMutation.isPending ? (
                  t('notificationsAdmin.broadcast.sending')
                ) : sentFlash ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    {t('shared.sent')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    {t('notificationsAdmin.broadcast.send')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NotificationsPage;