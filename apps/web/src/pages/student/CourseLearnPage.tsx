import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { studentApi, type StudentCourseLesson } from '@/services/api';

interface ModuleGroup {
  id: string;
  title: string;
  durationLabel: string;
  lessons: (StudentCourseLesson & { durationLabel: string })[];
}

const moduleGroups: ModuleGroup[] = [
  {
    id: 'm-1',
    title: 'Giới thiệu Machine Learning',
    durationLabel: '45 phút',
    lessons: [
      { id: 'l-1', title: '1.1. ML là gì?', durationLabel: '8 phút', duration_min: 8, type: 'video', content: '' },
      { id: 'l-2', title: '1.2. Types of ML', durationLabel: '12 phút', duration_min: 12, type: 'video', content: '' },
      { id: 'l-3', title: '1.3. Applications', durationLabel: '10 phút', duration_min: 10, type: 'video', content: '' },
    ],
  },
  {
    id: 'm-2',
    title: 'Linear Regression',
    durationLabel: '1.5 giờ',
    lessons: [
      { id: 'l-4', title: '2.1. Giới thiệu', durationLabel: '15 phút', duration_min: 15, type: 'video', content: '' },
      { id: 'l-5', title: '2.2. Cost Function', durationLabel: '20 phút', duration_min: 20, type: 'video', content: '' },
    ],
  },
  {
    id: 'm-3',
    title: 'Neural Networks',
    durationLabel: '2 giờ',
    lessons: [
      { id: 'l-6', title: '3.1. Perceptron', durationLabel: '18 phút', duration_min: 18, type: 'video', content: '' },
      { id: 'l-7', title: '3.2. Activation Functions', durationLabel: '22 phút', duration_min: 22, type: 'video', content: '' },
      { id: 'l-8', title: '3.3. Multi-layer Networks', durationLabel: '25 phút', duration_min: 25, type: 'video', content: '' },
      { id: 'l-9', title: '3.4. Forward Propagation', durationLabel: '20 phút', duration_min: 20, type: 'video', content: '' },
    ],
  },
  {
    id: 'm-4',
    title: 'Deep Learning',
    durationLabel: '3 giờ',
    lessons: [
      { id: 'l-10', title: '4.1. CNN Introduction', durationLabel: '30 phút', duration_min: 30, type: 'video', content: '' },
      { id: 'l-11', title: '4.2. RNN & LSTM', durationLabel: '35 phút', duration_min: 35, type: 'video', content: '' },
    ],
  },
];

interface TranscriptLine {
  time: string;
  text: string;
}

const transcriptLines: TranscriptLine[] = [
  { time: '00:00', text: 'Chào mừng bạn đến với bài giảng về Perceptron, nền tảng cơ bản của Neural Networks.' },
  { time: '00:08', text: 'Trong bài học này, chúng ta sẽ tìm hiểu về cấu trúc và cách hoạt động của Perceptron.' },
  { time: '00:15', text: 'Perceptron là đơn vị tính toán cơ bản nhất trong mạng neural, được phát triển bởi Frank Rosenblatt vào năm 1957.' },
  { time: '00:25', text: 'Cấu trúc của một Perceptron bao gồm: các inputs, weights, tổng hợp (summation), và activation function.' },
  { time: '00:35', text: 'Chúng ta sẽ bắt đầu với một ví dụ đơn giản: phân loại email spam hay không spam.' },
  { time: '00:42', text: 'Inputs có thể là các đặc trưng như: số từ khóa spam, độ dài email, số link...' },
  { time: '00:50', text: 'Mỗi input sẽ được nhân với một weight tương ứng, sau đó tổng hợp lại và đưa qua activation function.' },
  { time: '01:02', text: 'Activation function phổ biến nhất là Step Function, cho ra output 0 hoặc 1.' },
  { time: '01:10', text: 'Quá trình training Perceptron bao gồm việc điều chỉnh weights để giảm thiểu lỗi dự đoán.' },
  { time: '01:20', text: 'Hãy cùng xem code implementation chi tiết trong phần tiếp theo.' },
];

const videoProgressFill = 35;

