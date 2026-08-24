import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { Card } from '@/components/common/Card';
import { studentApi, type StudentLearningPath } from '@/services/api';

const stepStyles = {
  done: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300', icon: '✓' },
  current: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500 ring-4 ring-blue-500/20', icon: '●' },
  locked: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500', border: 'border-slate-300', icon: '🔒' },
};

const stepTypeIcons = {
  course: '📘',
  exam: '📝',
  project: '🚀',
};

const LearningPathPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: paths = [] } = useQuery({ queryKey: ['student', 'paths'], queryFn: () => studentApi.learningPaths() });
  const [activeIdx, setActiveIdx] = useState(0);
  const path = paths[activeIdx];

  return (
    <StudentLayout title={t('student.learningPath.title')} subtitle={t('student.learningPath.subtitle')}>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {paths.map((p: StudentLearningPath, i: number) => (
          <button
            key={p.id}
            onClick={() => setActiveIdx(i)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeIdx === i
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>{stepTypeIcons.course}</span>
            {p.title}
          </button>
        ))}
      </div>

      {path && (
        <>
          <Card className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{path.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{path.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{t('student.learningPath.estimated')}: {path.steps.reduce((s: number, st: StudentLearningPath['steps'][number]) => s + st.estimated_hours, 0)} {t('student.learningPath.hours')}</span>
                  <span>•</span>
                  <span>{path.steps.length} bước</span>
                </div>
              </div>
              <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                {t('student.learningPath.continuePath')}
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{path.progress}%</span>
                <span className="text-slate-500 dark:text-slate-400">{path.steps.filter((s: StudentLearningPath['steps'][number]) => s.status === 'done').length}/{path.steps.length}</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${path.progress}%` }} />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Các bước trong lộ trình</h3>
            <div className="relative">
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-800" />
              <ul className="space-y-4">
                {path.steps.map((step: StudentLearningPath['steps'][number]) => {
                  const ss = stepStyles[step.status];
                  return (
                    <li key={step.id} className="relative flex items-start gap-4">
                      <div className={`relative z-10 w-12 h-12 rounded-xl ${ss.bg} ${ss.text} flex items-center justify-center font-bold text-lg border-2 ${ss.border} flex-shrink-0`}>
                        {step.status === 'locked' ? '🔒' : stepTypeIcons[step.type]}
                      </div>
                      <div className="flex-1 pt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900 dark:text-white">{step.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            step.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' :
                            step.status === 'current' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {t(`student.learningPath.${step.status}`)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.estimated_hours} {t('student.learningPath.hours')} · {step.type}</div>
                      </div>
                      {step.status === 'current' && (
                        <button className="self-center px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                          {t('student.learningPath.continuePath')}
                        </button>
                      )}
                      {step.status === 'done' && (
                        <button className="self-center px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 text-xs font-semibold transition-colors">
                          {t('student.dashboard.review')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </>
      )}
    </StudentLayout>
  );
};

export default LearningPathPage;
