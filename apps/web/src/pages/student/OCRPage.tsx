import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';

type OcrMode = 'document' | 'handwriting' | 'receipt' | 'idcard';
type OcrLang = 'vi' | 'en';

interface OcrJob {
  id: string;
  title: string;
  status: 'success' | 'failed';
  time: string;
  lines: number;
}

interface ExtractedLine {
  text: string;
  confidence: number;
}

const MOCK_MODES: { id: OcrMode; icon: React.ReactNode }[] = [
  {
    id: 'document',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    id: 'handwriting',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    id: 'receipt',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 2V2H4z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="13" y2="15" />
      </svg>
    ),
  },
  {
    id: 'idcard',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2.5" />
        <line x1="14" y1="10" x2="19" y2="10" />
        <line x1="14" y1="13" x2="19" y2="13" />
        <line x1="6" y1="17" x2="18" y2="17" />
      </svg>
    ),
  },
];

const MOCK_LANGS: { id: OcrLang }[] = [{ id: 'vi' }, { id: 'en' }];

const MOCK_HISTORY: OcrJob[] = [
  { id: 'j-1024', title: 'Lecture_Notes_Week4.png', status: 'success', time: '2 min ago', lines: 38 },
  { id: 'j-1023', title: 'Receipt_07_25.pdf', status: 'success', time: '15 min ago', lines: 12 },
  { id: 'j-1022', title: 'ID_Card_Front.jpg', status: 'failed', time: '1 hour ago', lines: 0 },
  { id: 'j-1021', title: 'Chemistry_Handout.pdf', status: 'success', time: '3 hours ago', lines: 54 },
  { id: 'j-1020', title: 'Math_Exercise_3.png', status: 'success', time: 'Yesterday', lines: 22 },
  { id: 'j-1019', title: 'Invoice_Aug.pdf', status: 'success', time: 'Yesterday', lines: 18 },
];

const MOCK_EXTRACTED: ExtractedLine[] = [
  { text: 'IoT-based Smart Agriculture Monitoring System', confidence: 98 },
  { text: 'Lecture 4 — Introduction to Sensors and Actuators', confidence: 96 },
  { text: 'Nguyen Van An — Student ID: 2024CS001', confidence: 92 },
  { text: 'A sensor is a device that detects physical changes', confidence: 95 },
  { text: 'and converts them into electrical signals which', confidence: 88 },
  { text: 'can be read by an observer or by an instrument.', confidence: 91 },
  { text: 'Common types: temperature, humidity, pressure,', confidence: 84 },
  { text: 'motion, light, and gas sensors. — End of section —', confidence: 79 },
];

const confidenceColor = (c: number): string => {
  if (c >= 95) return 'bg-emerald-500';
  if (c >= 85) return 'bg-blue-500';
  if (c >= 70) return 'bg-amber-500';
  return 'bg-red-500';
};

const confidenceLabel = (c: number, t: (k: string) => string): string => {
  if (c >= 95) return t('student.ocr.confidence.high');
  if (c >= 85) return t('student.ocr.confidence.good');
  if (c >= 70) return t('student.ocr.confidence.fair');
  return t('student.ocr.confidence.low');
};

