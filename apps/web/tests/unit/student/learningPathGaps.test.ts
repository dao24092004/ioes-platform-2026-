/** Wave 2 - Unit: learning-path.api.ts (student-owned, LearningPath gaps). */
import { describe, it, expect } from 'vitest';
import {
  LEARNING_PATH_GENERATE_TIMEOUT_MS,
  normalizeSavedPath,
  type LearningPathStep,
} from '@/services/api/learning-path.api';

describe('LEARNING_PATH_GENERATE_TIMEOUT_MS', () => {
  it('UT-LEARNPATH-001: should equal 200_000 (ms), not the default 120_000', () => {
    // The constant protects against ai-gateway timeout mismatch. Backend
    // allows ml-worker up to 180s and gateway 20s buffer; default axios
    // timeout is 120s.
    expect(LEARNING_PATH_GENERATE_TIMEOUT_MS).toBe(200_000);
    expect(LEARNING_PATH_GENERATE_TIMEOUT_MS).not.toBe(120_000);
  });

  it('UT-LEARNPATH-002: should be a positive finite integer', () => {
    expect(Number.isInteger(LEARNING_PATH_GENERATE_TIMEOUT_MS)).toBe(true);
    expect(LEARNING_PATH_GENERATE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isFinite(LEARNING_PATH_GENERATE_TIMEOUT_MS)).toBe(true);
  });
});

describe('normalizeSavedPath', () => {
  it('UT-LEARNPATH-003: should return null when input is null/undefined', () => {
    expect(normalizeSavedPath(null)).toBeNull();
    expect(normalizeSavedPath(undefined)).toBeNull();
    expect(normalizeSavedPath('not-an-object' as unknown)).toBeNull();
  });

  it('UT-LEARNPATH-004: should map missing courseId to null on each step', () => {
    const result = normalizeSavedPath({
      id: 'p1',
      userId: 'u1',
      goal: 'Goal',
      model: 'm',
      createdAt: '2026-10-01T00:00:00.000Z',
      payload: {
        goal: 'Goal',
        summary: '',
        totalEstimatedHours: 0,
        weeks: 0,
        steps: [
          {
            order: 1,
            title: 'T',
            objective: '',
            courseId: null,
            estimatedHours: 1,
            skills: [],
            resources: [],
          },
          {
            order: 2,
            title: 'T2',
            objective: '',
            courseId: '',
            estimatedHours: 1,
            skills: [],
            resources: [],
          },
          { order: 3, title: 'T3', objective: '', estimatedHours: 1, skills: [], resources: [] },
        ],
        agentTrace: [],
        model: 'm',
        generatedAt: '2026-10-01T00:00:00.000Z',
      },
    });

    expect(result).not.toBeNull();
    const stepIds = result!.payload.steps.map((s: LearningPathStep) => s.courseId);
    expect(stepIds).toEqual([null, null, null]);
  });

  it('UT-LEARNPATH-005: should map a non-empty courseId through unchanged', () => {
    const result = normalizeSavedPath({
      id: 'p1',
      userId: 'u1',
      goal: 'Goal',
      model: 'm',
      createdAt: '2026-10-01T00:00:00.000Z',
      payload: {
        goal: 'Goal',
        summary: '',
        totalEstimatedHours: 0,
        weeks: 0,
        steps: [
          {
            order: 1,
            title: 'T',
            objective: '',
            courseId: 'c-99',
            estimatedHours: 1,
            skills: [],
            resources: [],
          },
        ],
        agentTrace: [],
        model: 'm',
        generatedAt: '2026-10-01T00:00:00.000Z',
      },
    });

    expect(result!.payload.steps[0]!.courseId).toBe('c-99');
  });

  it('UT-LEARNPATH-006: should sort steps by `order` ascending', () => {
    const result = normalizeSavedPath({
      id: 'p1',
      userId: 'u1',
      goal: 'G',
      model: 'm',
      createdAt: '',
      payload: {
        goal: 'G',
        summary: '',
        totalEstimatedHours: 0,
        weeks: 0,
        steps: [
          {
            order: 3,
            title: 'third',
            objective: '',
            courseId: null,
            estimatedHours: 1,
            skills: [],
            resources: [],
          },
          {
            order: 1,
            title: 'first',
            objective: '',
            courseId: null,
            estimatedHours: 1,
            skills: [],
            resources: [],
          },
          {
            order: 2,
            title: 'second',
            objective: '',
            courseId: null,
            estimatedHours: 1,
            skills: [],
            resources: [],
          },
        ],
        agentTrace: [],
        model: 'm',
        generatedAt: '',
      },
    });

    expect(result!.payload.steps.map((s) => s.title)).toEqual(['first', 'second', 'third']);
  });

  it('UT-LEARNPATH-007: should derive top-level goal from payload.goal when record.goal is empty', () => {
    const result = normalizeSavedPath({
      id: 'p1',
      userId: 'u1',
      goal: '',
      model: '',
      createdAt: '',
      payload: {
        goal: 'Backend Goal',
        summary: '',
        totalEstimatedHours: 0,
        weeks: 0,
        steps: [],
        agentTrace: [],
        model: 'm',
        generatedAt: '',
      },
    });

    expect(result!.goal).toBe('Backend Goal');
  });

  it('UT-LEARNPATH-008: should coerce non-array steps to an empty array', () => {
    const result = normalizeSavedPath({
      id: 'p1',
      userId: 'u1',
      goal: 'G',
      model: 'm',
      createdAt: '',
      payload: {
        goal: 'G',
        summary: '',
        totalEstimatedHours: 0,
        weeks: 0,
        steps: 'not-an-array',
        agentTrace: [],
        model: 'm',
        generatedAt: '',
      },
    });

    expect(result!.payload.steps).toEqual([]);
  });
});
