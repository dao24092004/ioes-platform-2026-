import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/app/store/authStore';
import StudentLayout from '@/components/layout/StudentLayout';

type ApplicationStatus = 'none' | 'pending' | 'rejected' | 'approved';

interface ApplicationState {
  status: ApplicationStatus;
  rejectionReason?: string;
  submittedAt?: string;
}

const SPECIALIZATION_SUGGESTIONS = [
  'Mathematics', 'Programming', 'AI / Machine Learning', 'Data Science',
  'Web Development', 'Mobile Development', 'Design', 'Business',
  'Language', 'Physics', 'Chemistry', 'Biology',
];

const FAQ_ITEMS = ['faq1', 'faq2', 'faq3'] as const;

const BecomeInstructorPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [application, setApplication] = useState<ApplicationState>({ status: 'none' });
  const [fullName, setFullName] = useState(user?.full_name ?? 'Nguyen Hoang Nam');
  const [email] = useState(user?.email ?? 'nam.nh@fpt.edu.vn');
  const [department, setDepartment] = useState('Computer Science');
  const [yearsExp, setYearsExp] = useState(3);
  const [specializations, setSpecializations] = useState<string[]>(['Programming', 'Web Development']);
  const [tagInput, setTagInput] = useState('');
  const [bio, setBio] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [motivation, setMotivation] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (specializations.includes(tag)) return;
    if (specializations.length >= 8) return;
    setSpecializations([...specializations, tag]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setSpecializations(specializations.filter(s => s !== tag));

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && specializations.length) {
      setSpecializations(specializations.slice(0, -1));
    }
  };

  const handleCvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setCvFile(file);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setApplication({ status: 'pending', submittedAt: new Date().toISOString() });
      setShowModal(true);
    }, 900);
  };

  const benefits = useMemo(
    () => [
      { key: 'benefit1', icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
      )},
      { key: 'benefit2', icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
      )},
      { key: 'benefit3', icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
      )},
      { key: 'benefit4', icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
      )},
    ],
    [],
  );

  return (
    <StudentLayout
      title={t('student.becomeInstructor.title')}
      subtitle={t('student.becomeInstructor.subtitle')}
    >
      {application.status === 'pending' && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/50 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">{t('student.becomeInstructor.statusPending')}</h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">{t('student.becomeInstructor.statusPendingDesc')}</p>
          </div>
        </div>
      )}
      {application.status === 'rejected' && (
        <div className="mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900 dark:text-red-200">{t('student.becomeInstructor.statusRejected')}</h3>
            <p className="text-xs text-red-800 dark:text-red-300 mt-1">
              {application.rejectionReason || t('student.becomeInstructor.statusRejectedDesc')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <Card title={t('student.becomeInstructor.sectionProfile')} icon={
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t('student.becomeInstructor.field.fullName')} required>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500"
                />
              </Field>
              <Field label={t('student.becomeInstructor.field.email')} required>
                <input type="email" value={email} disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                />
              </Field>
              <Field label={t('student.becomeInstructor.field.department')} required>
                <select value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Computer Science</option>
                  <option>Information Technology</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                  <option>Business Administration</option>
                  <option>Economics</option>
                  <option>Languages</option>
                  <option>Design</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label={t('student.becomeInstructor.field.yearsExp')} required>
                <input type="number" min={0} max={50} value={yearsExp} onChange={(e) => setYearsExp(parseInt(e.target.value || '0', 10))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500"
                />
              </Field>
            </div>
          </Card>

          <Card title={t('student.becomeInstructor.sectionExpertise')} icon={
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          }>
            <Field label={t('student.becomeInstructor.field.specializations')} hint={t('student.becomeInstructor.field.specializationsHint')}>
              <div className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 min-h-[46px]">
                {specializations.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900 dark:hover:text-blue-100">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  placeholder={specializations.length === 0 ? t('student.becomeInstructor.field.addTagPlaceholder') : ''}
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                />
              </div>
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
                  {t('student.becomeInstructor.suggestions')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATION_SUGGESTIONS.filter(s => !specializations.includes(s)).slice(0, 6).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addTag(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field label={t('student.becomeInstructor.field.bio')} hint={t('student.becomeInstructor.field.bioHint')}>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                placeholder={t('student.becomeInstructor.field.bioPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </Field>
          </Card>

          <Card title={t('student.becomeInstructor.sectionDocuments')} icon={
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
          }>
            <Field label={t('student.becomeInstructor.field.cv')} hint={t('student.becomeInstructor.field.cvHint')}>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleCvDrop}
                className={`block w-full rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-slate-50 dark:bg-slate-900/50'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                />
                {cvFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{cvFile.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(cvFile.size / 1024)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 mx-auto text-slate-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('student.becomeInstructor.cvDragDrop')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('student.becomeInstructor.cvFormats')}</p>
                  </>
                )}
              </label>
            </Field>

            <Field label={t('student.becomeInstructor.field.portfolio')}>
              <input type="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)}
                placeholder={t('student.becomeInstructor.field.portfolioPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500"
              />
            </Field>

            <Field label={t('student.becomeInstructor.field.motivation')} hint={t('student.becomeInstructor.field.motivationHint')}>
              <textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={4}
                placeholder={t('student.becomeInstructor.field.motivationPlaceholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </Field>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <button type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              {t('student.becomeInstructor.saveDraft')}
            </button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? t('student.becomeInstructor.submitting') : t('student.becomeInstructor.submit')}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-bold mb-1">{t('student.becomeInstructor.benefitsTitle')}</h3>
            <p className="text-sm text-blue-100 mb-5">{t('student.becomeInstructor.benefitsSubtitle')}</p>
            <ul className="space-y-3">
              {benefits.map(b => (
                <li key={b.key} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{t(`student.becomeInstructor.${b.key}Title`)}</h4>
                    <p className="text-xs text-blue-100 mt-0.5">{t(`student.becomeInstructor.${b.key}Desc`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('student.becomeInstructor.faqTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('student.becomeInstructor.faqSubtitle')}</p>
            <div className="space-y-2">
              {FAQ_ITEMS.map((key) => {
                const open = openFaq === key;
                return (
                  <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : key)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t(`student.becomeInstructor.${key}Q`)}
                      </span>
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
                        {t(`student.becomeInstructor.${key}A`)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <svg className="w-9 h-9 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('student.becomeInstructor.modalTitle')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-1">
                {t('student.becomeInstructor.modalDesc')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('student.becomeInstructor.modalTimeline')}
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowModal(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                {t('student.becomeInstructor.modalClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
        {icon}
      </div>
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);

export default BecomeInstructorPage;