const CourseLearnPage: React.FC = () => {
  const { t } = useTranslation();
  const { courseId = 'sc-001' } = useParams<{ courseId: string }>();
  const [activeLessonId, setActiveLessonId] = useState<string>('l-6');
  const [openModules, setOpenModules] = useState<Set<string>>(() => new Set(['m-1', 'm-2', 'm-3']));
  const [completedSet, setCompletedSet] = useState<Set<string>>(() => new Set(['l-1', 'l-2', 'l-3', 'l-4', 'l-5']));
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTranscriptLine, setActiveTranscriptLine] = useState<string>('00:00');
  const [activeTranscriptTab, setActiveTranscriptTab] = useState<'subtitle' | 'transcript' | 'translate'>('subtitle');

  const { data: course } = useQuery({
    queryKey: ['student', 'course', courseId],
    queryFn: () => studentApi.courseDetail(courseId),
  });

  const allLessons = useMemo(() => moduleGroups.flatMap(m => m.lessons), []);
  const currentLesson = allLessons.find(l => l.id === activeLessonId);
  const currentModule = moduleGroups.find(m => m.lessons.some(l => l.id === activeLessonId));
  const currentLessonIdx = allLessons.findIndex(l => l.id === activeLessonId);
  const nextLesson = allLessons[currentLessonIdx + 1];

  const totalLessons = allLessons.length;
  const completedCount = completedSet.size;
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markComplete = (id: string) => {
    setCompletedSet(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <StudentLayout
      title={course?.title || 'Machine Learning Fundamentals'}
      subtitle={currentLesson ? `${t('student.learn.lesson')} ${currentLessonIdx + 1} ${t('student.learn.of')} ${totalLessons}` : ''}
      headerActions={
        <Link
          to={`/student/courses/${courseId}`}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          {t('student.learn.backToCourse')}
        </Link>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar: Modules & Lessons */}
        <aside className="lg:w-80 lg:flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <Link
                to={`/student/courses/${courseId}`}
                className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-blue-500 text-slate-500 hover:text-blue-500 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </Link>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{course?.title || 'Machine Learning Fundamentals'}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('student.learn.lesson')} {currentLessonIdx + 1}/{totalLessons}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">{t('student.learn.progress')}</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Module list */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-3 space-y-3">
              {moduleGroups.map(mod => {
                const opened = openModules.has(mod.id);
                return (
                  <div key={mod.id} className="module-section">
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {mod.id.split('-')[1]}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">{mod.title}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 shrink-0">{mod.durationLabel}</span>
                    </button>
                    <div className={`mt-1.5 space-y-0.5 ${opened ? 'block' : 'hidden'}`}>
                      {mod.lessons.map(lesson => {
                        const completed = completedSet.has(lesson.id);
                        const isActive = lesson.id === activeLessonId;
                        const isCurrent = isActive;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLessonId(lesson.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-[3px] border-blue-600'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-[3px] border-transparent'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                completed
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                  : isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {completed ? (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                              ) : (
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">{lesson.title}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {lesson.durationLabel}{isCurrent ? ` • ${t('student.learn.current')}` : ''}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main content: Video + info + transcript */}
        <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Video Player */}
          <div className="relative aspect-video bg-black flex items-center justify-center group">
            <div className="text-center text-white">
              <svg className="w-24 h-24 mx-auto opacity-50" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p className="mt-4 text-sm opacity-70">Video Player — {currentLesson?.title || 'Neural Networks 3.1'}</p>
            </div>

            {/* Play overlay */}
            {!isPlaying && (
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30"
              >
                <span className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 hover:scale-110 text-white text-3xl flex items-center justify-center transition-all shadow-2xl">
                  <svg className="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </span>
              </button>
            )}

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="mb-4 relative h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: '60%' }} />
                <div className="absolute inset-y-0 left-0 bg-blue-600 rounded-full" style={{ width: `${videoProgressFill}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-white">
                  <button onClick={() => setIsPlaying(p => !p)} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                    {isPlaying ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    )}
                  </button>
                  <button className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
                  </button>
                  <button className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
                  </button>
                  <div className="flex items-center gap-2 hover:bg-white/10 p-1 pr-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
                    <div className="w-20 h-1 bg-white/30 rounded-full relative">
                      <div className="absolute inset-y-0 left-0 bg-white rounded-full" style={{ width: '70%' }} />
                    </div>
                  </div>
                  <span className="text-xs font-medium">06:18 / 18:00</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <button className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="14" height="12" rx="2" ry="2" /><path d="M22 8l-4 4 4 4" /></svg>
                  </button>
                  <button onClick={() => setShowSettings(s => !s)} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                  </button>
                  <button className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Settings menu */}
            {showSettings && (
              <div className="absolute bottom-20 right-5 min-w-[200px] bg-slate-900/95 backdrop-blur rounded-xl p-2 z-10">
                <button className="w-full flex items-center justify-between px-3.5 py-2.5 text-white text-xs hover:bg-white/10 rounded-lg">
                  <span>{t('student.learn.videoControls.speed')}</span>
                  <span className="text-slate-400">1x</span>
                </button>
                <button className="w-full flex items-center justify-between px-3.5 py-2.5 text-white text-xs hover:bg-white/10 rounded-lg">
                  <span>{t('student.learn.videoControls.quality')}</span>
                  <span className="text-slate-400">1080p</span>
                </button>
                <button className="w-full flex items-center justify-between px-3.5 py-2.5 text-white text-xs hover:bg-white/10 rounded-lg">
                  <span>{t('student.learn.videoControls.subtitle')}</span>
                  <span className="text-slate-400">{t('student.learn.videoControls.subtitleLang')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Video info */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {currentLesson?.title || '3.1. Perceptron — Neural Networks'}
                </h2>
                <div className="flex items-center flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {currentLesson?.durationLabel || '18 phút'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    1,247 {t('student.learn.meta.views')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    3 {t('student.learn.meta.daysAgo')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => currentLesson && markComplete(currentLesson.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  {completedSet.has(currentLesson?.id || '') ? t('student.learn.completed') : t('student.learn.actions.markWatched')}
                </button>
                {nextLesson && (
                  <button
                    onClick={() => { currentLesson && markComplete(currentLesson.id); setActiveLessonId(nextLesson.id); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    {t('student.learn.actions.nextLesson')}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Transcript section */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="14" height="12" rx="2" ry="2" /><path d="M22 8l-4 4 4 4" /></svg>
                {t('student.learn.transcript.title')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTranscriptTab('subtitle')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTranscriptTab === 'subtitle'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500'
                  }`}
                >
                  {t('student.learn.transcript.tabSubtitle')}
                </button>
                <button
                  onClick={() => setActiveTranscriptTab('transcript')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTranscriptTab === 'transcript'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500'
                  }`}
                >
                  {t('student.learn.transcript.tabTranscript')}
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 transition-colors flex items-center gap-1.5"
                  title={t('student.learn.transcript.tabTranslate')}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8l6 6M4 14l4 4M12 8l4 8M16 16h5M16 12l1.5 4" /></svg>
                </button>
              </div>
            </div>

            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-1">
              {transcriptLines.map(line => {
                const isCurrent = activeTranscriptLine === line.time;
                return (
                  <button
                    key={line.time}
                    onClick={() => setActiveTranscriptLine(line.time)}
                    className={`w-full text-left flex gap-3 px-3 py-2 rounded-md transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-[3px] border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-[3px] border-transparent'
                    }`}
                  >
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs shrink-0 w-12">{line.time}</span>
                    <span className="flex-1">{line.text}</span>
                  </button>
                );
              })}
            </div>

            {/* AI Summary */}
            <div className="mt-6 p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-md text-xs font-bold">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="8" width="14" height="10" rx="2" /><circle cx="9" cy="13" r="1" fill="currentColor" /><circle cx="15" cy="13" r="1" fill="currentColor" /><line x1="12" y1="2" x2="12" y2="6" /></svg>
                  {t('student.learn.aiSummary.badge')}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t('student.learn.aiSummary.title')}</h4>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                <p><strong>Perceptron</strong> là đơn vị cơ bản nhất của Neural Networks, được dùng cho bài toán <strong>phân loại nhị phân</strong>.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Cấu trúc:</strong> Inputs → Weights → Summation → Activation Function → Output</li>
                  <li><strong>Activation:</strong> Step Function (0 hoặc 1)</li>
                  <li><strong>Training:</strong> Cập nhật weights để giảm lỗi</li>
                  <li><strong>Giới hạn:</strong> Chỉ xử lý được linearly separable data</li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </StudentLayout>
  );
};

export default CourseLearnPage;