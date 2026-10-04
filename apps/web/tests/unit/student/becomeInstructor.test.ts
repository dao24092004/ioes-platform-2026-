/** Wave 2 - Unit: BecomeInstructorPage component contract (student-owned). */
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { createElement } from 'react';

vi.mock('@/components/layout/StudentLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'mock-layout' }, children),
}));

vi.mock('@/app/store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'u-1', full_name: 'Test User', email: 't@e.com' },
  }),
}));

const captured: string[] = [];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      captured.push(key);
      return key;
    },
    i18n: { language: 'vi' },
  }),
}));

import BecomeInstructorPage from '@/pages/student/BecomeInstructorPage';

describe('BecomeInstructorPage — i18n key contract', () => {
  it('UT-BECOMEINSTR-001: should read the three section headings', () => {
    captured.length = 0;
    renderToString(createElement(BecomeInstructorPage));
    expect(captured).toContain('student.becomeInstructor.sectionProfile');
    expect(captured).toContain('student.becomeInstructor.sectionExpertise');
    expect(captured).toContain('student.becomeInstructor.sectionDocuments');
  });

  it('UT-BECOMEINSTR-002: should render all documented field labels', () => {
    captured.length = 0;
    renderToString(createElement(BecomeInstructorPage));
    const requiredFields = [
      'student.becomeInstructor.field.fullName',
      'student.becomeInstructor.field.email',
      'student.becomeInstructor.field.department',
      'student.becomeInstructor.field.yearsExp',
      'student.becomeInstructor.field.specializations',
      'student.becomeInstructor.field.bio',
      'student.becomeInstructor.field.cv',
      'student.becomeInstructor.field.portfolio',
      'student.becomeInstructor.field.motivation',
    ];
    for (const key of requiredFields) {
      expect(captured).toContain(key);
    }
  });

  it('UT-BECOMEINSTR-003: should render all four benefit titles', () => {
    captured.length = 0;
    renderToString(createElement(BecomeInstructorPage));
    expect(captured).toContain('student.becomeInstructor.benefitsTitle');
    expect(captured).toContain('student.becomeInstructor.benefit1Title');
    expect(captured).toContain('student.becomeInstructor.benefit2Title');
    expect(captured).toContain('student.becomeInstructor.benefit3Title');
    expect(captured).toContain('student.becomeInstructor.benefit4Title');
  });

  it('UT-BECOMEINSTR-004: should render the FAQ section', () => {
    captured.length = 0;
    renderToString(createElement(BecomeInstructorPage));
    expect(captured).toContain('student.becomeInstructor.faqTitle');
  });

  it('UT-BECOMEINSTR-005: should render without throwing in SSR', () => {
    expect(() => renderToString(createElement(BecomeInstructorPage))).not.toThrow();
  });
});
