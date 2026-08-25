import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import PaginationBar from '@/components/common/PaginationBar';
import { studentApi, type DiscussionPost } from '@/services/api';

type DiscussionTab = 'all' | 'unanswered' | 'resolved' | 'mine';
type SortKey = 'newest' | 'most-liked' | 'unanswered';
type TopicFilter = string;

interface Module {
  id: string;
  title: string;
  lessonCount: number;
  duration: string;
  status: 'completed' | 'active' | 'locked';
}

interface DiscussionItem {
  id: string;
  authorName: string;
  authorInitials?: string;
  authorAvatar?: string;
  isInstructor: boolean;
  roleLabel?: string;
  postedAt: string; // human readable
  pinned?: boolean;
  isPinned?: boolean;
  resolved?: boolean;
  unanswered?: boolean;
  lectureTag?: string;
  examTag?: boolean;
  title: string;
  content: string;
  codeSnippet?: string;
  likes: number;
  views: number;
  replies: number;
  replyAvatars?: { src?: string; initials?: string; count?: string }[];
  ownerId?: string;
}

// Mock dữ liệu đầy đủ để demo UI (10 threads + modules + topics)
const MOCK_TOPICS = [
  { value: 'all', labelKey: 'student.courseDiscussion.topic.all' },
  { value: 'Neural Networks', labelKey: 'student.courseDiscussion.topic.neuralNetworks' },
  { value: 'Backpropagation', labelKey: 'student.courseDiscussion.topic.backpropagation' },
  { value: 'Activation Functions', labelKey: 'student.courseDiscussion.topic.activation' },
  { value: 'Gradient Descent', labelKey: 'student.courseDiscussion.topic.gradient' },
  { value: 'Other', labelKey: 'student.courseDiscussion.topic.other' },
];

const MOCK_MODULES: Module[] = [
  { id: 'm1', title: 'Giới thiệu ML', lessonCount: 4, duration: '45 phút', status: 'completed' },
  { id: 'm2', title: 'Linear Regression', lessonCount: 5, duration: '1.5 giờ', status: 'completed' },
  { id: 'm3', title: 'Classification', lessonCount: 6, duration: '2 giờ', status: 'completed' },
  { id: 'm4', title: 'Neural Networks', lessonCount: 5, duration: '2 giờ', status: 'active' },
  { id: 'm5', title: 'Deep Learning', lessonCount: 8, duration: '3 giờ', status: 'locked' },
  { id: 'm6', title: 'CNN & RNN', lessonCount: 10, duration: '4 giờ', status: 'locked' },
];

