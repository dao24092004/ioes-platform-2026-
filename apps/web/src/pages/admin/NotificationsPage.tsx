import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { notificationsApi, type NotifChannel, type NotifTemplate } from '@/services/api';
import {
  notificationApi,
  type NotificationRecord,
  type NotificationStatus,
  type NotificationType,
} from '@/services/api/notification.api';
import { useAuthStore } from '@/app/store/authStore';
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

/**
 * Kiểu và trạng thái hiển thị cho hộp thư thật: `NotificationResponse` chỉ có
 * `type` (kênh gửi) và `status` (đã gửi/đang chờ/thất bại), không có khái
 * niệm "category" hay "đã đọc" — hai thứ đó chỉ tồn tại trong dữ liệu giả cũ
 * nên bị bỏ hẳn khỏi giao diện.
 */
const notifTypeStyles: Record<NotificationType, { bg: string; text: string; icon: React.ReactNode }> = {
  email: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></svg> },
  push: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg> },
  sms: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> },
  in_app: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg> },
};

const notifStatusStyles: Record<NotificationStatus, { bg: string; text: string }> = {
  sent: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  pending: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  failed: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  retrying: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
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
  const { user } = useAuthStore();

  const [filter, setFilter] = useState<NotificationStatus | 'all'>('all');
  const [recipient, setRecipient] = useState('');
  const [channel, setChannel] = useState<NotifChannel>('email');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sentFlash, setSentFlash] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Thống kê và mẫu vẫn là dữ liệu giả: `stats`/`templates` chưa có endpoint
  // nào cả. Hộp thư gọi thật `GET /notifications/user/{userId}` — bằng id
  // của chính người admin đang đăng nhập, vì backend chỉ cho đọc hộp thư của
  // mình (admin đọc được của người khác, nhưng trang này không có ô chọn
  // người dùng để làm việc đó).
  const { data: stats } = useQuery({ queryKey: ['notif', 'stats'], queryFn: () => notificationsApi.stats() });
  const {
    data: inbox,
    isLoading: isInboxLoading,
    isError: isInboxError,
  } = useQuery({
    queryKey: ['notif', 'inbox', user?.id],
    queryFn: () => notificationApi.getUserInbox(user!.id),
    enabled: Boolean(user?.id),
  });
  const { data: templates } = useQuery({ queryKey: ['notif', 'templates'], queryFn: () => notificationsApi.templates() });

  const filtered = useMemo(() => {
    const arr = inbox ?? [];
    return filter === 'all' ? arr : arr.filter((n: NotificationRecord) => n.status === filter);
  }, [inbox, filter]);

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

  const filterKeys: Array<typeof filter> = ['all', 'pending', 'sent', 'failed', 'retrying'];

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
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden opacity-0 animate-[fadeInUp_.6s_ease-out_forwards]"
            style={{ animationDelay: `${2 * ANIMATION.STAGGER_DURATION_S}s` }}
          >
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </span>
                {t('notificationsAdmin.inbox.title')}
              </h2>
            </div>

            <div className="px-6 pt-4 flex flex-wrap gap-1.5" role="group" aria-label={t('aria.filterCategory')}>
              {filterKeys.map(k => {
                const count = k === 'all'
                  ? (inbox?.length ?? 0)
                  : (inbox?.filter((n: NotificationRecord) => n.status === k).length ?? 0);
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
              {isInboxLoading && (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {isInboxError && (
                <div className="text-center py-12 text-sm text-red-600 dark:text-red-400">
                  {t('notificationsAdmin.inbox.error')}
                </div>
              )}
              {!isInboxLoading && !isInboxError && filtered.length === 0 && (
                <div className="text-center py-12 text-sm text-slate-500">{t('shared.none')}</div>
              )}
              {!isInboxError && filtered.map((n: NotificationRecord) => {
                const ts = notifTypeStyles[n.type];
                const ss = notifStatusStyles[n.status];
                return (
                  <div
                    key={n.id}
                    data-testid={TEST_IDS.NOTIF_ITEM}
                    className="group relative flex items-start gap-4 px-6 py-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ts.bg} ${ts.text} transition-all group-hover:scale-110 group-hover:rotate-[10deg]`}>
                      {ts.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {n.subject}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ss.bg} ${ss.text}`}>
                          {t(`notificationsAdmin.inbox.filters.${n.status}`)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {formatRelative(n.sentAt ?? n.createdAt)} · {n.recipient}
                      </div>
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