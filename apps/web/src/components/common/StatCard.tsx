import React from 'react';

export type StatCardColor = 'blue' | 'teal' | 'orange' | 'green' | 'purple' | 'amber' | 'cyan' | 'pink' | 'emerald' | 'rose' | 'amber-red';

export interface StatCardProps {
  color: StatCardColor;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  change?: string;
  changeTrend?: 'up' | 'down' | 'flat';
}

const colorMap: Record<StatCardColor, string> = {
  blue: 'from-blue-500 to-cyan-500',
  teal: 'from-teal-500 to-emerald-500',
  orange: 'from-amber-500 to-orange-500',
  green: 'from-emerald-500 to-green-500',
  purple: 'from-purple-500 to-fuchsia-500',
  amber: 'from-amber-500 to-yellow-500',
  cyan: 'from-cyan-500 to-sky-500',
  pink: 'from-pink-500 to-rose-500',
  emerald: 'from-emerald-500 to-teal-500',
  rose: 'from-rose-500 to-pink-500',
  'amber-red': 'from-amber-500 to-red-500',
};

const trendColor: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  flat: 'text-slate-500 dark:text-slate-400',
};

export const StatCard: React.FC<StatCardProps> = ({ color, icon, value, label, change, changeTrend = 'up' }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
    <div className="flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white flex-shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${trendColor[changeTrend]}`}>
            {changeTrend === 'up' && (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {changeTrend === 'down' && (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {change}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default StatCard;
