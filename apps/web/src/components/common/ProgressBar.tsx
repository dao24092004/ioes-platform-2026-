import React from 'react';

/** Thanh tiến độ 0–100; đạt 100 thì đổi sang màu hoàn thành. */
const ProgressBar: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={`h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default ProgressBar;
