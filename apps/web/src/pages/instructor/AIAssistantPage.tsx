import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InstructorLayout from '@/components/layout/InstructorLayout';

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };

type Thread = {
  id: string;
  title: string;
  icon: 'purple' | 'blue' | 'green' | 'orange' | 'cyan' | 'pink';
  messages: ChatMsg[];
  updated_at: number;
};

const QUICK_PROMPTS = [
  'instructor.aiAssistant.prompt.courseIdea',
  'instructor.aiAssistant.prompt.lessonPlan',
  'instructor.aiAssistant.prompt.studentFeedback',
  'instructor.aiAssistant.prompt.examTips',
  'instructor.aiAssistant.prompt.teachingTips',
  'instructor.aiAssistant.prompt.translate',
] as const;

const ICON_PATHS: Record<Thread['icon'], string> = {
  purple: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  blue: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  green: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  orange: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  cyan: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  pink: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
};

const COLOR_CLASSES: Record<Thread['icon'], string> = {
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  orange: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
  pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300',
};

const ICONS: Thread['icon'][] = ['purple', 'blue', 'green', 'orange', 'cyan', 'pink'];

const formatRelativeTime = (ts: number, locale: string): string => {
  const now = Date.now();
  const diffMs = now - ts;
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return locale === 'vi' ? 'Vừa xong' : 'Just now';
  if (min < 60) return locale.startsWith('vi') ? `${min} phút trước` : `${min} min ago`;
  if (hr < 24) return locale.startsWith('vi') ? `${hr} giờ trước` : `${hr} hours ago`;
  if (day === 1) return locale.startsWith('vi') ? 'Hôm qua' : 'Yesterday';
  if (day < 7) return locale.startsWith('vi') ? `${day} ngày trước` : `${day} days ago`;
  return new Date(ts).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: 'short' });
};

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const AIAssistantPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeId, setActiveId] = useState<string>('current');

  const [threads, setThreads] = useState<Thread[]>(() => {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    const greetContent = t('instructor.aiAssistant.greeting');
    return [
      {
        id: 'ml-1',
        title: t('instructor.aiAssistant.defaultThreads.machineLearning'),
        icon: 'purple',
        messages: [],
        updated_at: now - 2 * hour,
      },
      {
        id: 'py-2',
        title: t('instructor.aiAssistant.defaultThreads.pythonPath'),
        icon: 'blue',
        messages: [],
        updated_at: now - 5 * hour,
      },
      {
        id: 'essay-3',
        title: t('instructor.aiAssistant.defaultThreads.essayGrade'),
        icon: 'green',
        messages: [],
        updated_at: now - day - (9.25 * hour),
      },
      {
        id: 'bc-4',
        title: t('instructor.aiAssistant.defaultThreads.blockchainExam'),
        icon: 'orange',
        messages: [],
        updated_at: now - day - (13.75 * hour),
      },
      {
        id: 'current',
        title: t('instructor.aiAssistant.newChat'),
        icon: 'cyan',
        messages: [
          {
            id: 'm-init',
            role: 'assistant',
            created_at: new Date().toISOString(),
            content: greetContent,
          },
        ],
        updated_at: now,
      },
    ];
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeId, thinking]);

  const activeThread = useMemo(() => threads.find((t) => t.id === activeId) ?? threads[threads.length - 1], [threads, activeId]);

  const groupedThreads = useMemo(() => {
    const todayStart = startOfDay(Date.now());
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const groups: { key: string; items: Thread[] }[] = [
      { key: 'today', items: [] },
      { key: 'yesterday', items: [] },
      { key: 'thisWeek', items: [] },
      { key: 'older', items: [] },
    ];
    threads.forEach((th) => {
      if (th.updated_at >= todayStart) groups[0].items.push(th);
      else if (th.updated_at >= yesterdayStart) groups[1].items.push(th);
      else if (th.updated_at >= weekStart) groups[2].items.push(th);
      else groups[3].items.push(th);
    });
    return groups.filter((g) => g.items.length > 0);
  }, [threads]);

  const updateActiveThread = (mutator: (thread: Thread) => Thread) => {
    setThreads((prev) => prev.map((th) => (th.id === activeId ? mutator(th) : th)));
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content) return;
    const ts = Date.now();
    const userMsg: ChatMsg = { id: `m-${ts}`, role: 'user', content, created_at: new Date(ts).toISOString() };

    updateActiveThread((th) => ({
      ...th,
      title: th.messages.length <= 1 ? content.slice(0, 48) : th.title,
      icon: th.icon ?? ICONS[Math.floor(Math.random() * ICONS.length)],
      messages: [...th.messages, userMsg],
      updated_at: ts,
    }));

    setInput('');
    setThinking(true);

    setTimeout(() => {
      const replyTs = Date.now();
      const reply: ChatMsg = {
        id: `m-${replyTs}-r`,
        role: 'assistant',
        created_at: new Date(replyTs).toISOString(),
        content: generateReply(content),
      };
      setThreads((prev) =>
        prev.map((th) =>
          th.id === activeId ? { ...th, messages: [...th.messages, reply], updated_at: replyTs } : th,
        ),
      );
      setThinking(false);
    }, 1100);
  };

  const startNewChat = () => {
    const id = `t-${Date.now()}`;
    const greet = t('instructor.aiAssistant.greeting');
    const newThread: Thread = {
      id,
      title: t('instructor.aiAssistant.newChat'),
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      messages: [
        { id: `m-${Date.now()}`, role: 'assistant', created_at: new Date().toISOString(), content: greet },
      ],
      updated_at: Date.now(),
    };
    setThreads((prev) => [...prev, newThread]);
    setActiveId(id);
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreads((prev) => {
      const next = prev.filter((th) => th.id !== id);
      if (id === activeId) {
        const fallback = next[next.length - 1];
        if (fallback) setActiveId(fallback.id);
      }
      return next;
    });
  };

  const clearActive = () => {
    updateActiveThread((th) => ({
      ...th,
      messages: [
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          created_at: new Date().toISOString(),
          content: t('instructor.aiAssistant.greeting'),
        },
      ],
      updated_at: Date.now(),
    }));
  };

  return (
    <InstructorLayout
      title={t('instructor.aiAssistant.title')}
      subtitle={t('instructor.aiAssistant.subtitle')}
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        {/* History sidebar */}
        <aside className="xl:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 h-full overflow-hidden">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            {t('instructor.aiAssistant.newChat')}
          </button>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {groupedThreads.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">{t('instructor.aiAssistant.empty')}</div>
            ) : (
              groupedThreads.map((group) => (
                <div key={group.key} className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-2">
                    {t(`instructor.aiAssistant.${group.key}`)}
                  </div>
                  <ul className="space-y-1">
                    {group.items.map((th) => {
                      const isActive = th.id === activeId;
                      return (
                        <li key={th.id}>
                          <div
                            onClick={() => setActiveId(th.id)}
                            className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${COLOR_CLASSES[th.icon]}`}>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d={ICON_PATHS[th.icon]} />
                              </svg>
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                {th.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {formatRelativeTime(th.updated_at, i18n.language ?? 'vi')}
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteThread(th.id, e)}
                              title={t('instructor.aiAssistant.deleteConfirm')}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-all"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                              </svg>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span className="text-xs font-semibold">{t('instructor.aiAssistant.tip.title')}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">{t('instructor.aiAssistant.tip.desc')}</p>
          </div>
        </aside>

        {/* Chat panel */}
        <section className="xl:col-span-9 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <header className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate">{activeThread.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('instructor.aiAssistant.headerSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('instructor.aiAssistant.online')}
            </div>
            <button
              onClick={clearActive}
              title={t('instructor.aiAssistant.clearChat')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
            {activeThread.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white mb-4 animate-[float_3s_ease-in-out_infinite]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-1">{activeThread.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{t('instructor.aiAssistant.subtitle')}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.slice(0, 4).map((key) => (
                    <button
                      key={key}
                      onClick={() => send(t(key))}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs hover:border-blue-500 hover:text-blue-600"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              activeThread.messages.map((m) => <Message key={m.id} msg={m} />)
            )}

            {thinking && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={t('instructor.aiAssistant.inputPlaceholder')}
                className="flex-1 resize-none px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 max-h-32"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">{t('instructor.aiAssistant.disclaimer')}</p>
          </form>
        </section>
      </div>
    </InstructorLayout>
  );
};

const Message: React.FC<{ msg: ChatMsg }> = ({ msg }) => {
  if (msg.role === 'user') {
    return (
      <div className="flex items-start gap-2.5 justify-end">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[80%] whitespace-pre-line">
        {msg.content}
      </div>
    </div>
  );
};

const generateReply = (input: string): string => {
  const lower = input.toLowerCase();
  if (lower.includes('khóa học') || lower.includes('course')) {
    return 'Gợi ý cấu trúc khóa học:\n\n1. **Tổng quan & mục tiêu** (1-2 bài)\n2. **Nền tảng cần thiết** (2-3 bài)\n3. **Kiến thức cốt lõi** (5-8 bài)\n4. **Bài tập thực hành** (3-4 bài)\n5. **Dự án cuối khóa** (1-2 tuần)\n\nMỗi bài nên có: video 8-12 phút, bài đọc, 3-5 câu hỏi trắc nghiệm.';
  }
  if (lower.includes('đề thi') || lower.includes('exam')) {
    return 'Mẹo tạo đề thi hiệu quả:\n\n• 60% câu hỏi nhận biết, 30% thông hiểu, 10% vận dụng\n• Trộn câu dễ-trung bình-khó theo tỷ lệ 4-4-2\n• Mỗi đề có 1-2 câu tình huống thực tế\n• Thêm câu hỏi "tại sao" để đánh giá tư duy\n• Đặt thời gian: ~1.5 phút / câu';
  }
  if (lower.includes('sinh viên') || lower.includes('học viên') || lower.includes('student') || lower.includes('feedback')) {
    return 'Cách đưa phản hồi hiệu quả:\n\n1. **Khen trước, góp ý sau** — chỉ ra điểm tốt trước\n2. **Cụ thể** — "Bài làm phần 2 rõ ràng" thay vì "Tốt"\n3. **Định hướng** — gợi ý cách cải thiện\n4. **Kịp thời** — phản hồi trong 48h\n5. **Khuyến khích** — động viên học tiếp';
  }
  return 'Cảm ơn bạn đã hỏi! Tôi có thể hỗ trợ bạn về:\n\n• Lên kế hoạch giảng dạy\n• Tạo câu hỏi & đề thi\n• Đánh giá học viên\n• Phân tích kết quả\n• Ý tưởng nội dung\n\nBạn muốn tôi giúp gì cụ thể hơn không?';
};

export default AIAssistantPage;