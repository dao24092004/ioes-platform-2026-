import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type PaymentMethod = 'card' | 'vnpay' | 'momo' | 'bank';

interface CheckoutCourse {
  slug: string;
  title: string;
  instructorName: string;
  iconKey: 'brain' | 'code' | 'rocket' | 'briefcase' | 'globe';
  durationHours: number;
  totalLessons: number;
  rating: number;
  originalPrice: number;
  currentPrice: number;
  isFree: boolean;
}

const MOCK_COURSES: CheckoutCourse[] = [
  {
    slug: 'machine-learning-fundamentals',
    title: 'Machine Learning Fundamentals',
    instructorName: 'TS. Nguyễn Văn A',
    iconKey: 'brain',
    durationHours: 42,
    totalLessons: 156,
    rating: 4.9,
    originalPrice: 1000000,
    currentPrice: 799000,
    isFree: false,
  },
  {
    slug: 'chatgpt-ai-tools-masterclass',
    title: 'ChatGPT & AI Tools Masterclass',
    instructorName: 'Trần Thị B',
    iconKey: 'rocket',
    durationHours: 40,
    totalLessons: 120,
    rating: 4.9,
    originalPrice: 1299000,
    currentPrice: 1299000,
    isFree: false,
  },
  {
    slug: 'mba-essentials-quan-tri-kinh-doanh',
    title: 'MBA Essentials',
    instructorName: 'Phạm Văn D',
    iconKey: 'briefcase',
    durationHours: 120,
    totalLessons: 200,
    rating: 4.9,
    originalPrice: 2999000,
    currentPrice: 2499000,
    isFree: false,
  },
];

const ICON_PATHS: Record<CheckoutCourse['iconKey'], string> = {
  brain: 'M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 01.18-4.93A2.5 2.5 0 019.5 2z M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-.18-4.93A2.5 2.5 0 0014.5 2z',
  code: 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
  rocket: 'M5 13l4-4 4 4-4 4-4-4zM12.5 2.5a8.38 8.38 0 016.5 6.5l-2.5 2.5-6.5-6.5L12.5 2.5z',
  briefcase: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16',
  globe: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20',
};

const PAYMENT_ICONS: Record<PaymentMethod, { svg: React.ReactNode; color: string }> = {
  card: {
    color: 'text-blue-600',
    svg: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  vnpay: {
    color: 'text-red-600',
    svg: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
  momo: {
    color: 'text-pink-600',
    svg: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h7" />
        <path d="M16 21l5-5-5-5" />
        <path d="M21 16H9" />
      </svg>
    ),
  },
  bank: {
    color: 'text-blue-700',
    svg: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    ),
  },
};

const PROMOS: Record<string, { percent: number; label: string }> = {
  IOES2026: { percent: 20, label: 'IOES2026' },
  WELCOME: { percent: 10, label: 'WELCOME' },
  STUDENT: { percent: 15, label: 'STUDENT' },
};