const DocumentPreviewSVG: React.FC<{ mode: OcrMode; lang: OcrLang }> = ({ mode, lang }) => {
  const labelMap: Record<OcrMode, { vi: string; en: string }> = {
    document: { vi: 'Tai lieu', en: 'Document' },
    handwriting: { vi: 'Chu viet tay', en: 'Handwriting' },
    receipt: { vi: 'Hoa don', en: 'Receipt' },
    idcard: { vi: 'CMND / CCCD', en: 'ID Card' },
  };
  const label = labelMap[mode][lang];
  return (
    <svg viewBox="0 0 320 380" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="paperBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="280" height="340" rx="10" fill="url(#paperBg)" stroke="#cbd5e1" strokeWidth="1" />
      <text x="160" y="55" textAnchor="middle" fontFamily="ui-sans-serif" fontSize="14" fontWeight="700" fill="#475569">
        {label}
      </text>
      <line x1="50" y1="75" x2="270" y2="75" stroke="#94a3b8" strokeWidth="1.5" />
      <g fontFamily="ui-monospace, monospace" fontStyle="italic" fontSize="11" fill="#1e293b">
        <text x="45" y="100">Lecture 4 — IoT Sensors Overview</text>
        <text x="45" y="120">Nguyen Van An, 2024CS001</text>
        <text x="45" y="150">A sensor is a device that detects</text>
        <text x="45" y="168">physical changes and converts them</text>
        <text x="45" y="186">into electrical signals which can be</text>
        <text x="45" y="204">read by an observer or instrument.</text>
        <text x="45" y="232">Common types:</text>
        <text x="60" y="250">• temperature, humidity</text>
        <text x="60" y="268">• pressure, motion, light</text>
        <text x="60" y="286">• gas and chemical sensors</text>
        <text x="45" y="316">— End of section —</text>
      </g>
      <g opacity="0.25">
        <circle cx="60" cy="60" r="14" fill="none" stroke="#ef4444" strokeWidth="1.5" />
        <text x="60" y="65" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ef4444">OCR</text>
      </g>
    </svg>
  );
};

const OCRPage: React.FC = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<OcrMode>('document');
  const [lang, setLang] = useState<OcrLang>('vi');
  const [uploaded, setUploaded] = useState(true);
  const [editedText, setEditedText] = useState(
    MOCK_EXTRACTED.map(l => l.text).join('\n'),
  );
  const [dragging, setDragging] = useState(false);

  const avgConfidence = useMemo(
    () => Math.round(MOCK_EXTRACTED.reduce((s, l) => s + l.confidence, 0) / MOCK_EXTRACTED.length),
    [],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    setUploaded(true);
  };

  const copyText = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(editedText).catch(() => undefined);
    }
  };

  return (
    <StudentLayout
      title={t('student.ocr.title')}
      subtitle={t('student.ocr.subtitle')}
      headerActions={
        <>
          <button className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {t('student.ocr.howItWorks')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
            </svg>
            {t('student.ocr.upload')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  {t('student.ocr.modeLabel')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {MOCK_MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        mode === m.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {m.icon}
                      {t(`student.ocr.modes.${m.id}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  {t('student.ocr.langLabel')}
                </div>
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {MOCK_LANGS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLang(l.id)}
                      className={`px-4 py-2 text-sm font-semibold transition-colors ${
                        lang === l.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t(`student.ocr.langs.${l.id}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!uploaded && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
                dragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('student.ocr.dropzone.title')}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-md mx-auto">
                {t('student.ocr.dropzone.desc')}
              </p>
              <button
                onClick={() => setUploaded(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                {t('student.ocr.dropzone.browse')}
              </button>
              <p className="text-[11px] text-slate-400 mt-4">{t('student.ocr.dropzone.formats')}</p>
            </div>
          )}

          {uploaded && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t('student.ocr.preview.original')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    lecture_notes_04.png
                  </span>
                </div>
                <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                  <DocumentPreviewSVG mode={mode} lang={lang} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t('student.ocr.preview.extracted')}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    {t('student.ocr.preview.avgConfidence', { value: avgConfidence })}
                  </span>
                </div>
                <div className="flex">
                  <div className="w-10 py-4 bg-slate-50 dark:bg-slate-900/40 border-r border-slate-100 dark:border-slate-700 text-[11px] font-mono text-slate-400 text-right pr-2 select-none">
                    {MOCK_EXTRACTED.map((_, i) => (
                      <div key={i} className="leading-6">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    spellCheck={false}
                    className="flex-1 px-4 py-4 bg-transparent text-sm leading-6 font-mono text-slate-800 dark:text-slate-200 resize-none focus:outline-none min-h-[260px]"
                  />
                </div>
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MOCK_EXTRACTED.map((line, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400"
                    >
                      <span className={`w-2 h-2 rounded-full ${confidenceColor(line.confidence)}`} />
                      <span className="font-mono">{line.confidence}%</span>
                      <span className="text-slate-400">{confidenceLabel(line.confidence, t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {uploaded && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={copyText}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    {t('student.ocr.actions.copy')}
                  </button>
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {t('student.ocr.actions.downloadTxt')}
                  </button>
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {t('student.ocr.actions.downloadDocx')}
                  </button>
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 8l6 6 4-4 4 4" />
                      <path d="M3 21h18" />
                    </svg>
                    {t('student.ocr.actions.translate')}
                  </button>
                </div>
                <button
                  onClick={() => setUploaded(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  {t('student.ocr.actions.rescan')}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('student.ocr.history.title')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('student.ocr.history.subtitle')}
                </p>
              </div>
              <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {t('student.ocr.history.viewAll')}
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {MOCK_HISTORY.map(job => (
                <li
                  key={job.id}
                  className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-slate-500 dark:text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {job.title}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            job.status === 'success'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {job.status === 'success'
                            ? t('student.ocr.history.success')
                            : t('student.ocr.history.failed')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {job.time} · {t('student.ocr.history.lines', { count: job.lines })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </StudentLayout>
  );
};

export default OCRPage;
