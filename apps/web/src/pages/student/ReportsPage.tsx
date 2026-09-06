import React, { useMemo, useState } from 'react';
import StudentLayout from '@/components/layout/StudentLayout';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardTitleWithIcon } from '@/components/common/Card';

type Range = '7d' | '30d' | '90d' | 'ytd';
type Tab = 'study' | 'exam' | 'achievement' | 'engagement';

const ReportsPage: React.FC = () => {
  
  const [range, setRange] = useState<Range>('30d');
  const [tab, setTab] = useState<Tab>('study');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'study', label: 'Thời gian học', icon: <ClockIcon /> },
    { id: 'exam', label: 'Kết quả thi', icon: <ExamIcon /> },
    { id: 'achievement', label: 'Thành tích', icon: <TrophyIcon /> },
    { id: 'engagement', label: 'Tương tác', icon: <ChatIcon /> },
  ];

  const data = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 12;
    const isYear = range === 'ytd';
    return Array.from({ length: isYear ? 12 : days }, (_, i) => ({
      label: isYear ? `T${i + 1}` : `D${i + 1}`,
      value: Math.max(10, Math.round(Math.sin((i / days) * Math.PI * 2) * 30 + 50 + Math.cos(i * 1.7) * 10)),
    }));
  }, [range]);

  const maxV = Math.max(...data.map(d => d.value));

  return (
    <StudentLayout title="Báo cáo học tập" subtitle="Phân tích tiến độ và kết quả học tập của bạn">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'ytd'] as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                range === r
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300'
              }`}
            >
              {r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : r === '90d' ? '90 ngày' : 'Cả năm'}
            </button>
          ))}
        </div>
        <button className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
          <span className="flex items-center gap-1.5">
            <DownloadIcon /> Tải xuống
          </span>
        </button>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard color="blue" icon={<ClockIcon />} value="142h" label="Tổng giờ học" change="+12%" changeTrend="up" />
        <StatCard color="emerald" icon={<BookIcon />} value="5/8" label="Khóa đang học" change="+1" changeTrend="up" />
        <StatCard color="amber" icon={<ExamIcon />} value="88" label="Điểm TB" change="+5" changeTrend="up" />
        <StatCard color="purple" icon={<TrophyIcon />} value="3" label="Chứng chỉ" change="+1" changeTrend="up" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 mb-6">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`p-4 rounded-xl border transition-colors text-left flex items-center gap-3 ${
              tab === tb.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500'
            }`}
          >
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              tab === tb.id ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            }`}>
              {tb.icon}
            </span>
            <span className="text-sm font-semibold">{tb.label}</span>
          </button>
        ))}
      </div>

      <Card title={<CardTitleWithIcon color="primary"><ChartIcon /><span>Biểu đồ thời gian học</span></CardTitleWithIcon>}>
        <div className="flex items-end gap-1 h-64">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-400 group-hover:from-blue-600 group-hover:to-cyan-500 transition-all"
                  style={{ height: `${(d.value / maxV) * 100}%`, minHeight: 4 }}
                  title={`${d.value}h`}
                />
              </div>
              {(range === '7d' || (range === '30d' && i % 5 === 0) || range === 'ytd') && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{d.label}</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card padding="md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Khóa học tích cực nhất</h3>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">React.js</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">42 giờ học trong kỳ</div>
        </Card>
        <Card padding="md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Bài thi gần đây</h3>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">94/100</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Database Final</div>
        </Card>
        <Card padding="md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Chuỗi ngày học</h3>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">🔥 47</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kỷ lục cá nhân!</div>
        </Card>
      </div>
    </StudentLayout>
  );
};

const ClockIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
const ExamIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>);
const TrophyIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M17 4H7l1 7a5 5 0 0010 0l-1-7zM3 4h4v3a3 3 0 01-3 3V4zM21 4h-4v3a3 3 0 003-3V4z" /></svg>);
const BookIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>);
const ChartIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>);
const ChatIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>);
const DownloadIcon = () => (<svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);

export default ReportsPage;