const formatVND = (n: number): string => n.toLocaleString('vi-VN') + 'đ';
const formatCardNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};
const formatExpiry = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const course = useMemo(() => MOCK_COURSES.find((c) => c.slug === slug), [slug]);

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');

  const [processing, setProcessing] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('publicCheckout.notFound.title')}</h1>
          <p className="text-slate-500 mb-6">{t('publicCheckout.notFound.desc')}</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            {t('publicCheckout.notFound.back')}
          </Link>
        </div>
      </div>
    );
  }

  const discountPercent = promoApplied ? PROMOS[promoApplied].percent : 0;
  // Tổng giảm = (giá gốc - giá bán) + % promo trên giá bán
  const totalDiscount = course.originalPrice - course.currentPrice + Math.round(course.currentPrice * (discountPercent / 100));
  const finalPrice = Math.max(0, course.originalPrice - totalDiscount);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError(t('publicCheckout.promo.emptyError'));
      return;
    }
    if (PROMOS[code]) {
      setPromoApplied(code);
      setPromoError('');
    } else {
      setPromoError(t('publicCheckout.promo.invalidError'));
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(null);
    setPromoInput('');
    setPromoError('');
  };

  const validateCard = (): boolean => {
    if (method !== 'card') return true;
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 13) return false;
    if (!/^\d{3,4}$/.test(cvv)) return false;
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    if (!cardName.trim()) return false;
    return true;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'card' && !validateCard()) return;
    if (!email.trim() || !phone.trim()) return;

    setProcessing(true);
    // TODO: POST /api/checkout — process payment
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setProcessing(false);
    setSuccessOpen(true);
  };

  const successContinue = () => {
    setSuccessOpen(false);
    navigate('/student');
  };

  const paymentMethods: { key: PaymentMethod; title: string; desc: string; showQR?: boolean; qrNote?: string }[] = [
    { key: 'card', title: t('publicCheckout.method.card.title'), desc: t('publicCheckout.method.card.desc') },
    {
      key: 'vnpay',
      title: t('publicCheckout.method.vnpay.title'),
      desc: t('publicCheckout.method.vnpay.desc'),
      showQR: true,
      qrNote: t('publicCheckout.method.vnpay.qrNote'),
    },
    {
      key: 'momo',
      title: t('publicCheckout.method.momo.title'),
      desc: t('publicCheckout.method.momo.desc'),
      showQR: true,
      qrNote: t('publicCheckout.method.momo.qrNote'),
    },
    { key: 'bank', title: t('publicCheckout.method.bank.title'), desc: t('publicCheckout.method.bank.desc') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">IOES</span>
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            {t('publicCheckout.secureBadge')}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-[1fr_400px] gap-10">
        {/* Left — Form */}
        <form onSubmit={handlePay} className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-900 dark:text-white">
            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            {t('publicCheckout.title')}
          </h1>

          {/* Course info card */}
          <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-6">
            <div className="w-28 h-20 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d={ICON_PATHS[course.iconKey]} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 truncate">{course.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {t('publicCheckout.instructor')}: {course.instructorName}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {t('publicCheckout.hours', { count: course.durationHours })}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {t('publicCheckout.lessons', { count: course.totalLessons })}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {course.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Email + phone */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                {t('publicCheckout.email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                {t('publicCheckout.phone')}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0987654321"
                className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {/* Payment methods */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
              {t('publicCheckout.paymentMethod')}
            </label>
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <button
                  type="button"
                  key={pm.key}
                  onClick={() => setMethod(pm.key)}
                  className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all text-left ${
                    method === pm.key
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      method === pm.key ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {method === pm.key && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </span>
                  <div
                    className={`w-12 h-9 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 ${
                      PAYMENT_ICONS[pm.key].color
                    }`}
                  >
                    {PAYMENT_ICONS[pm.key].svg}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{pm.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{pm.desc}</div>
                  </div>
                  {method === pm.key && (
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Card form */}
          {method === 'card' && (
            <div className="space-y-4 mb-6 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  {t('publicCheckout.card.number')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono tracking-wider"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                    {t('publicCheckout.card.expiry')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                    {t('publicCheckout.card.cvv')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  {t('publicCheckout.card.name')}
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>
          )}

          {/* QR section */}
          {(method === 'vnpay' || method === 'momo') && (
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl mb-6">
              <div className="w-40 h-40 mx-auto mb-3 bg-white dark:bg-white border border-slate-200 rounded-2xl flex items-center justify-center">
                {/* Decorative QR pattern using nested divs */}
                <svg viewBox="0 0 100 100" className="w-36 h-36 text-slate-900">
                  <rect width="100" height="100" fill="white" />
                  {/* Corner squares */}
                  <rect x="5" y="5" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="73" y="5" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="5" y="73" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="11" y="11" width="10" height="10" fill="currentColor" />
                  <rect x="79" y="11" width="10" height="10" fill="currentColor" />
                  <rect x="11" y="79" width="10" height="10" fill="currentColor" />
                  {/* Random dots */}
                  {Array.from({ length: 12 }).map((_, row) =>
                    Array.from({ length: 12 }).map((_, col) => {
                      if ((row < 3 && col < 3) || (row < 3 && col > 8) || (row > 8 && col < 3)) return null;
                      return (
                        <rect
                          key={`${row}-${col}`}
                          x={32 + col * 3}
                          y={32 + row * 3}
                          width="2.4"
                          height="2.4"
                          fill={((row * 7 + col * 13) % 3 === 0) ? 'currentColor' : 'transparent'}
                        />
                      );
                    }),
                  )}
                </svg>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {paymentMethods.find((p) => p.key === method)?.qrNote}
              </p>
            </div>
          )}

          {/* Bank transfer info */}
          {method === 'bank' && (
            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl mb-6 text-sm space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white mb-2">{t('publicCheckout.bank.info')}</div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('publicCheckout.bank.bankName')}</span>
                <span className="font-mono">VCB - Vietcombank</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('publicCheckout.bank.accountNumber')}</span>
                <span className="font-mono">1234 5678 9012</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('publicCheckout.bank.accountName')}</span>
                <span>IOES TECHNOLOGY JSC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('publicCheckout.bank.amount')}</span>
                <span className="font-semibold text-blue-600">{formatVND(finalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('publicCheckout.bank.content')}</span>
                <span className="font-mono text-xs">IOES {course.slug.toUpperCase().slice(0, 10)}</span>
              </div>
            </div>
          )}

          {/* Promo code */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 mb-6">
            <label className="block text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
              {t('publicCheckout.promo.label')}
            </label>
            {promoApplied ? (
              <div className="flex items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  {t('publicCheckout.promo.applied', {
                    code: promoApplied,
                    percent: PROMOS[promoApplied].percent,
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="text-xs text-slate-500 hover:text-red-500 font-medium"
                >
                  {t('publicCheckout.promo.remove')}
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError('');
                    }}
                    placeholder={t('publicCheckout.promo.placeholder')}
                    className="flex-1 px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 uppercase font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {t('publicCheckout.promo.apply')}
                  </button>
                </div>
                {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('publicCheckout.promo.hint')}
                </p>
              </>
            )}
          </div>

          {/* Pay button */}
          <button
            type="submit"
            disabled={processing || !email || !phone}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('publicCheckout.processing')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {t('publicCheckout.payNow', { amount: formatVND(finalPrice) })}
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {t('publicCheckout.sslNote')}
          </p>
        </form>

        {/* Right — Summary */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-bold mb-5 text-slate-900 dark:text-white">
              {t('publicCheckout.summary.title')}
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('publicCheckout.summary.originalPrice')}</span>
                <span className={course.originalPrice !== course.currentPrice ? 'line-through text-slate-400' : 'font-semibold'}>
                  {formatVND(course.originalPrice)}
                </span>
              </div>
              {course.originalPrice !== course.currentPrice && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{t('publicCheckout.summary.saleDiscount')}</span>
                  <span className="font-semibold">-{formatVND(course.originalPrice - course.currentPrice)}</span>
                </div>
              )}
              {promoApplied && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{t('publicCheckout.summary.promoDiscount', { code: promoApplied, percent: PROMOS[promoApplied].percent })}</span>
                  <span className="font-semibold">-{formatVND(Math.round(course.currentPrice * (discountPercent / 100)))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('publicCheckout.summary.processingFee')}</span>
                <span>{t('publicCheckout.summary.free')}</span>
              </div>

              <div className="my-4 h-px bg-slate-100 dark:bg-slate-700" />

              <div className="flex items-end justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{t('publicCheckout.summary.total')}</span>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{formatVND(finalPrice)}</div>
                  {course.originalPrice !== course.currentPrice && (
                    <div className="text-xs text-slate-400 line-through">{formatVND(course.originalPrice)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-3">
                {t('publicCheckout.summary.youGet')}
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCheckout.summary.features.lifetime')}
                </li>
                <li className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCheckout.summary.features.certificate')}
                </li>
                <li className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCheckout.summary.features.aiMentor')}
                </li>
                <li className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCheckout.summary.features.updates')}
                </li>
                <li className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t('publicCheckout.summary.features.materials')}
                </li>
              </ul>
            </div>

            {/* Trust badges */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-3">
                {t('publicCheckout.summary.commitment')}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600 mx-auto mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    {t('publicCheckout.summary.trust.refund')}
                  </div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600 mx-auto mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    {t('publicCheckout.summary.trust.support')}
                  </div>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600 mx-auto mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="6" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                    {t('publicCheckout.summary.trust.blockchain')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Success Modal */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{t('publicCheckout.success.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {t('publicCheckout.success.desc', { title: course.title })}
            </p>
            <button
              onClick={successContinue}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors"
            >
              {t('publicCheckout.success.continue')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;