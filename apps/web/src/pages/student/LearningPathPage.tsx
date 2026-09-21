import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { ApiError } from '@/config/api.config';
import {
  learningPathApi,
  type LearningPathStep,
  type SavedLearningPath,
} from '@/services/api/learning-path.api';

/**
 * FR-AI-005 — lộ trình học cá nhân hoá.
 *
 * Toàn bộ nội dung đến từ ai-gateway (`/api/ai/learning-path/**`). Sinh lộ
 * trình chạy 5 tác tử tuần tự nên mất hàng chục giây; trang hiện đồng hồ đếm
 * và thứ tự tác tử, không giả vờ biết đang ở bước nào. Mô hình hỏng hoặc hết
 * quota thì hiện lỗi thật — không bao giờ dựng lộ trình mẫu.
 */

const HISTORY_LIMIT = 10;

/** Đúng thứ tự 5 tác tử trong hợp đồng AI_FEATURES_CONTRACT.md mục 2. */
const AGENTS = [
  'profiler',
  'gap_analyzer',
  'curriculum_planner',
  'resource_retriever',
  'validator',
] as const;

const card =
  'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';

const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors';

const ghostButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors';

const Spinner: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <div
    className={`inline-block border-2 border-blue-600 border-t-transparent rounded-full animate-spin ${className}`}
  />
);

