import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '@/components/layout/InstructorLayout';
import { studentApi } from '@/services/api';

const MessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { data: messages = [] } = useQuery({
    queryKey: ['instructor', 'messages'],
    queryFn: () => studentApi.messages(),
  });

  const conv = messages.find((m: any) => m.id === active) || messages[0];

  return (
    <InstructorLayout title={t('instructor.messages.title')} subtitle={t('instructor.messages.subtitle')}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-3 h-[70vh]">
        <aside className="border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <input
                placeholder={t('instructor.messages.search')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-amber-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {messages.map((m: any) => (
              <li key={m.id}>
                <button
                  onClick={() => setActive(m.id)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    conv?.id === m.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {m.from_avatar ? (
                      <img src={m.from_avatar} alt={m.from_name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-semibold text-xs">
                        {m.from_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
                      </div>
                    )}
                    {m.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{m.from_name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                        {new Date(m.last_message_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">{m.preview}</span>
                      {m.unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold min-w-[18px] text-center">
                          {m.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="lg:col-span-2 flex flex-col">
          {conv ? (
            <>
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {conv.from_avatar ? (
                    <img src={conv.from_avatar} alt={conv.from_name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-semibold text-sm">
                      {conv.from_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm">{conv.from_name}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {conv.is_online ? t('instructor.messages.online') : t('instructor.messages.offline')}
                    </div>
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40 dark:bg-slate-950/40">
                {conv.messages?.map((msg: any, idx: number) => (
                  <div key={idx} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.from_me
                          ? 'bg-amber-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={t('instructor.messages.placeholder')}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-amber-500"
                />
                <button className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  {t('instructor.messages.send')}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">{t('instructor.messages.empty')}</div>
          )}
        </div>
      </div>
    </InstructorLayout>
  );
};

export default MessagesPage;