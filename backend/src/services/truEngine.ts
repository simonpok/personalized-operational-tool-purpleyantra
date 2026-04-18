import { Department, Task } from '@prisma/client';

export interface TRUInput {
  technicality: number; // 1–5: 1=simple, 5=highly technical
  regularity:   number; // 1–5: 1=one-time, 5=daily maintenance
  urgency:      number; // 1–5: 1=low priority, 5=critical/blocking
}

// TRU Score Formula
export function computeTRUScore(input: TRUInput): number {
  const weights = { T: 0.35, R: 0.25, U: 0.40 };
  const score = (
    input.technicality * weights.T +
    input.regularity   * weights.R +
    input.urgency      * weights.U
  );
  return Math.round(score * 100) / 100;
}

// Estimated time to completion based on TRU score
export function estimateTimeframe(truScore: number, baseHours: number): {
  minHours: number;
  maxHours: number;
  label: string;
} {
  const multiplier = 1 + (truScore - 1) * 0.5;
  const min = Math.round(baseHours * multiplier);
  const max = Math.round(min * 1.3);
  return {
    minHours: min,
    maxHours: max,
    label: `${min}–${max} hrs`
  };
}

// Department progress = avg of its tasks' progress
export function computeDeptProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((sum, t) => sum + t.progress, 0);
  return Math.round(total / tasks.length);
}

// Project progress = avg across all departments
export function computeProjectProgress(departments: Department[]): number {
  if (departments.length === 0) return 0;
  const total = departments.reduce((sum, d) => sum + d.progress, 0);
  return Math.round(total / departments.length);
}
