import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { studentApi } from '@/services/api';

const MessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { data: messages = [] } = useQuery({ queryKey: ['student', 'messages'], queryFn: () => studentApi.messages() });

  const conv = messages.find((m: any) => m.id === active) || messages[0];

  return (
    <StudentLayout title={t('student.messages.title')} subtitle={t('student.messages.subtitle')}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-3 h-[70vh]">
        <aside className="border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <input
                placeholder={t('student.messages.search')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {messages.map((m: any) => (
              <li key={m.id}>
                <button
                  onClick={() => setActive(m.id)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    conv?.id === m.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {m.from_avatar ? (
                      <img src={m.from_avatar} alt={m.from_name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-xs">
                        {m.from_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
                      </div>
                    )}
                    {m.is_online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />}
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
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold min-w-[18px] text-center">
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm">
                      {conv.from_name.split(' ').slice(0, 2).map((s: string) => s.charAt(0)).join('').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm">{conv.from_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {conv.is_online ? <span className="text-emerald-500">● {t('student.messages.online')}</span> : t('student.messages.offline')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50 dark:bg-slate-950">
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 shadow-sm">
                    {conv.preview}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-blue-600 text-white text-sm shadow-sm">
                    Cảm ơn thầy! Em sẽ xem lại phần này và phản hồi sớm ạ.
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 shadow-sm">
                    Tốt! Nếu có câu hỏi gì thêm thì cứ hỏi nhé.
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
                </button>
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={t('student.messages.typeMessage')}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-blue-500"
                />
                <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  {t('student.messages.send')}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              {t('student.messages.selectConversation')}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default MessagesPage;
