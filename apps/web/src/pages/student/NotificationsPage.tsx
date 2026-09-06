import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { studentApi, type StudentNotification } from '@/services/api';

type Filter = 'all' | 'unread' | 'course' | 'exam' | 'achievement' | 'system' | 'message';

const typeStyles = {
  course: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: '📚' },
  exam: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: '📝' },
  achievement: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: '🏆' },
  system: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: '🔔' },
  message: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: '💬' },
};

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const { data: notifications = [] } = useQuery({ queryKey: ['student', 'notifications'], queryFn: () => studentApi.notifications() });

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n: StudentNotification) => !n.read);
    return notifications.filter((n: StudentNotification) => n.type === filter);
  }, [notifications, filter]);

  return (
    <StudentLayout
      title={t('student.notifications.title')}
      subtitle={t('student.notifications.subtitle')}
      headerActions={
        <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
          {t('student.notifications.markAllRead')}
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'unread', 'course', 'exam', 'achievement', 'system', 'message'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t(`student.notifications.filter.${f}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">{t('student.notifications.empty')}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n: StudentNotification) => {
            const ts = typeStyles[n.type];
            const Wrapper: any = n.action_url ? Link : 'div';
            const wrapperProps: any = n.action_url ? { to: n.action_url } : {};
            return (
              <Wrapper
                key={n.id}
                {...wrapperProps}
                className={`block bg-white dark:bg-slate-900 rounded-2xl border ${
                  n.read ? 'border-slate-200 dark:border-slate-800' : 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
                } p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${ts.bg} ${ts.text} flex items-center justify-center text-xl flex-shrink-0`}>
                    {ts.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`font-semibold text-sm ${n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                        {n.title}
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{n.body}</p>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      {new Date(n.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </StudentLayout>
  );
};

export default NotificationsPage;