const LearningPathPage: React.FC = () => {
  const { t, i18n } = useTranslation('learningPath');
  const qc = useQueryClient();

  const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';
  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(locale);
  };
  const formatDate = (iso: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale);
  };

  // ----- form -----
  const [goal, setGoal] = useState('');
  const [hours, setHours] = useState('8');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Lộ trình cũ đang mở, null nghĩa là đang xem bản mới nhất.
  const [openedId, setOpenedId] = useState<string | null>(null);

  // Ba truy vấn dưới đều là lượt đọc nhanh và đã có timeout riêng trong
  // learning-path.api. `retry: false` ghi đè mặc định `retry: 1` của
  // QueryClient: khi ai-gateway hỏng, thử lại chỉ làm người dùng chờ gấp đôi
  // rồi vẫn nhận đúng lỗi đó.
  const pathQuery = useQuery({
    queryKey: ['ai', 'learningPath', 'me'],
    queryFn: () => learningPathApi.getMine(),
    staleTime: 60_000,
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ['ai', 'learningPath', 'history', { limit: HISTORY_LIMIT }],
    queryFn: () => learningPathApi.getHistory(HISTORY_LIMIT),
    staleTime: 60_000,
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: ['ai', 'learningPath', 'detail', openedId],
    queryFn: () => learningPathApi.getById(openedId as string),
    enabled: !!openedId,
    retry: false,
  });

  // `retry: false` ở đây là bắt buộc, không phải cho đẹp: mỗi lượt sinh chạy 5
  // tác tử và tiêu quota LLM thật, lại mất tới 3 phút. Tự động gửi lần hai là
  // đốt tiền và có thể lưu hai lộ trình trùng nhau. Người dùng tự bấm sinh lại.
  const generateMut = useMutation({
    retry: false,
    mutationFn: learningPathApi.generate,
    onSuccess: (saved) => {
      setOpenedId(null);
      setFormOpen(false);
      if (saved) qc.setQueryData(['ai', 'learningPath', 'me'], saved);
      qc.invalidateQueries({ queryKey: ['ai', 'learningPath', 'me'] });
      qc.invalidateQueries({ queryKey: ['ai', 'learningPath', 'history', { limit: HISTORY_LIMIT }] });
    },
  });

  // Đồng hồ đếm giây, để người dùng thấy máy vẫn đang chạy chứ không treo.
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  useEffect(() => {
    if (!generateMut.isPending) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const id = window.setInterval(
      () => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [generateMut.isPending]);

  const commitSkill = (raw: string) => {
    const value = raw.trim().replace(/,+$/, '').trim();
    if (!value) return;
    setSkills((prev) => (prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]));
    setSkillDraft('');
  };

  const onSkillKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitSkill(skillDraft);
      return;
    }
    if (event.key === 'Backspace' && !skillDraft) {
      setSkills((prev) => prev.slice(0, -1));
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setFormError(t('form.goalRequired'));
      return;
    }
    const hoursPerWeek = Number(hours);
    if (!Number.isInteger(hoursPerWeek) || hoursPerWeek < 1 || hoursPerWeek > 80) {
      setFormError(t('form.hoursInvalid'));
      return;
    }
    setFormError(null);
    const pending = skillDraft.trim().replace(/,+$/, '').trim();
    const currentSkills = pending && !skills.includes(pending) ? [...skills, pending] : skills;
    setSkills(currentSkills);
    setSkillDraft('');
    generateMut.mutate({ goal: trimmedGoal, hoursPerWeek, currentSkills });
  };

  /** Lỗi sinh lộ trình: nói thẳng nguyên nhân, kèm nguyên văn thông báo của máy chủ. */
  const describeError = (err: unknown): { headline: string; detail: string | null } => {
    if (err instanceof ApiError) {
      const detail = err.message ? t('error.serverSaid', { message: err.message }) : null;
      if (err.status === 503 || err.status === 502 || err.status === 504) {
        return { headline: t('error.unavailable'), detail };
      }
      if (err.status === 429) return { headline: t('error.rateLimited'), detail };
      if (err.status === undefined) return { headline: t('error.timeout'), detail };
      return { headline: t('error.generic'), detail };
    }
    return { headline: t('error.generic'), detail: null };
  };

  const latestPath = pathQuery.data ?? null;
  const viewingOld = !!openedId;
  const activePath: SavedLearningPath | null = viewingOld ? detailQuery.data ?? null : latestPath;

  const openForm = () => {
    setFormError(null);
    setGoal((prev) => prev || activePath?.goal || latestPath?.goal || '');
    setFormOpen(true);
  };

  // Chưa có lộ trình nào thì mở thẳng form, khỏi bắt bấm thêm một nút.
  const showForm =
    !generateMut.isPending &&
    (formOpen || (pathQuery.isSuccess && !latestPath && !viewingOld));

  const headerActions =
    latestPath && !showForm && !generateMut.isPending ? (
      <button type="button" onClick={openForm} className={primaryButton}>
        {t('path.regenerate')}
      </button>
    ) : undefined;

  return (
    <StudentLayout title={t('title')} subtitle={t('subtitle')} headerActions={headerActions}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          {generateMut.isPending && (
            <section className={`${card} p-6`} aria-live="polite">
              <div className="flex items-center gap-3">
                <Spinner className="w-6 h-6" />
                <h2 className="text-lg font-bold">{t('generating.heading')}</h2>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t('generating.note')}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full w-1/3 rounded-full bg-blue-600 animate-pulse" />
              </div>
              <div className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                {t('generating.elapsed', { seconds: elapsed })}
              </div>

              <div className="mt-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('generating.stagesTitle')}
                </div>
                <ol className="mt-3 space-y-2">
                  {AGENTS.map((agent, index) => (
                    <li key={agent} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {t(`generating.agents.${agent}`)}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {t('generating.stagesNote')}
                </p>
              </div>
            </section>
          )}

          {!generateMut.isPending && generateMut.isError && (
            <section
              className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6"
              role="alert"
            >
              <h2 className="text-base font-bold text-red-700 dark:text-red-300">
                {t('error.generateTitle')}
              </h2>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                {describeError(generateMut.error).headline}
              </p>
              {describeError(generateMut.error).detail && (
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80 break-words">
                  {describeError(generateMut.error).detail}
                </p>
              )}
              <p className="mt-2 text-xs text-red-600/80 dark:text-red-400/80">
                {t('error.noFakeData')}
              </p>
              <button type="button" onClick={openForm} className={`${ghostButton} mt-4 bg-white dark:bg-slate-900`}>
                {t('error.retry')}
              </button>
            </section>
          )}

          {showForm && (
            <section className={`${card} p-6`}>
              <h2 className="text-lg font-bold">{t('form.heading')}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('form.intro')}</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="lp-goal" className="block text-sm font-semibold mb-1.5">
                    {t('form.goalLabel')}
                  </label>
                  <input
                    id="lp-goal"
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder={t('form.goalPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('form.goalHint')}</p>
                </div>

                <div>
                  <label htmlFor="lp-hours" className="block text-sm font-semibold mb-1.5">
                    {t('form.hoursLabel')}
                  </label>
                  <input
                    id="lp-hours"
                    type="number"
                    min={1}
                    max={80}
                    step={1}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-32 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('form.hoursHint')}</p>
                </div>

                <div>
                  <label htmlFor="lp-skills" className="block text-sm font-semibold mb-1.5">
                    {t('form.skillsLabel')}
                  </label>
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                      >
                        {skill}
                        <button
                          type="button"
                          aria-label={t('form.removeSkill', { skill })}
                          onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                          className="hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      id="lp-skills"
                      type="text"
                      value={skillDraft}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      onKeyDown={onSkillKeyDown}
                      onBlur={() => commitSkill(skillDraft)}
                      placeholder={t('form.skillsPlaceholder')}
                      className="flex-1 min-w-[160px] py-1 bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {skills.length === 0 ? t('form.skillsEmpty') : t('form.skillsHint')}
                  </p>
                </div>

                {formError && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {formError}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className={primaryButton} disabled={generateMut.isPending}>
                    {generateMut.isPending ? t('form.submitBusy') : t('form.submit')}
                  </button>
                  {latestPath && (
                    <button type="button" className={ghostButton} onClick={() => setFormOpen(false)}>
                      {t('form.cancel')}
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {pathQuery.isLoading && (
            <section className={`${card} p-12 text-center`}>
              <Spinner />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
            </section>
          )}

          {pathQuery.isError && !generateMut.isPending && (
            <section
              className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6"
              role="alert"
            >
              <h2 className="text-base font-bold text-red-700 dark:text-red-300">{t('error.loadTitle')}</h2>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{t('error.loadBody')}</p>
              {pathQuery.error instanceof ApiError && pathQuery.error.message && (
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80 break-words">
                  {t('error.serverSaid', { message: pathQuery.error.message })}
                </p>
              )}
              <button
                type="button"
                onClick={() => void pathQuery.refetch()}
                className={`${ghostButton} mt-4 bg-white dark:bg-slate-900`}
              >
                {t('error.reload')}
              </button>
            </section>
          )}

          {viewingOld && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-sm text-amber-800 dark:text-amber-300">
              <span>{t('path.viewingOld')}</span>
              <button
                type="button"
                onClick={() => setOpenedId(null)}
                className="font-semibold underline hover:no-underline"
              >
                {t('path.backToLatest')}
              </button>
            </div>
          )}

          {viewingOld && detailQuery.isLoading && (
            <section className={`${card} p-12 text-center`}>
              <Spinner />
            </section>
          )}

          {viewingOld && detailQuery.isError && (
            <section
              className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6"
              role="alert"
            >
              <h2 className="text-base font-bold text-red-700 dark:text-red-300">{t('error.openTitle')}</h2>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{t('error.openBody')}</p>
              {detailQuery.error instanceof ApiError && detailQuery.error.message && (
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80 break-words">
                  {t('error.serverSaid', { message: detailQuery.error.message })}
                </p>
              )}
              <button
                type="button"
                onClick={() => setOpenedId(null)}
                className={`${ghostButton} mt-4 bg-white dark:bg-slate-900`}
              >
                {t('path.backToLatest')}
              </button>
            </section>
          )}

          {activePath && !generateMut.isPending && (
            <>
              <section className={`${card} p-6`}>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('path.goalLabel')}
                </div>
                <h2 className="mt-1 text-2xl font-bold">{activePath.goal || '—'}</h2>

                {activePath.payload.summary && (
                  <>
                    <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('path.summaryLabel')}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {activePath.payload.summary}
                    </p>
                  </>
                )}

                <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: t('path.totalHours'),
                      value: t('path.hoursUnit', { value: activePath.payload.totalEstimatedHours }),
                    },
                    {
                      label: t('path.weeks'),
                      value: t('path.weeksUnit', { value: activePath.payload.weeks }),
                    },
                    {
                      label: t('path.stepCount'),
                      value: t('path.stepsUnit', { value: activePath.payload.steps.length }),
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                    >
                      <dt className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</dt>
                      <dd className="mt-0.5 text-lg font-bold">{stat.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold">
                    {t('path.generatedBy', {
                      model: activePath.model || activePath.payload.model || t('path.modelUnknown'),
                    })}
                  </span>
                  <span>
                    {t('path.generatedAt', {
                      datetime: formatDateTime(activePath.createdAt || activePath.payload.generatedAt),
                    })}
                  </span>
                </div>

                {!headerActions && (
                  <button type="button" onClick={openForm} className={`${primaryButton} mt-5`}>
                    {t('path.regenerate')}
                  </button>
                )}
              </section>

              <section className={`${card} p-6`}>
                <h3 className="text-lg font-bold">{t('path.stepsHeading')}</h3>

                {activePath.payload.steps.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('path.noSteps')}</p>
                ) : (
                  <ol className="mt-5 relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8">
                    {activePath.payload.steps.map((step: LearningPathStep) => (
                      <li key={`${step.order}-${step.title}`} className="relative pl-6">
                        <span className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                          {step.order}
                        </span>

                        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {t('path.step', { order: step.order })}
                        </div>
                        <h4 className="mt-0.5 text-base font-bold">{step.title || '—'}</h4>

                        {step.objective && (
                          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                              {t('path.objective')}:{' '}
                            </span>
                            {step.objective}
                          </p>
                        )}

                        <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {t('path.estimatedHours', { value: step.estimatedHours })}
                        </div>

                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t('path.skills')}
                          </div>
                          {step.skills.length === 0 ? (
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              {t('path.noSkills')}
                            </p>
                          ) : (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {step.skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          {step.courseId ? (
                            <Link
                              to={`/student/courses/${step.courseId}`}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {t('path.openCourse')}
                              <span aria-hidden="true">→</span>
                            </Link>
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500">{t('path.noCourse')}</p>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t('path.resources')}
                          </div>
                          {step.resources.length === 0 ? (
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              {t('path.noResources')}
                            </p>
                          ) : (
                            <ul className="mt-1.5 space-y-1">
                              {step.resources.map((resource) => (
                                <li
                                  key={resource.docId || resource.title}
                                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                                >
                                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                                    •
                                  </span>
                                  <span>{resource.title || resource.docId}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <details className={`${card} px-6 py-4`}>
                <summary className="text-sm font-semibold cursor-pointer select-none">
                  {t('path.agentTrace')}
                </summary>
                {activePath.payload.agentTrace.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    {t('path.agentTraceEmpty')}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {activePath.payload.agentTrace.map((entry, index) => (
                      <li key={`${entry.agent}-${index}`} className="text-sm">
                        <span className="font-semibold">{entry.agent}</span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                          {t('path.agentElapsed', { ms: entry.elapsedMs })}
                        </span>
                        {entry.summary && (
                          <p className="text-slate-600 dark:text-slate-400">{entry.summary}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </>
          )}

          {pathQuery.isSuccess && !latestPath && !viewingOld && !generateMut.isPending && !generateMut.isError && (
            <section className={`${card} p-6`}>
              <h2 className="text-base font-bold">{t('empty.heading')}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('empty.body')}</p>
            </section>
          )}
        </div>

        <aside className={`${card} p-6`}>
          <h2 className="text-base font-bold">{t('history.heading')}</h2>

          {historyQuery.isLoading ? (
            <div className="mt-4 text-center">
              <Spinner className="w-5 h-5" />
            </div>
          ) : historyQuery.isError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t('history.loadError')}</p>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('history.empty')}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {(historyQuery.data ?? []).map((item) => {
                const isCurrent = openedId ? item.id === openedId : item.id === latestPath?.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenedId(item.id === latestPath?.id ? null : item.id)}
                      disabled={isCurrent}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="text-sm font-semibold line-clamp-2">{item.goal || '—'}</div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDate(item.createdAt)}</span>
                        <span>{t('history.itemSteps', { value: item.stepCount })}</span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {isCurrent
                          ? t('history.current')
                          : detailQuery.isFetching && openedId === item.id
                            ? t('history.opening')
                            : t('history.open')}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </StudentLayout>
  );
};

export default LearningPathPage;
