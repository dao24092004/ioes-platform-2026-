import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/StudentLayout';
import { studentApi, type StudentCertificate } from '@/services/api';

const CertificatesPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: certs = [] } = useQuery({ queryKey: ['student', 'certificates'], queryFn: () => studentApi.certificates() });

  return (
    <StudentLayout title={t('student.certificates.title')} subtitle={t('student.certificates.subtitle')}>
      {certs.length === 0 ? (
        <div className="text-center text-sm text-slate-500 py-12">{t('student.certificates.empty')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {certs.map((c: StudentCertificate) => (
            <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 flex flex-col items-center justify-center text-white text-center overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <pattern id={`p-${c.id}`} width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="white" />
                    </pattern>
                    <rect width="100" height="100" fill={`url(#p-${c.id})`} />
                  </svg>
                </div>
                <svg className="w-14 h-14 mb-2 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="6" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
                <div className="text-xs uppercase tracking-wider opacity-80 relative z-10">Certificate of Completion</div>
                <div className="text-lg font-bold mt-2 relative z-10">{c.title}</div>
                <div className="text-xs opacity-90 mt-1 relative z-10">{c.course}</div>
                <div className="text-[10px] opacity-70 mt-2 relative z-10">{c.grade}</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('student.certificates.serial')}</div>
                <div className="text-sm font-mono font-semibold mb-3">{c.serial}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('student.certificates.issued')}</div>
                <div className="text-sm mb-4">{new Date(c.issued_at).toLocaleDateString('vi-VN')}</div>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                    {t('student.certificates.download')}
                  </button>
                  <button className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-xs font-semibold transition-colors">
                    {t('student.certificates.share')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentLayout>
  );
};

export default CertificatesPage;
