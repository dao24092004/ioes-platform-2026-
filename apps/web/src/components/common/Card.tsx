import React from 'react';

export interface CardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md';
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, action, children, padding = 'md', className = '' }) => {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : 'p-5';
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          {title && <div className="flex-1 min-w-0">{title}</div>}
          {action}
        </div>
      )}
      <div className={pad}>{children}</div>
    </div>
  );
};

export type CardTitleColor = 'primary' | 'warning' | 'success' | 'accent' | 'purple' | 'danger';

export interface CardTitleWithIconProps {
  color: CardTitleColor;
  children: React.ReactNode;
}

const titleColorMap: Record<CardTitleColor, string> = {
  primary: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  accent: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
};

export const CardTitleWithIcon: React.FC<CardTitleWithIconProps> = ({ color, children }) => {
  const arr = React.Children.toArray(children);
  const [icon, ...rest] = arr;
  return (
    <h2 className="flex items-center gap-3 text-base font-bold text-slate-900 dark:text-white">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${titleColorMap[color]}`}>{icon}</span>
      <span className="truncate">{rest}</span>
    </h2>
  );
};

export default Card;
