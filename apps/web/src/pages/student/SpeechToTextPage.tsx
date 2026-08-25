import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StudentLayout from '@/components/layout/StudentLayout';

type LangKey = 'vi' | 'en' | 'ja' | 'ko' | 'zh';
type ModeKey = 'transcription' | 'pronunciation' | 'conversation';

type TranscriptLine = {
  id: string;
  text: string;
  ts: string;
  confidence: number;
};

type Phoneme = { char: string; score: number };

type Word = { word: string; status: 'matched' | 'mispronounced' | 'missing' };

const LANGUAGES: { key: LangKey; label: string; flag: string }[] = [
  { key: 'vi', label: 'student.speechToText.lang.vi', flag: '🇻🇳' },
  { key: 'en', label: 'student.speechToText.lang.en', flag: '🇺🇸' },
  { key: 'ja', label: 'student.speechToText.lang.ja', flag: '🇯🇵' },
  { key: 'ko', label: 'student.speechToText.lang.ko', flag: '🇰🇷' },
  { key: 'zh', label: 'student.speechToText.lang.zh', flag: '🇨🇳' },
];

const PHONEMES_BY_LANG: Record<LangKey, Phoneme[]> = {
  vi: [
    { char: '/h/', score: 92 },
    { char: '/ɛ/', score: 88 },
    { char: '/l/', score: 95 },
    { char: '/ɔ/', score: 76 },
    { char: '/w/', score: 90 },
  ],
  en: [
    { char: '/θ/', score: 81 },
    { char: '/ð/', score: 74 },
    { char: '/r/', score: 88 },
    { char: '/æ/', score: 92 },
    { char: '/ʃ/', score: 86 },
  ],
  ja: [
    { char: 'tsu', score: 90 },
    { char: 'shi', score: 84 },
    { char: 'ryu', score: 72 },
    { char: 'ka', score: 94 },
    { char: 'no', score: 88 },
  ],
  ko: [
    { char: 'ㄱ', score: 91 },
    { char: 'ㄴ', score: 86 },
    { char: 'ㅊ', score: 78 },
    { char: 'ㅇ', score: 93 },
    { char: 'ㅎ', score: 82 },
  ],
  zh: [
    { char: 'zh', score: 80 },
    { char: 'ch', score: 76 },
    { char: 'sh', score: 85 },
    { char: 'ang', score: 90 },
    { char: 'eng', score: 88 },
  ],
};

const SAMPLE_TRANSCRIPTS: Record<LangKey, TranscriptLine[]> = {
  en: [
    { id: 't1', text: 'Hello, my name is Alex and I am learning English.', ts: '00:00:02', confidence: 0.96 },
    { id: 't2', text: 'I enjoy reading books about science and technology.', ts: '00:00:06', confidence: 0.92 },
    { id: 't3', text: 'Today I want to practice my pronunciation skills.', ts: '00:00:10', confidence: 0.88 },
  ],
  vi: [
    { id: 't1', text: 'Xin chào, tôi tên là An và tôi đang học tiếng Anh.', ts: '00:00:02', confidence: 0.94 },
    { id: 't2', text: 'Tôi thích đọc sách về khoa học và công nghệ.', ts: '00:00:06', confidence: 0.90 },
    { id: 't3', text: 'Hôm nay tôi muốn luyện tập phát âm của mình.', ts: '00:00:10', confidence: 0.86 },
  ],
  ja: [
    { id: 't1', text: 'こんにちは、私の名前はアレックスです。', ts: '00:00:02', confidence: 0.93 },
    { id: 't2', text: '科学と技術についての本を読むのが好きです。', ts: '00:00:06', confidence: 0.88 },
    { id: 't3', text: '今日は発音の練習をしたいです。', ts: '00:00:10', confidence: 0.84 },
  ],
  ko: [
    { id: 't1', text: '안녕하세요, 제 이름은 알렉스입니다.', ts: '00:00:02', confidence: 0.92 },
    { id: 't2', text: '저는 과학과 기술에 관한 책을 읽는 것을 좋아합니다.', ts: '00:00:06', confidence: 0.86 },
    { id: 't3', text: '오늘은 발음 연습을 하고 싶습니다.', ts: '00:00:10', confidence: 0.82 },
  ],
  zh: [
    { id: 't1', text: '你好,我叫亚历克斯,我正在学习英语。', ts: '00:00:02', confidence: 0.94 },
    { id: 't2', text: '我喜欢阅读关于科学和技术的书籍。', ts: '00:00:06', confidence: 0.89 },
    { id: 't3', text: '今天我想练习我的发音技巧。', ts: '00:00:10', confidence: 0.85 },
  ],
};