const MOCK_ITEMS: DiscussionItem[] = [
  {
    id: 'p1',
    authorName: 'TS. Trần Minh Tuấn',
    authorInitials: 'IS',
    isInstructor: true,
    roleLabel: 'Giảng viên',
    postedAt: 'Đã ghim • 2 ngày trước',
    isPinned: true,
    pinned: true,
    title: '📚 Tài liệu bổ sung về Backpropagation',
    content:
      'Xin chào các bạn! Tôi đã thêm một số tài liệu bổ sung về thuật toán Backpropagation vào phần tài nguyên của khóa học. Các bạn nên đọc kỹ trước khi làm bài tập tuần này.',
    codeSnippet: `# Gradient Descent với Backpropagation
def backward(self, y_true, y_pred):
    # Tính loss
    loss = self.cross_entropy(y_true, y_pred)

    # Backpropagate
    delta = y_pred - y_true
    self.weights -= self.learning_rate * np.dot(self.inputs.T, delta)
    return loss`,
    likes: 24,
    views: 156,
    replies: 8,
    replyAvatars: [{ count: '+3' }],
  },
  {
    id: 'p2',
    authorName: 'Nguyễn Hoàng Nam',
    authorAvatar: 'https://i.pravatar.cc/100?img=11',
    isInstructor: false,
    postedAt: '3 giờ trước',
    unanswered: true,
    lectureTag: 'Neural Networks',
    title: 'Tại sao sigmoid activation không được dùng trong hidden layers?',
    content:
      'Em đang đọc về các activation functions và thấy nhiều tài liệu khuyên không nên dùng sigmoid trong hidden layers. Nhưng em chưa hiểu rõ lý do. Ai có thể giải thích giúp em với ạ? Em cảm ơn!',
    likes: 5,
    views: 23,
    replies: 0,
  },
  {
    id: 'p3',
    authorName: 'Hà Văn Minh',
    authorInitials: 'HV',
    isInstructor: false,
    roleLabel: 'Học viên',
    postedAt: '5 giờ trước',
    resolved: true,
    examTag: true,
    title: 'Cách tính accuracy cho multi-class classification?',
    content:
      'Mọi người ơi, cho em hỏi cách tính accuracy khi có nhiều hơn 2 classes. Em đang làm bài tập tuần 4 nhưng không biết công thức nào đúng.',
    likes: 12,
    views: 89,
    replies: 3,
    replyAvatars: [
      { src: 'https://i.pravatar.cc/100?img=5' },
      { initials: 'IS' },
    ],
    ownerId: 'me',
  },
  {
    id: 'p4',
    authorName: 'Đỗ Thu Hà',
    authorAvatar: 'https://i.pravatar.cc/100?img=16',
    isInstructor: false,
    postedAt: '1 ngày trước',
    lectureTag: 'Backpropagation',
    title: 'Hướng dẫn implement gradient checking',
    content:
      'Em đang implement gradient checking để verify rằng backpropagation của em hoạt động đúng. Ai có code mẫu hoặc tips không ạ?',
    likes: 8,
    views: 67,
    replies: 5,
    replyAvatars: [
      { src: 'https://i.pravatar.cc/100?img=1' },
      { src: 'https://i.pravatar.cc/100?img=5' },
      { count: '+2' },
    ],
    ownerId: 'me',
  },
  {
    id: 'p5',
    authorName: 'Kiều Linh',
    authorInitials: 'KL',
    isInstructor: false,
    roleLabel: 'Học viên',
    postedAt: '1 ngày trước',
    lectureTag: 'Neural Networks',
    title: 'Lỗi shape mismatch khi concatenate tensors',
    content:
      'Em bị lỗi khi cố gắng concatenate output từ 2 layers khác nhau. Đây là code của em:',
    codeSnippet: `import torch

# Error: size mismatch
x1 = torch.randn(32, 64)  # from layer 1
x2 = torch.randn(32, 128) # from layer 2
combined = torch.cat([x1, x2], dim=1)  # dimension?

# Expected: torch.Size([32, 192])# Got: ???
print(combined.shape)`,
    likes: 15,
    views: 134,
    replies: 4,
    replyAvatars: [{ initials: 'IS' }, { src: 'https://i.pravatar.cc/100?img=11' }],
    ownerId: 'me',
  },
  {
    id: 'p6',
    authorName: 'Phạm Văn Hùng',
    authorAvatar: 'https://i.pravatar.cc/100?img=8',
    isInstructor: false,
    postedAt: '2 ngày trước',
    resolved: true,
    lectureTag: 'Activation Functions',
    title: 'ReLU vs LeakyReLU — khi nào dùng cái nào?',
    content:
      'Cho mình hỏi sự khác biệt giữa ReLU và LeakyReLU, và khi nào mình nên ưu tiên dùng cái nào trong practice?',
    likes: 18,
    views: 95,
    replies: 6,
    replyAvatars: [{ src: 'https://i.pravatar.cc/100?img=5' }, { initials: 'IS' }],
  },
  {
    id: 'p7',
    authorName: 'Ngô Mai Anh',
    authorInitials: 'MA',
    isInstructor: false,
    postedAt: '3 ngày trước',
    unanswered: true,
    lectureTag: 'Gradient Descent',
    title: 'Momentum giúp tăng tốc training như thế nào?',
    content:
      'Mình đọc tài liệu về SGD with Momentum nhưng vẫn chưa visualize được cơ chế hoạt động. Có ai giải thích trực quan giúp mình không?',
    likes: 7,
    views: 41,
    replies: 0,
    ownerId: 'me',
  },
];

