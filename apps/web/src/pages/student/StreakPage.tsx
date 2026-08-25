import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';

type ActivityLevel = 0 | 1 | 2 | 3 | 4;

interface DayActivity {
  date: string;
  level: ActivityLevel;
  studyMinutes: number;
}

const generateActivity = (): DayActivity[] => {
  const today = new Date('2026-08-24');
  const days: DayActivity[] = [];
  // Deterministic PRNG for stable mock
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const r = rand();
    // Realistic pattern: ~70% active days, more on weekdays
    let level: ActivityLevel = 0;
    let minutes = 0;
    if (r < 0.18) {
      level = 0;
      minutes = 0;
    } else if (r < 0.42) {
      level = 1;
      minutes = 15 + Math.floor(rand() * 20);
    } else if (r < 0.68) {
      level = 2;
      minutes = 35 + Math.floor(rand() * 30);
    } else if (r < 0.88) {
      level = 3;
      minutes = 65 + Math.floor(rand() * 40);
    } else {
      level = 4;
      minutes = 105 + Math.floor(rand() * 60);
    }
    if (isWeekend && r < 0.35) {
      level = 0;
      minutes = 0;
    }
    days.push({ date: dateStr, level, studyMinutes: minutes });
  }
  return days;
};

const MOCK_ACTIVITY: DayActivity[] = generateActivity();

const MOCK_WEEK = [
  { day: 'streak.weekMon', minutes: 45 },
  { day: 'streak.weekTue', minutes: 75 },
  { day: 'streak.weekWed', minutes: 30 },
  { day: 'streak.weekThu', minutes: 90 },
  { day: 'streak.weekFri', minutes: 60 },
  { day: 'streak.weekSat', minutes: 20 },
  { day: 'streak.weekSun', minutes: 55 },
];

const MOCK_MILESTONES = [
  { id: 'm1', label: 'streak.m7', current: 42, target: 7, achieved: true, reward: 10 },
  { id: 'm2', label: 'streak.m30', current: 42, target: 30, achieved: true, reward: 30 },
  { id: 'm3', label: 'streak.m100', current: 42, target: 100, achieved: false, reward: 100 },
  { id: 'm4', label: 'streak.m365', current: 42, target: 365, achieved: false, reward: 500 },
];

