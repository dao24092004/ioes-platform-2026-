import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';
import { aiApi, type ChatSession } from '@/services/api/ai.api';
import { ApiError } from '@/config/api.config';

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };

type Thread = {
  /** Id cục bộ. Bằng sessionId nếu phiên đã tồn tại ở backend. */
  id: string;
  /** null khi phiên chưa được tạo — backend tạo ở lượt hỏi đầu tiên. */
  sessionId: string | null;
  title: string;
  icon: 'purple' | 'blue' | 'green' | 'orange' | 'cyan' | 'pink';
  messages: ChatMsg[];
  /** Lịch sử đã tải về chưa. Danh sách phiên không kèm tin nhắn. */
  loaded: boolean;
  updated_at: number;
};

const DRAFT_THREAD_ID = 'current';

const QUICK_PROMPTS = [
  'student.aiAssistant.prompt.explainConcept',
  'student.aiAssistant.prompt.learningPath',
  'student.aiAssistant.prompt.essayGrade',
  'student.aiAssistant.prompt.findCourse',
  'student.aiAssistant.prompt.examPrep',
  'student.aiAssistant.prompt.codeHelp',
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

/**
 * Màu gán theo thứ tự phiên chứ không random: random khiến mỗi lần render lại
 * đổi màu một phiên, nhìn như danh sách nhảy lung tung.
 */
const iconForIndex = (index: number): Thread['icon'] => ICONS[index % ICONS.length];

const sessionToThread = (session: ChatSession, index: number, fallbackTitle: string): Thread => ({
  id: session.id,
  sessionId: session.id,
  title: session.title ?? fallbackTitle,
  icon: iconForIndex(index),
  messages: [],
  loaded: false,
  updated_at: new Date(session.lastMessageAt ?? session.updatedAt).getTime(),
});

const formatRelativeTime = (ts: number, locale: string): string => {
  const now = Date.now();
  const diffMs = now - ts;
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return locale.startsWith('vi') ? 'Vừa xong' : 'Just now';
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

const StudentAIAssistantPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeId, setActiveId] = useState<string>(DRAFT_THREAD_ID);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // appendToActive chạy trong callback bất đồng bộ; đọc activeId qua ref để
  // không phải khai nó là dependency và tạo lại hàm sau mỗi lần đổi phiên.
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const greeting = t('student.aiAssistant.greeting');
  const untitled = t('student.aiAssistant.newChat');

  /** Phiên nháp: chưa có ở backend, chỉ hiện lời chào cho tới lượt hỏi đầu tiên. */
  const makeDraftThread = useCallback(
    (id: string, icon: Thread['icon']): Thread => ({
      id,
      sessionId: null,
      title: untitled,
      icon,
      messages: [
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          created_at: new Date().toISOString(),
          content: greeting,
        },
      ],
      loaded: true,
      updated_at: Date.now(),
    }),
    [greeting, untitled],
  );

  /** Nối một tin nhắn vào thread đang mở. */
  const appendToActive = useCallback((message: ChatMsg) => {
    setThreads((prev) =>
      prev.map((th) =>
        th.id === activeIdRef.current
          ? { ...th, messages: [...th.messages, message], updated_at: Date.now() }
          : th,
      ),
    );
  }, []);

  // Nạp danh sách phiên một lần khi vào trang. Danh sách không kèm tin nhắn —
  // lịch sử của từng phiên chỉ tải khi người dùng bấm vào nó.
  useEffect(() => {
    let cancelled = false;

    aiApi
      .listSessions()
      .then((sessions) => {
        if (cancelled) return;
        const loaded = sessions.map((session, index) => sessionToThread(session, index, untitled));
        setThreads([...loaded, makeDraftThread(DRAFT_THREAD_ID, 'cyan')]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Không có lịch sử vẫn phải chat được, nên chỉ mở một phiên nháp.
        setThreads([makeDraftThread(DRAFT_THREAD_ID, 'cyan')]);
        setLoadError(err instanceof ApiError ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [makeDraftThread, untitled]);

  // Tải lịch sử khi mở một phiên chưa có tin nhắn trong bộ nhớ.
  useEffect(() => {
    const thread = threads.find((th) => th.id === activeId);
    if (!thread || thread.loaded || !thread.sessionId) return;

    const sessionId = thread.sessionId;
    let cancelled = false;

    aiApi
      .getHistory(sessionId)
      .then((history) => {
        if (cancelled) return;
        setThreads((prev) =>
          prev.map((th) =>
            th.id === sessionId
              ? {
                  ...th,
                  loaded: true,
                  messages: history.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    created_at: m.createdAt,
                  })),
                }
              : th,
          ),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Đánh dấu đã tải để không thử lại vô hạn khi backend đang lỗi.
        setThreads((prev) =>
          prev.map((th) => (th.id === sessionId ? { ...th, loaded: true } : th)),
        );
        setLoadError(err instanceof ApiError ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [activeId, threads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeId, thinking]);

  // Có thể là undefined ở lần render đầu, khi danh sách phiên chưa tải xong.
  // TypeScript không bắt được vì truy cập theo chỉ số vẫn cho ra kiểu Thread.
  const activeThread = useMemo(
    (): Thread | undefined => threads.find((th) => th.id === activeId) ?? threads[threads.length - 1],
    [threads, activeId],
  );

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

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;

    const ts = Date.now();
    const userMsg: ChatMsg = {
      id: `m-${ts}`,
      role: 'user',
      content,
      created_at: new Date(ts).toISOString(),
    };

    const thread = threads.find((th) => th.id === activeIdRef.current);
    const sessionId = thread?.sessionId ?? undefined;

    updateActiveThread((th) => ({
      ...th,
      // Backend tự đặt tên phiên từ câu hỏi đầu; ở đây đặt tạm cho khỏi trống.
      title: th.messages.filter((m) => m.role === 'user').length === 0 ? content.slice(0, 48) : th.title,
      messages: [...th.messages, userMsg],
      updated_at: ts,
    }));

    setInput('');
    setThinking(true);
    setLoadError(null);

    try {
      const turn = await aiApi.ask({ question: content, sessionId });

      appendToActive({
        id: turn.messageId,
        role: 'assistant',
        content: turn.answer,
        created_at: new Date().toISOString(),
      });

      // Lượt đầu của phiên nháp: backend vừa cấp sessionId, gắn vào thread để
      // các lượt sau nối đúng phiên thay vì mở phiên mới mỗi lần hỏi.
      if (!sessionId) {
        setThreads((prev) =>
          prev.map((th) =>
            th.id === activeIdRef.current ? { ...th, sessionId: turn.sessionId } : th,
          ),
        );
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('student.aiAssistant.error');
      setLoadError(message);
      appendToActive({
        id: `m-${Date.now()}-err`,
        role: 'assistant',
        content: message,
        created_at: new Date().toISOString(),
      });
    } finally {
      setThinking(false);
    }
  };

  const startNewChat = () => {
    // Phiên chỉ được tạo ở backend khi có câu hỏi đầu tiên, nên ở đây chỉ mở
    // một thread nháp cục bộ. Tránh đẻ ra phiên rỗng nếu người dùng bỏ ngang.
    const id = `draft-${Date.now()}`;
    setThreads((prev) => [...prev, makeDraftThread(id, iconForIndex(prev.length))]);
    setActiveId(id);
  };

  /** Ẩn phiên khỏi danh sách. Backend chưa có endpoint xoá nên chỉ là cục bộ. */
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

  /**
   * Xoá nội dung đang hiển thị. Chỉ tác động phía client — backend không có
   * endpoint xoá, và lịch sử phiên vẫn còn nguyên ở đó.
   */
  const clearActive = () => {
    updateActiveThread((th) => ({
      ...th,
      messages: [
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          created_at: new Date().toISOString(),
          content: t('student.aiAssistant.greeting'),
        },
      ],
      updated_at: Date.now(),
    }));
  };

  if (!activeThread) {
    return (
      <StudentLayout
        title={t('student.aiAssistant.title')}
        subtitle={t('student.aiAssistant.subtitle')}
      >
        <div className="h-[calc(100vh-180px)] flex items-center justify-center text-sm text-slate-500">
          {t('common.loading', 'Đang tải...')}
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout
      title={t('student.aiAssistant.title')}
      subtitle={t('student.aiAssistant.subtitle')}
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
            {t('student.aiAssistant.newChat')}
          </button>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {loadingSessions ? (
              <div className="text-center text-xs text-slate-500 py-8">
                {t('common.loading', 'Đang tải...')}
              </div>
            ) : groupedThreads.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">{t('student.aiAssistant.empty')}</div>
            ) : (
              groupedThreads.map((group) => (
                <div key={group.key} className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-2">
                    {t(`student.aiAssistant.${group.key}`)}
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
                              title={t('student.aiAssistant.deleteConfirm')}
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

          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span className="text-xs font-semibold">{t('student.aiAssistant.tip.title')}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">{t('student.aiAssistant.tip.desc')}</p>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('student.aiAssistant.headerSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('student.aiAssistant.online')}
            </div>
            <button
              onClick={clearActive}
              title={t('student.aiAssistant.clearChat')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-500"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
              </svg>
            </button>
          </header>

          {loadError && (
            <div
              role="alert"
              className="px-5 py-2.5 flex items-start gap-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-900"
            >
              <svg className="w-4 h-4 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="flex-1 min-w-0 break-words">{loadError}</span>
              <button
                onClick={() => setLoadError(null)}
                className="flex-shrink-0 underline hover:no-underline"
              >
                {t('common.close', 'Đóng')}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
            {activeThread.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white mb-4 animate-[float_3s_ease-in-out_infinite]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-1">{activeThread.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{t('student.aiAssistant.subtitle')}</p>
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
                placeholder={t('student.aiAssistant.inputPlaceholder')}
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
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">{t('student.aiAssistant.disclaimer')}</p>
          </form>
        </section>
      </div>
    </StudentLayout>
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


export default StudentAIAssistantPage;
