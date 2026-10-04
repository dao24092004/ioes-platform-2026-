/** Wave 2C (student) — Unit: streak */
import { describe, it, expect } from 'vitest';

// Re-derived LOCKED LOGIC (mirror StreakPage internals).
const emptyYear = (today: Date) => {
  const days: { date: string; level: 0; studyMinutes: 0 }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: dateStr, level: 0, studyMinutes: 0 });
  }
  return days;
};

const deriveStats = (a: {
  currentStreak?: number;
  longestStreak?: number;
  totalStudyMinutes?: number;
  totalCoursesCompleted?: number;
  totalExamsPassed?: number;
}) => ({
  currentStreak: a.currentStreak ?? 0,
  bestStreak: a.longestStreak ?? 0,
  daysActive: a.longestStreak ?? 0,
  totalHours: Math.round((a.totalStudyMinutes ?? 0) / 60),
  lessonsCompleted: a.totalCoursesCompleted ?? 0,
  examsPassed: a.totalExamsPassed ?? 0,
});

const MILESTONES = [
  { id: 'm1', target: 7 },
  { id: 'm2', target: 30 },
  { id: 'm3', target: 100 },
  { id: 'm4', target: 365 },
];

const deriveMilestones = (currentStreak: number) =>
  MILESTONES.map((m) => ({ ...m, achieved: currentStreak >= m.target }));

const nextMilestone = (currentStreak: number) =>
  deriveMilestones(currentStreak).find((m) => !m.achieved) ?? null;

const daysToMilestone = (currentStreak: number) => {
  const n = nextMilestone(currentStreak);
  return n ? n.target - currentStreak : 0;
};

const milestonePct = (currentStreak: number, target: number): number =>
  Math.min(100, Math.round((currentStreak / target) * 100));

describe('UT-STREAK-001: emptyYear builds a 365-day grid ending today with zero values', () => {
  it('should produce exactly 365 zero-value days ending on the given today date', () => {
    const days = emptyYear(new Date('2026-10-04T00:00:00Z'));
    expect(days.length).toBe(365);
    expect(days[days.length - 1].date).toBe('2026-10-04');
    expect(days[0].date).toBe('2025-10-05');
    expect(days.every((d) => d.level === 0 && d.studyMinutes === 0)).toBe(true);
  });
});

describe('UT-STREAK-002: deriveStats maps analytics fields to the UI counters', () => {
  it('should fall back to 0 when analytics is empty and round totalStudyMinutes to hours', () => {
    expect(deriveStats({})).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      daysActive: 0,
      totalHours: 0,
      lessonsCompleted: 0,
      examsPassed: 0,
    });
    expect(deriveStats({ totalStudyMinutes: 125 }).totalHours).toBe(2);
  });
});

describe('UT-STREAK-003: deriveMilestones marks achieved when currentStreak meets target', () => {
  it('should mark m1 achieved at 7 days, m2 at 30 days, all achieved at 365 days', () => {
    expect(deriveMilestones(7).map((m) => m.achieved)).toEqual([true, false, false, false]);
    expect(deriveMilestones(30).map((m) => m.achieved)).toEqual([true, true, false, false]);
    expect(deriveMilestones(365).map((m) => m.achieved)).toEqual([true, true, true, true]);
  });
});

describe('UT-STREAK-004: nextMilestone + daysToMilestone + milestonePct math', () => {
  it('should pick the smallest un-achieved milestone, compute daysToMilestone, and cap the bar at 100%', () => {
    expect(nextMilestone(0)?.id).toBe('m1');
    expect(daysToMilestone(0)).toBe(7);
    expect(daysToMilestone(7)).toBe(23);
    expect(nextMilestone(500)).toBeNull();
    expect(daysToMilestone(500)).toBe(0);
    expect(milestonePct(7, 7)).toBe(100);
    expect(milestonePct(20, 7)).toBe(100); // overshoot capped
    expect(milestonePct(3, 7)).toBe(43);
  });
});
