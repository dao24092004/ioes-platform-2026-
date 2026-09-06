import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';

interface PresetCertificate {
  id: string;
  hash: string;
  status: 'valid' | 'invalid';
  studentName: string;
  courseName: string;
  completionDate: string;
  score: number;
  txHash: string;
  issuedBy: string;
}

const PRESETS: PresetCertificate[] = [
  {
    id: 'CERT-2026-A12F4B',
    hash: '0xa3f9c12bd8e74f1c9a02b6e8f3d47c512b9a0d6e8f3a7b2c1e9d4f6a8b3c0e2f',
    status: 'valid',
    studentName: 'Nguyen Hoang Nam',
    courseName: 'Full-Stack Web Development Bootcamp 2026',
    completionDate: '2026-07-12',
    score: 92,
    txHash: '0x9f8e7d6c5b4a39281706f5e4d3c2b1a0987654321fedcba9876543210abcdef12',
    issuedBy: 'FPT University',
  },
  {
    id: 'CERT-2026-9C8D2E',
    hash: '0x4d2e1f8c9a0b3c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d',
    status: 'valid',
    studentName: 'Tran Thi Mai',
    courseName: 'AI Engineering Professional',
    completionDate: '2026-05-30',
    score: 88,
    txHash: '0x1a2b3c4d5e6f70819293a4b5c6d7e8f900112233445566778899aabbccddeeff0',
    issuedBy: 'IOES Academy',
  },
  {
    id: 'CERT-FAKE-XYZ123',
    hash: '0xINVALID0000000000000000000000000000000000000000000000000000000000',
    status: 'invalid',
    studentName: '—',
    courseName: '—',
    completionDate: '—',
    score: 0,
    txHash: '—',
    issuedBy: '—',
  },
];

const QrPattern: React.FC<{ seed: string }> = ({ seed }) => {
  // Deterministic 16x16 random pattern seeded from the certificate id
  const grid = useMemo(() => {
    const cells: boolean[] = [];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    for (let i = 0; i < 16 * 16; i++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      cells.push((h & 1) === 1);
    }
    return cells;
  }, [seed]);

  return (
    <svg viewBox="0 0 16 16" className="w-full h-full">
      <rect width="16" height="16" fill="white" />
      {grid.map((on, idx) =>
        on ? <rect key={idx} x={idx % 16} y={Math.floor(idx / 16)} width="1" height="1" fill="#0f172a" /> : null,
      )}
      <rect x="0" y="0" width="3" height="3" fill="#0f172a" />
      <rect x="1" y="1" width="1" height="1" fill="white" />
      <rect x="13" y="0" width="3" height="3" fill="#0f172a" />
      <rect x="14" y="1" width="1" height="1" fill="white" />
      <rect x="0" y="13" width="3" height="3" fill="#0f172a" />
      <rect x="1" y="14" width="1" height="1" fill="white" />
    </svg>
  );
};

