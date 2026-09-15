import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { useAuthStore } from '@/app/store/authStore';
import {
  notificationApi,
  type NotificationRecord,
  type NotificationStatus,
  type NotificationType,
} from '@/services/api/notification.api';

/**
 * Hộp thư thật từ `GET /notifications/user/{userId}` (tối đa 50, mới nhất trước).
 *
 * `NotificationResponse` chỉ có kênh gửi, tiêu đề và trạng thái giao — không có
 * nội dung, liên kết, nhóm (khoá học, bài thi...) hay cờ đã đọc. Bộ lọc theo
 * nhóm và nút "đánh dấu đã đọc" của bản giả vì thế bị bỏ, lọc theo trạng thái
 * giao thay vào.
 */
type Filter = NotificationStatus | 'all';

const FILTERS: Filter[] = ['all', 'pending', 'sent', 'failed', 'retrying'];

const typeStyles: Record<NotificationType, { bg: string; text: string; icon: string }> = {
  email: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: '📧' },
  push: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: '🔔' },
  sms: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', icon: '💬' },
  in_app: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: '📱' },
};

const statusStyles: Record<NotificationStatus, string> = {
  sent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  failed: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  retrying: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
};

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['student', 'notifications', user?.id],
    queryFn: () => notificationApi.getUserInbox(user!.id),
    enabled: Boolean(user?.id),
  });

  const filtered = useMemo(
    () => (filter === 'all' ? notifications : notifications.filter((n: NotificationRecord) => n.status === filter)),
    [notifications, filter],
  );

  const filterLabel = (f: Filter) =>
    f === 'all' ? t('student.notifications.filter.all') : t(`notificationsAdmin.inbox.filters.${f}`);

  return (
    <StudentLayout title={t('student.notifications.title')} subtitle={t('student.notifications.subtitle')}>
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {filterLabel(f)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-red-600 dark:text-red-400">{t('notificationsAdmin.inbox.error')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">{t('student.notifications.empty')}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n: NotificationRecord) => {
            const ts = typeStyles[n.type];
            return (
              <div
                key={n.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${ts.bg} ${ts.text} flex items-center justify-center text-xl flex-shrink-0`}>
                    {ts.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">{n.subject}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusStyles[n.status]}`}>
                        {t(`notificationsAdmin.inbox.filters.${n.status}`)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      {new Date(n.sentAt ?? n.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
};

export default NotificationsPage;