const SAMPLE_WORDS: Record<LangKey, Word[]> = {
  en: [
    { word: 'Hello', status: 'matched' },
    { word: 'my', status: 'matched' },
    { word: 'name', status: 'matched' },
    { word: 'is', status: 'matched' },
    { word: 'Alex', status: 'mispronounced' },
    { word: 'and', status: 'matched' },
    { word: 'I', status: 'matched' },
    { word: 'am', status: 'matched' },
    { word: 'learning', status: 'mispronounced' },
    { word: 'English', status: 'matched' },
    { word: 'today', status: 'matched' },
    { word: 'practice', status: 'missing' },
  ],
  vi: [
    { word: 'Xin', status: 'matched' },
    { word: 'chào', status: 'matched' },
    { word: 'tôi', status: 'matched' },
    { word: 'tên', status: 'matched' },
    { word: 'là', status: 'matched' },
    { word: 'An', status: 'mispronounced' },
    { word: 'đang', status: 'matched' },
    { word: 'học', status: 'matched' },
    { word: 'tiếng', status: 'missing' },
    { word: 'Anh', status: 'matched' },
  ],
  ja: [
    { word: 'こんにちは', status: 'matched' },
    { word: '私', status: 'matched' },
    { word: '名前', status: 'matched' },
    { word: 'は', status: 'matched' },
    { word: 'アレックス', status: 'mispronounced' },
    { word: 'です', status: 'matched' },
  ],
  ko: [
    { word: '안녕하세요', status: 'matched' },
    { word: '제', status: 'matched' },
    { word: '이름', status: 'matched' },
    { word: '알렉스', status: 'mispronounced' },
    { word: '입니다', status: 'matched' },
  ],
  zh: [
    { word: '你好', status: 'matched' },
    { word: '我叫', status: 'matched' },
    { word: '亚历克斯', status: 'mispronounced' },
    { word: '学习', status: 'matched' },
    { word: '英语', status: 'matched' },
  ],
};

const WAVEFORM_BARS = Array.from({ length: 48 }, (_, i) => i);

const SpeechToTextPage: React.FC = () => {
  const { t } = useTranslation();
  const [lang, setLang] = useState<LangKey>('en');
  const [mode, setMode] = useState<ModeKey>('transcription');
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const transcripts = SAMPLE_TRANSCRIPTS[lang];
  const phonemes = PHONEMES_BY_LANG[lang];
  const words = SAMPLE_WORDS[lang];

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const accuracy = useMemo(() => {
    const matched = words.filter(w => w.status === 'matched').length;
    return Math.round((matched / words.length) * 100);
  }, [words]);

  const matchedCount = words.filter(w => w.status === 'matched').length;
  const misCount = words.filter(w => w.status === 'mispronounced').length;
  const missingCount = words.filter(w => w.status === 'missing').length;

  const wordTone: Record<Word['status'], string> = {
    matched: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    mispronounced: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700',
    missing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  };

  const statCards = [
    {
      value: `${accuracy}%`,
      label: t('student.speechToText.stats.accuracy'),
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
    },
    {
      value: '14',
      label: t('student.speechToText.stats.sentences'),
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
    },
    {
      value: '128',
      label: t('student.speechToText.stats.words'),
      tone: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16" /></svg>,
    },
    {
      value: '92%',
      label: t('student.speechToText.stats.confidence'),
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    },
  ];

  return (
    <StudentLayout
      title={t('student.speechToText.title')}
      subtitle={t('student.speechToText.subtitle')}
      headerActions={
        <>
          <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {t('student.speechToText.history')}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
            {t('student.speechToText.practiceNew')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.tone}`}>
                {c.icon}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{c.value}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              {t('student.speechToText.filter.language')}
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangKey)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-none focus:border-blue-500"
            >
              {LANGUAGES.map(l => (
                <option key={l.key} value={l.key}>{l.flag} {t(l.label)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              {t('student.speechToText.filter.mode')}
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900/40">
              {(['transcription', 'pronunciation', 'conversation'] as ModeKey[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    mode === m
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {t(`student.speechToText.mode.${m}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('student.speechToText.transcript.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('student.speechToText.transcript.subtitle')}</p>
            </div>
            <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{formatTime(elapsed)}</span>
          </div>

          <div className="flex flex-col items-center py-6">
            <div className="relative">
              {recording && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                  <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" />
                </>
              )}
              <button
                onClick={() => setRecording(r => !r)}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                  recording
                    ? 'bg-gradient-to-br from-red-500 to-red-600'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-105'
                }`}
              >
                {recording ? (
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4">
              {recording ? t('student.speechToText.recording') : t('student.speechToText.tapToRecord')}
            </p>
          </div>

          <div
            ref={scrollRef}
            className="mt-4 max-h-72 overflow-y-auto pr-1 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4"
          >
            {transcripts.map(line => (
              <div key={line.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-1 shrink-0">{line.ts}</span>
                <p className="flex-1 text-sm text-slate-800 dark:text-slate-200">{line.text}</p>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                    line.confidence >= 0.9
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : line.confidence >= 0.8
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {Math.round(line.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              {t('student.speechToText.action.play')}
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              {t('student.speechToText.action.download')}
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              {t('student.speechToText.action.save')}
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              {t('student.speechToText.action.share')}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('student.speechToText.waveform.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('student.speechToText.waveform.subtitle')}</p>
            <div className="flex items-end justify-between gap-1 h-24 px-1">
              {WAVEFORM_BARS.map((_, i) => {
                const base = 20 + Math.abs(Math.sin(i * 0.4)) * 60;
                const animated = recording ? base + (Math.sin(i + elapsed * 2) + 1) * 10 : base;
                const h = Math.max(8, Math.min(96, animated));
                const tone = recording
                  ? 'bg-gradient-to-t from-blue-500 to-indigo-500'
                  : 'bg-slate-300 dark:bg-slate-700';
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${tone} transition-all`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('student.speechToText.phonemes.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('student.speechToText.phonemes.subtitle')}</p>
            <div className="space-y-2.5">
              {phonemes.map((p, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{p.char}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{p.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        p.score >= 85 ? 'bg-emerald-500' : p.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('student.speechToText.words.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('student.speechToText.words.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {t('student.speechToText.words.matched')} ({matchedCount})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              {t('student.speechToText.words.mispronounced')} ({misCount})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {t('student.speechToText.words.missing')} ({missingCount})
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {words.map((w, i) => (
            <span
              key={i}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${wordTone[w.status]}`}
            >
              {w.word}
            </span>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

export default SpeechToTextPage;