const VerifyCertificatePage: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PresetCertificate | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'done'>('idle');
  const [notFound, setNotFound] = useState(false);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatus('searching');
    setNotFound(false);
    setResult(null);
    setTimeout(() => {
      const q = query.trim();
      const found = PRESETS.find(p => p.id.toLowerCase() === q.toLowerCase());
      if (found) {
        setResult(found);
        setStatus('done');
      } else {
        setNotFound(true);
        setStatus('done');
      }
    }, 700);
  };

  const handlePreset = (cert: PresetCertificate) => {
    setQuery(cert.id);
    setStatus('searching');
    setNotFound(false);
    setResult(null);
    setTimeout(() => {
      setResult(cert);
      setStatus('done');
    }, 500);
  };

  const truncateHash = (hash: string, head = 8, tail = 6) => {
    if (!hash || hash === '—' || hash.length < head + tail + 3) return hash;
    return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
  };

  const polygonLink = (txHash: string) =>
    txHash && txHash.startsWith('0x') && txHash !== '—'
      ? `https://polygonscan.com/tx/${txHash}`
      : '#';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />

      <main className="pt-[72px]">
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          <div className="relative max-w-5xl mx-auto px-6 py-14 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold mb-5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span>{t('public.verifyCertificate.heroBadge')}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
              {t('public.verifyCertificate.heroTitle')}
            </h1>
            <p className="text-base md:text-lg text-blue-100 max-w-2xl mx-auto">
              {t('public.verifyCertificate.heroSubtitle')}
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 -mt-8 relative z-10 pb-20">
          <form onSubmit={handleVerify} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-5 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('public.verifyCertificate.inputPlaceholder')}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'searching'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              {status === 'searching' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {status === 'searching' ? t('public.verifyCertificate.verifying') : t('public.verifyCertificate.verifyBtn')}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('public.verifyCertificate.tryPreset')}</span>
            {PRESETS.map((p, i) => {
              const tone = p.status === 'valid'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 border-red-200 text-red-700 hover:border-red-400 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors ${tone}`}
                >
                  {p.id}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {!result && status === 'idle' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('public.verifyCertificate.empty.title')}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('public.verifyCertificate.empty.desc')}</p>
                </div>
              )}

              {status === 'searching' && !result && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                  <span className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('public.verifyCertificate.searchingDesc')}</p>
                </div>
              )}

              {notFound && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900 p-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-1">{t('public.verifyCertificate.notFound.title')}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{t('public.verifyCertificate.notFound.desc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <>
                  <div className={`rounded-2xl border-2 overflow-hidden ${result.status === 'valid' ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-red-200 dark:border-red-900/50'}`}>
                    <div className={`px-6 py-4 ${result.status === 'valid' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-red-600 to-red-700'}`}>
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2.5">
                          {result.status === 'valid' ? (
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          ) : (
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeLinejoin="round" /><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          )}
                          <h2 className="text-lg font-bold">{result.status === 'valid' ? t('public.verifyCertificate.verified') : t('public.verifyCertificate.invalid')}</h2>
                        </div>
                        <span className="text-[11px] font-mono bg-white/20 px-2.5 py-1 rounded-md">{result.id}</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      <Field label={t('public.verifyCertificate.fields.student')} value={result.studentName} />
                      <Field label={t('public.verifyCertificate.fields.course')} value={result.courseName} />
                      <Field label={t('public.verifyCertificate.fields.completion')} value={result.completionDate} />
                      <Field
                        label={t('public.verifyCertificate.fields.score')}
                        value={result.status === 'valid' ? `${result.score}/100` : result.score.toString()}
                      />
                      <Field label={t('public.verifyCertificate.fields.issuedBy')} value={result.issuedBy} />
                      <Field
                        label={t('public.verifyCertificate.fields.hash')}
                        value={truncateHash(result.hash)}
                        mono
                      />
                      <div className="md:col-span-2">
                        <Field
                          label={t('public.verifyCertificate.fields.txHash')}
                          value={truncateHash(result.txHash)}
                          mono
                        />
                      </div>
                      {result.status === 'valid' && (
                        <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('public.verifyCertificate.footerNote')}</p>
                          <a
                            href={polygonLink(result.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors"
                          >
                            {t('public.verifyCertificate.viewOnPolygon')}
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-start gap-5">
                      <div className="w-32 h-32 flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-white">
                        <QrPattern seed={result.id} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('public.verifyCertificate.qrTitle')}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{t('public.verifyCertificate.qrDesc')}</p>
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <li className="flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            <span>{t('public.verifyCertificate.qrPoint1')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            <span>{t('public.verifyCertificate.qrPoint2')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            <span>{t('public.verifyCertificate.qrPoint3')}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <aside className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('public.verifyCertificate.howTitle')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('public.verifyCertificate.howSubtitle')}</p>
                <ol className="space-y-4">
                  {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 pt-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t(`public.verifyCertificate.${step}Title`)}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">{t(`public.verifyCertificate.${step}Desc`)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
                <h3 className="text-base font-bold mb-1">{t('public.verifyCertificate.ctaTitle')}</h3>
                <p className="text-sm text-blue-100 mb-4">{t('public.verifyCertificate.ctaDesc')}</p>
                <a
                  href="mailto:verify@ioes.com"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 transition-colors"
                >
                  verify@ioes.com
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</div>
    <div className={`text-sm text-slate-900 dark:text-white ${mono ? 'font-mono' : ''} break-all`}>{value}</div>
  </div>
);

export default VerifyCertificatePage;