const StreakPage: React.FC = () => {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const totalDays = MOCK_ACTIVITY.filter(d => d.level > 0).length;
    const totalMinutes = MOCK_ACTIVITY.reduce((s, d) => s + d.studyMinutes, 0);
    const totalHours = Math.round(totalMinutes / 60);
    let cur = 0;
    for (let i = MOCK_ACTIVITY.length - 1; i >= 0; i--) {
      if (MOCK_ACTIVITY[i].level > 0) cur++;
      else break;
    }
    let best = 0;
    let run = 0;
    for (const d of MOCK_ACTIVITY) {
      if (d.level > 0) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    return {
      currentStreak: cur,
      bestStreak: best,
      daysActive: totalDays,
      totalHours,
      lessonsCompleted: Math.floor(totalMinutes / 25),
      examsPassed: Math.floor(totalDays / 8),
    };
  }, []);

  const lastWeek = useMemo(() => {
    const week = MOCK_ACTIVITY.slice(-7);
    return week.map((d, i) => ({
      day: MOCK_WEEK[i].day,
      minutes: d.studyMinutes,
      date: d.date,
    }));
  }, []);

  const maxMinutes = Math.max(...lastWeek.map(d => d.minutes), 1);

  // Build heatmap grid: 53 weeks × 7 days
  const heatmapGrid = useMemo(() => {
    const firstDate = new Date(MOCK_ACTIVITY[0].date);
    const startDayOfWeek = firstDate.getDay();
    const grid: (DayActivity | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) grid.push(null);
    grid.push(...MOCK_ACTIVITY);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, []);

  const totalWeeks = Math.ceil(heatmapGrid.length / 7);

  const nextMilestone = MOCK_MILESTONES.find(m => !m.achieved);
  const daysToMilestone = nextMilestone ? nextMilestone.target - stats.currentStreak : 0;

  return (
    <StudentLayout
      title={t('student.streak.title')}
      subtitle={t('student.streak.subtitle')}
      headerActions={
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
          {t('student.streak.actions.useFreeze')}
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1 bg-gradient-to-br from-orange-500 via-rose-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wider opacity-90">{t('student.streak.currentStreak')}</div>
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
          </div>
          <div className="text-6xl font-black mb-1">{stats.currentStreak}</div>
          <div className="text-sm opacity-90">{t('student.streak.daysInRow')}</div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t('student.streak.bestStreak')}</div>
          <div className="text-5xl font-black text-slate-900 dark:text-white mb-1">{stats.bestStreak}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('student.streak.daysInRow')}</div>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
            {t('student.streak.personalRecord')}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t('student.streak.toNextMilestone')}</div>
          {nextMilestone ? (
            <>
              <div className="text-5xl font-black text-blue-600 dark:text-blue-400 mb-1">{daysToMilestone}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('student.streak.daysUntil')} {t(nextMilestone.label)}</div>
              <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all" style={{ width: `${(stats.currentStreak / nextMilestone.target) * 100}%` }} />
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">{t('student.streak.allAchieved')}</div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800/50 p-5 mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L4 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4z" /></svg>
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white mb-1">{t('student.streak.freezeTitle')}</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{t('student.streak.freezeDesc', { count: 2 })}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('student.streak.activityTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('student.streak.activitySubtitle')}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('student.streak.less')}</span>
            {[0, 1, 2, 3, 4].map(l => (
              <span key={l} className={`w-3 h-3 rounded-sm ${l === 0 ? 'bg-slate-200 dark:bg-slate-700' : l === 1 ? 'bg-blue-200 dark:bg-blue-900/40' : l === 2 ? 'bg-blue-400 dark:bg-blue-700/60' : l === 3 ? 'bg-blue-600 dark:bg-blue-500' : 'bg-blue-800 dark:bg-blue-400'}`} />
            ))}
            <span>{t('student.streak.more')}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1">
            <div className="flex gap-1 text-[10px] text-slate-400 dark:text-slate-500 pl-6">
              {['streak.monthJan', 'streak.monthFeb', 'streak.monthMar', 'streak.monthApr', 'streak.monthMay', 'streak.monthJun', 'streak.monthJul', 'streak.monthAug'].map((m, i) => (
                <span key={m} className="w-[52px]">{i % 2 === 0 ? t(m) : ''}</span>
              ))}
            </div>
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 text-[10px] text-slate-400 dark:text-slate-500 mr-1 shrink-0">
                <span className="h-3" />
                <span className="h-3 leading-3">{t('streak.dowMon')}</span>
                <span className="h-3" />
                <span className="h-3 leading-3">{t('streak.dowWed')}</span>
                <span className="h-3" />
                <span className="h-3 leading-3">{t('streak.dowFri')}</span>
                <span className="h-3" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalWeeks }).map((_, w) => (
                  <div key={w} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }).map((_, d) => {
                      const idx = w * 7 + d;
                      const day = heatmapGrid[idx];
                      if (!day) return <span key={d} className="w-3 h-3 rounded-sm" />;
                      const colorClass =
                        day.level === 0 ? 'bg-slate-200 dark:bg-slate-700' :
                        day.level === 1 ? 'bg-blue-200 dark:bg-blue-900/40' :
                        day.level === 2 ? 'bg-blue-400 dark:bg-blue-700/60' :
                        day.level === 3 ? 'bg-blue-600 dark:bg-blue-500' :
                        'bg-blue-800 dark:bg-blue-400';
                      return (
                        <span
                          key={d}
                          className={`w-3 h-3 rounded-sm ${colorClass}`}
                          title={`${day.date}: ${day.studyMinutes} min`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('student.streak.weeklyTitle')}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('student.streak.last7Days')}</span>
          </div>
          <div className="flex items-end gap-2 h-44">
            {lastWeek.map((d, i) => {
              const pct = (d.minutes / maxMinutes) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{d.minutes}m</div>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition-all"
                      style={{ height: `${pct}%`, minHeight: d.minutes > 0 ? '6px' : '0' }}
                    />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{t(d.day)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('student.streak.monthlyTitle')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <div className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">{t('student.streak.monthlyStats.daysActive')}</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.daysActive}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.streak.outOf365')}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <div className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">{t('student.streak.monthlyStats.studyTime')}</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalHours}h</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.streak.lastYear')}</div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30">
              <div className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">{t('student.streak.monthlyStats.lessons')}</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.lessonsCompleted}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.streak.lastYear')}</div>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/30">
              <div className="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">{t('student.streak.monthlyStats.exams')}</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.examsPassed}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.streak.lastYear')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('student.streak.achievementsTitle')}</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {MOCK_MILESTONES.filter(m => m.achieved).length} / {MOCK_MILESTONES.length}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MOCK_MILESTONES.map((m) => {
            const pct = Math.min(100, Math.round((m.current / m.target) * 100));
            return (
              <div key={m.id} className={`p-5 rounded-2xl border ${m.achieved ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.achieved ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>
                  </div>
                  {m.achieved && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      {t('student.streak.achieved')}
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 dark:text-white mb-1">{t(m.label)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">{m.achieved ? t('student.streak.completedAt', { count: m.target }) : t('student.streak.continueTo', { count: m.target })}</div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{m.current} / {m.target}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">+{m.reward}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${m.achieved ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </StudentLayout>
  );
};

export default StreakPage;