const formatAgo = (iso: string): string => {
  try {
    const d = new Date(iso);
    const diffH = Math.floor((Date.now() - d.getTime()) / 3600000);
    if (diffH < 1) return 'Vừa xong';
    if (diffH < 24) return `${diffH} giờ trước`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD} ngày trước`;
  } catch {
    return iso;
  }
};

// Mock: thread counts / latest activity / unanswered per course (khớp với studentApi.myCourses)
const MOCK_THREAD_STATS: Record<string, { threadCount: number; unanswered: number; pinned: boolean; latestTitle: string; latestAvatar?: string; latestAuthor: string; latestAgo: string; thumbnail: string }> = {
  'sc-001': { threadCount: 32, unanswered: 8, pinned: true, latestTitle: 'useEffect cleanup function có cần thiết khi chỉ fetch data?', latestAvatar: 'https://i.pravatar.cc/100?img=1', latestAuthor: 'Nguyễn Văn Minh', latestAgo: '2 giờ trước', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=70' },
  'sc-002': { threadCount: 48, unanswered: 12, pinned: true, latestTitle: 'Tại sao sigmoid activation không được dùng trong hidden layers?', latestAvatar: 'https://i.pravatar.cc/100?img=11', latestAuthor: 'Nguyễn Hoàng Nam', latestAgo: '3 giờ trước', thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=70' },
  'sc-003': { threadCount: 18, unanswered: 5, pinned: false, latestTitle: 'Cách chọn typography cho landing page?', latestAuthor: 'Lê Quốc Bảo', latestAgo: '5 giờ trước', thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=70' },
  'sc-004': { threadCount: 27, unanswered: 4, pinned: true, latestTitle: 'Sự khác nhau giữa S3 và EBS?', latestAvatar: 'https://i.pravatar.cc/100?img=12', latestAuthor: 'Trần Anh Tuấn', latestAgo: '1 giờ trước', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=70' },
  'sc-005': { threadCount: 15, unanswered: 6, pinned: false, latestTitle: 'Khi nào nên dùng Hash Map vs Tree Map?', latestAuthor: 'Phạm Văn Quang', latestAgo: '8 giờ trước', thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=70' },
  'sc-006': { threadCount: 6, unanswered: 2, pinned: false, latestTitle: 'OWASP Top 10 — SQL Injection thực tế khai thác thế nào?', latestAuthor: 'Lê Minh Đức', latestAgo: '1 ngày trước', thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=70' },
  'sc-007': { threadCount: 21, unanswered: 0, pinned: false, latestTitle: 'Index nên đặt trên những cột nào?', latestAvatar: 'https://i.pravatar.cc/100?img=23', latestAuthor: 'Nguyễn Phương Thảo', latestAgo: '4 ngày trước', thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=70' },
  'sc-008': { threadCount: 9, unanswered: 1, pinned: false, latestTitle: 'Vite vs Webpack — performance trong thực tế?', latestAuthor: 'Đỗ Thu Hà', latestAgo: '2 ngày trước', thumbnail: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=70' },
};

const ProgressRing: React.FC<{ percent: number; lessonsDone: number; lessonsTotal: number }> = ({ percent, lessonsDone, lessonsTotal }) => {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="flex flex-col items-center mb-3">
      <div className="relative w-20 h-20 mb-3">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#E2E8F0" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="#2563EB"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-900 dark:text-white">{percent}%</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Hoàn thành</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Bài {lessonsDone}/{lessonsTotal}
      </p>
    </div>
  );
};

const ModuleIcon: React.FC<{ status: Module['status'] }> = ({ status }) => {
  if (status === 'completed') {
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    </div>
  );
};

const CourseDiscussionView: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DiscussionTab>('all');
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  // Modal state
  const [askOpen, setAskOpen] = useState(false);
  const [askTitle, setAskTitle] = useState('');
  const [askTopic, setAskTopic] = useState('all');
  const [askBody, setAskBody] = useState('');

  const { data: apiPosts = [] } = useQuery({
    queryKey: ['student', 'discussions', courseId],
    queryFn: () => studentApi.courseDiscussion(courseId),
    retry: false,
  });

  // Merge API + mock (mock có nhiều dữ liệu hơn cho demo)
  const items: DiscussionItem[] = useMemo(() => {
    const fromApi: DiscussionItem[] = apiPosts.map((p: DiscussionPost) => ({
      id: p.id,
      authorName: p.author_name,
      authorAvatar: p.author_avatar ?? undefined,
      authorInitials: p.author_name.split(' ').slice(0, 2).map((s) => s.charAt(0)).join('').toUpperCase(),
      isInstructor: p.is_instructor,
      roleLabel: p.is_instructor ? t('student.courseDiscussion.role.instructor') : t('student.courseDiscussion.role.student'),
      postedAt: formatAgo(p.posted_at),
      title: p.content.split('.')[0]?.slice(0, 80) || t('student.courseDiscussion.defaultTitle'),
      content: p.content,
      likes: p.likes,
      views: 0,
      replies: p.replies,
    }));
    return fromApi.length > 0 ? fromApi : MOCK_ITEMS;
  }, [apiPosts, t]);

  const counts = useMemo(
    () => ({
      all: items.length,
      unanswered: items.filter((i) => i.unanswered).length,
      resolved: items.filter((i) => i.resolved).length,
      mine: items.filter((i) => i.ownerId === 'me').length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    let list = items;
    if (tab === 'unanswered') list = list.filter((i) => i.unanswered);
    else if (tab === 'resolved') list = list.filter((i) => i.resolved);
    else if (tab === 'mine') list = list.filter((i) => i.ownerId === 'me');

    if (topic !== 'all') list = list.filter((i) => i.lectureTag === topic);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
    }

    // Pinned always first
    list = [...list].sort((a, b) => Number(b.isPinned ?? false) - Number(a.isPinned ?? false));

    if (sort === 'most-liked') list = [...list].sort((a, b) => b.likes - a.likes);
    else if (sort === 'unanswered') list = [...list].sort((a, b) => Number(a.unanswered ?? false) > Number(b.unanswered ?? false) ? -1 : 1);

    return list;
  }, [items, tab, topic, search, sort]);

  const totalLikes = (id: string, base: number) => base + (liked[id] ? 1 : 0);
  const toggleLike = (id: string) => setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

  const submitAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askTitle.trim() || !askBody.trim()) return;
    // TODO: POST /api/courses/:id/discussions
    alert(`Đã đăng câu hỏi: ${askTitle}`);
    setAskOpen(false);
    setAskTitle('');
    setAskTopic('all');
    setAskBody('');
  };

  // Course info (mock — sẽ fetch từ API)
  const courseInfo = {
    title: 'Machine Learning Fundamentals',
    progress: 70,
    lessonsDone: 14,
    lessonsTotal: 20,
  };

  return (
    <div>
      <button
        onClick={() => history.back()}
        className="inline-flex items-center gap-2 mb-4 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {t('student.courseDiscussion.backToList')}
      </button>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 h-fit lg:sticky lg:top-4">
          {/* Logo */}
          <Link to="/student" className="flex items-center gap-3 mb-6 no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">IOES</span>
          </Link>

          {/* Course progress */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 mb-6">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 truncate">{courseInfo.title}</h4>
            <ProgressRing percent={courseInfo.progress} lessonsDone={courseInfo.lessonsDone} lessonsTotal={courseInfo.lessonsTotal} />
          </div>

          {/* Modules */}
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-3">
            {t('student.courseDiscussion.modules')}
          </div>
          <div className="flex flex-col gap-1">
            {MOCK_MODULES.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  m.status === 'active' ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <ModuleIcon status={m.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{m.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {m.lessonCount} {t('student.courseDiscussion.lessons')} • {m.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
                <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {t('student.courseDiscussion.qaTitle')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('student.courseDiscussion.qaSubtitle', { course: courseInfo.title })}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:border-blue-500 hover:text-blue-600 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
                {t('student.courseDiscussion.saved')}
              </button>
              <button
                onClick={() => setAskOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('student.courseDiscussion.askQuestion')}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 border-b border-slate-200 dark:border-slate-700 pb-3 overflow-x-auto">
            {([
              { key: 'all', label: t('student.courseDiscussion.tab.all'), count: counts.all },
              { key: 'unanswered', label: t('student.courseDiscussion.tab.unanswered'), count: counts.unanswered },
              { key: 'resolved', label: t('student.courseDiscussion.tab.resolved'), count: counts.resolved },
              { key: 'mine', label: t('student.courseDiscussion.tab.mine'), count: counts.mine },
            ] as { key: DiscussionTab; label: string; count: number }[]).map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === tb.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tb.label}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  tab === tb.key ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {tb.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-5">
            <div className="relative flex-1 min-w-[250px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('student.courseDiscussion.search')}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
            >
              {MOCK_TOPICS.map((tp) => (
                <option key={tp.value} value={tp.value}>
                  {t(tp.labelKey)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="newest">{t('student.courseDiscussion.sort.newest')}</option>
              <option value="most-liked">{t('student.courseDiscussion.sort.mostLiked')}</option>
              <option value="unanswered">{t('student.courseDiscussion.sort.unanswered')}</option>
            </select>
          </div>

          {/* Discussion list */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">{t('student.courseDiscussion.empty')}</p>
              </div>
            ) : (
              filtered.map((item) => {
                const isLiked = !!liked[item.id];
                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border p-6 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 ${
                      item.pinned
                        ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-900/10'
                        : item.unanswered
                        ? 'border-slate-200 dark:border-slate-700 border-l-4 border-l-red-500'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <div className="flex gap-3">
                        {item.authorAvatar ? (
                          <img src={item.authorAvatar} alt={item.authorName} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${
                              item.isInstructor
                                ? 'bg-gradient-to-br from-emerald-600 to-cyan-500'
                                : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                            }`}
                          >
                            {item.authorInitials || item.authorName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {item.authorName}
                            {item.roleLabel && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  item.isInstructor
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {item.roleLabel}
                              </span>
                            )}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{item.postedAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.pinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-semibold">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2z" />
                            </svg>
                            {t('student.courseDiscussion.badge.pinned')}
                          </span>
                        )}
                        {item.unanswered && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-semibold">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                            </svg>
                            {t('student.courseDiscussion.badge.unanswered')}
                          </span>
                        )}
                        {item.resolved && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-semibold">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {t('student.courseDiscussion.badge.resolved')}
                          </span>
                        )}
                        {item.lectureTag && (
                          <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold">
                            {item.lectureTag}
                          </span>
                        )}
                        {item.examTag && (
                          <span className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-semibold">
                            {t('student.courseDiscussion.badge.exam')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-3 hover:text-blue-600 cursor-pointer">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{item.content}</p>
                      {item.codeSnippet && (
                        <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto mb-3 leading-relaxed">
                          {item.codeSnippet}
                        </pre>
                      )}
                    </div>

                    <div className="flex items-center gap-5 pt-4 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                      <button
                        onClick={() => toggleLike(item.id)}
                        className={`flex items-center gap-1.5 transition-colors ${
                          isLiked ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'hover:text-blue-600'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                        {totalLikes(item.id, item.likes)}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {item.views}
                      </div>
                      <button className="ml-auto flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 17 4 12 9 7" />
                          <path d="M20 18v-2a4 4 0 00-4-4H4" />
                        </svg>
                        {t('student.courseDiscussion.reply')}
                      </button>
                      {item.replies > 0 && item.replyAvatars && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {item.replyAvatars.map((a, idx) => (
                              <div key={idx} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-semibold text-white">
                                {a.src ? (
                                  <img src={a.src} alt="" className="w-full h-full object-cover" />
                                ) : a.initials ? (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                                    {a.initials}
                                  </div>
                                ) : (
                                  <div className="w-full h-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center">
                                    {a.count}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.replies} {t('student.courseDiscussion.replies')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Ask Modal */}
      {askOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={() => setAskOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('student.courseDiscussion.askModal.title')}</h2>
              <button
                onClick={() => setAskOpen(false)}
                className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={submitAsk} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                    {t('student.courseDiscussion.askModal.titleLabel')}
                  </label>
                  <input
                    type="text"
                    required
                    value={askTitle}
                    onChange={(e) => setAskTitle(e.target.value)}
                    placeholder={t('student.courseDiscussion.askModal.titlePlaceholder')}
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                    {t('student.courseDiscussion.askModal.topicLabel')}
                  </label>
                  <select
                    value={askTopic}
                    onChange={(e) => setAskTopic(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">{t('student.courseDiscussion.askModal.selectTopic')}</option>
                    {MOCK_TOPICS.filter((tp) => tp.value !== 'all').map((tp) => (
                      <option key={tp.value} value={tp.value}>
                        {t(tp.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                    {t('student.courseDiscussion.askModal.bodyLabel')}
                  </label>
                  <textarea
                    required
                    value={askBody}
                    onChange={(e) => setAskBody(e.target.value)}
                    placeholder={t('student.courseDiscussion.askModal.bodyPlaceholder')}
                    rows={6}
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-y"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                    {t('student.courseDiscussion.askModal.attachmentLabel')}
                  </label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                    <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('student.courseDiscussion.askModal.attachmentHint')}
                    </p>
                  </div>
                </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAskOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('student.courseDiscussion.askModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {t('student.courseDiscussion.askModal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'student.courseDiscussion.status.inProgress',
  completed: 'student.courseDiscussion.status.completed',
  not_started: 'student.courseDiscussion.status.notStarted',
};

const CoursesDiscussionListView: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'pinned'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['student', 'myCourses'],
    queryFn: () => studentApi.myCourses(),
  });

  const stats = useMemo(() => {
    let totalThreads = 0;
    let totalUnanswered = 0;
    courses.forEach((c) => {
      const s = MOCK_THREAD_STATS[c.id];
      if (s) {
        totalThreads += s.threadCount;
        totalUnanswered += s.unanswered;
      }
    });
    return { totalThreads, totalUnanswered, courseCount: courses.length };
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let list = courses
      .filter((c) => MOCK_THREAD_STATS[c.id])
      .map((c) => ({ ...c, stats: MOCK_THREAD_STATS[c.id]! }));

    if (filter === 'unanswered') list = list.filter((c) => c.stats.unanswered > 0);
    if (filter === 'pinned') list = list.filter((c) => c.stats.pinned);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q));
    }

    list.sort((a, b) => b.stats.threadCount - a.stats.threadCount);
    return list;
  }, [courses, filter, search]);

  // Reset page when filter/search/pageSize changes
  useEffect(() => {
    setPage(1);
  }, [filter, search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredCourses.length);
  const paginatedCourses = filteredCourses.slice(startIdx, endIdx);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
          <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          {t('student.courseDiscussion.listTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('student.courseDiscussion.listSubtitle')}</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">{t('student.courseDiscussion.stats.courses')}</span>
            <svg className="w-5 h-5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold">{stats.courseCount}</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">{t('student.courseDiscussion.stats.threads')}</span>
            <svg className="w-5 h-5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold">{stats.totalThreads}</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">{t('student.courseDiscussion.stats.unanswered')}</span>
            <svg className="w-5 h-5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
            </svg>
          </div>
          <div className="text-3xl font-bold">{stats.totalUnanswered}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('student.courseDiscussion.listSearch')}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: 'all', label: t('student.courseDiscussion.filter.all') },
            { key: 'unanswered', label: t('student.courseDiscussion.filter.unanswered') },
            { key: 'pinned', label: t('student.courseDiscussion.filter.pinned') },
          ] as { key: typeof filter; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course discussion list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
              <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl mb-3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">{t('student.courseDiscussion.emptyCourses')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedCourses.map((c) => {
            const stat = c.stats;
            return (
              <Link
                key={c.id}
                to={`/student/discussions/${c.id}`}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all no-underline"
              >
                {/* Thumbnail ảnh */}
                <div className="relative h-28 rounded-xl overflow-hidden mb-4 bg-slate-100 dark:bg-slate-900">
                  <img
                    src={stat.thumbnail}
                    alt={c.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold uppercase rounded">
                    {c.category}
                  </span>
                  {stat.pinned && (
                    <span className="absolute top-2 right-2 w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center shadow-md">
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2z" />
                      </svg>
                    </span>
                  )}
                </div>

                {/* Title + instructor */}
                <h3 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {c.instructor}
                </p>

                {/* Latest thread preview */}
                <div className="flex items-start gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl mb-3">
                  {stat.latestAvatar ? (
                    <img src={stat.latestAvatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {stat.latestAuthor.split(' ').slice(0, 2).map((s) => s.charAt(0)).join('')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{stat.latestTitle}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{stat.latestAuthor} • {stat.latestAgo}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      {stat.threadCount} {t('student.courseDiscussion.threads')}
                    </span>
                    {stat.unanswered > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded font-semibold">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                        </svg>
                        {stat.unanswered}
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded font-medium text-slate-600 dark:text-slate-300">
                    {t(STATUS_LABEL[c.status || 'in_progress'])}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {filteredCourses.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <PaginationBar
            i18nKey="student.courseDiscussion"
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            startIdx={startIdx}
            endIdx={endIdx}
            total={filteredCourses.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[4, 6, 8, 12]}
          />
        </div>
      )}
    </div>
  );
};

const DiscussionsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const { t } = useTranslation();

  return (
    <StudentLayout title={t('student.courseDiscussion.title')} subtitle={t('student.courseDiscussion.subtitle')}>
      {courseId ? <CourseDiscussionView courseId={courseId} /> : <CoursesDiscussionListView />}
    </StudentLayout>
  );
};

export default DiscussionsPage;