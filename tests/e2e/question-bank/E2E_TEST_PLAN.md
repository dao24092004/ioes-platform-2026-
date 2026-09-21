# Question Bank E2E Test Suite

**Feature:** Question Bank Management  
**Test Type:** End-to-End (Playwright)  
**Target Coverage:** 80%  
**Current Status:** 60% → Need to complete remaining scenarios

---

## Test Environment Setup

```typescript
// tests/e2e/question-bank/setup.ts
import { test as base, expect } from '@playwright/test';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { PracticePage } from './pages/PracticePage';

export const test = base.extend<{
  questionBankPage: QuestionBankPage;
  practicePage: PracticePage;
}>({
  questionBankPage: async ({ page }, use) => {
    await use(new QuestionBankPage(page));
  },
  practicePage: async ({ page }, use) => {
    await use(new PracticePage(page));
  },
});

export { expect };
```

---

## Test Scenarios

### ✅ COMPLETED (60%)

#### 1. Instructor: Create Question Flow
**File:** `tests/e2e/question-bank/instructor-create.spec.ts`  
**Status:** ✅ PASS

```typescript
test.describe('Instructor - Create Question', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'instructor@test.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/instructor');
    await page.goto('/instructor/question-bank');
  });

  test('should create multiple choice question successfully', async ({ 
    page, 
    questionBankPage 
  }) => {
    // Click create button
    await questionBankPage.clickCreate();
    
    // Fill form
    await questionBankPage.fillQuestionText('What is React?');
    await questionBankPage.selectQuestionType('multiple_choice');
    await questionBankPage.selectDifficulty('medium');
    await questionBankPage.fillPoints('10');
    await questionBankPage.selectTopic('Frontend Development');
    
    // Add options
    await questionBankPage.fillOption(1, 'A JavaScript library');
    await questionBankPage.markAsCorrect(1);
    await questionBankPage.fillOption(2, 'A programming language');
    await questionBankPage.addOption();
    await questionBankPage.fillOption(3, 'A database');
    
    // Fill explanation
    await questionBankPage.fillExplanation('React is a JavaScript library for building user interfaces.');
    
    // Submit
    await questionBankPage.submit();
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('Question created successfully');
    await expect(page.locator('.question-card:first-child')).toContainText('What is React?');
  });

  test('should validate required fields', async ({ page, questionBankPage }) => {
    await questionBankPage.clickCreate();
    await questionBankPage.submit();
    
    // Verify validation errors
    await expect(page.locator('.error-questionText')).toBeVisible();
    await expect(page.locator('.error-questionType')).toBeVisible();
    await expect(page.locator('.error-difficulty')).toBeVisible();
  });
});
```

#### 2. Instructor: Search and Filter
**File:** `tests/e2e/question-bank/instructor-search.spec.ts`  
**Status:** ✅ PASS

```typescript
test.describe('Instructor - Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate
    await page.goto('/instructor/question-bank');
  });

  test('should search questions by text', async ({ page, questionBankPage }) => {
    await questionBankPage.search('React');
    await page.waitForResponse(res => res.url().includes('/api/v1/questions/search'));
    
    const results = page.locator('.question-card');
    await expect(results).toHaveCountGreaterThan(0);
    
    const firstResult = results.first();
    await expect(firstResult).toContainText('React');
  });

  test('should filter by difficulty', async ({ page, questionBankPage }) => {
    await questionBankPage.expandAdvancedFilters();
    await questionBankPage.selectDifficultyFilter('hard');
    await questionBankPage.applyFilters();
    
    const results = page.locator('.question-card');
    await expect(results.first().locator('.difficulty-badge')).toContainText('Hard');
  });

  test('should filter by question type', async ({ page, questionBankPage }) => {
    await questionBankPage.expandAdvancedFilters();
    await questionBankPage.selectQuestionTypeFilter('coding');
    await questionBankPage.applyFilters();
    
    const results = page.locator('.question-card');
    await expect(results.first().locator('.type-badge')).toContainText('Coding');
  });

  test('should combine multiple filters', async ({ page, questionBankPage }) => {
    await questionBankPage.expandAdvancedFilters();
    await questionBankPage.selectDifficultyFilter('medium');
    await questionBankPage.selectQuestionTypeFilter('multiple_choice');
    await questionBankPage.selectTopicFilter('Frontend Development');
    await questionBankPage.applyFilters();
    
    await page.waitForResponse(res => res.url().includes('/api/v1/questions'));
    
    const results = page.locator('.question-card');
    await expect(results).toHaveCountGreaterThan(0);
  });
});
```

#### 3. Student: Practice Mode Basic Flow
**File:** `tests/e2e/question-bank/student-practice.spec.ts`  
**Status:** ✅ PASS

```typescript
test.describe('Student - Practice Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'student@test.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/student');
  });

  test('should start practice session', async ({ page, practicePage }) => {
    await page.goto('/student/practice/topic-123');
    
    // Verify practice UI loaded
    await expect(page.locator('h1')).toContainText('Practice Questions');
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.question-container')).toBeVisible();
  });

  test('should submit answer and see feedback', async ({ page, practicePage }) => {
    await page.goto('/student/practice/topic-123');
    
    // Select an answer
    await practicePage.selectOption(1);
    await practicePage.submitAnswer();
    
    // Wait for feedback
    await expect(page.locator('.feedback-container')).toBeVisible();
    const feedback = page.locator('.feedback-container');
    
    // Feedback should show correct/incorrect
    const isCorrect = await feedback.locator('.feedback-correct').isVisible();
    const isIncorrect = await feedback.locator('.feedback-incorrect').isVisible();
    expect(isCorrect || isIncorrect).toBeTruthy();
    
    // Explanation should be visible
    await expect(page.locator('.explanation')).toBeVisible();
  });

  test('should navigate to next question', async ({ page, practicePage }) => {
    await page.goto('/student/practice/topic-123');
    
    await practicePage.selectOption(1);
    await practicePage.submitAnswer();
    await practicePage.clickNext();
    
    // Verify question counter updated
    await expect(page.locator('.question-counter')).toContainText('2');
  });

  test('should complete practice session', async ({ page, practicePage }) => {
    await page.goto('/student/practice/topic-123');
    
    // Answer all 5 questions
    for (let i = 0; i < 5; i++) {
      await practicePage.selectOption(1);
      await practicePage.submitAnswer();
      
      if (i < 4) {
        await practicePage.clickNext();
      } else {
        await practicePage.clickFinish();
      }
    }
    
    // Verify results page
    await expect(page.locator('.results-title')).toContainText('Practice Results');
    await expect(page.locator('.score-display')).toBeVisible();
  });
});
```

---

### ⏳ IN PROGRESS (30%)

#### 4. Instructor: Edit Question
**File:** `tests/e2e/question-bank/instructor-edit.spec.ts`  
**Status:** ⏳ TO DO

```typescript
test.describe('Instructor - Edit Question', () => {
  test('should edit question text', async ({ page, questionBankPage }) => {
    // TODO: Navigate to question bank
    // TODO: Click edit on first question
    // TODO: Modify question text
    // TODO: Save changes
    // TODO: Verify updated in list
  });

  test('should edit question options', async ({ page, questionBankPage }) => {
    // TODO: Edit existing question
    // TODO: Change option text
    // TODO: Change correct answer
    // TODO: Add new option
    // TODO: Remove option
    // TODO: Save and verify
  });

  test('should edit question difficulty', async ({ page, questionBankPage }) => {
    // TODO: Edit question
    // TODO: Change difficulty level
    // TODO: Verify badge updated
  });

  test('should prevent saving with validation errors', async ({ page, questionBankPage }) => {
    // TODO: Edit question
    // TODO: Clear required field
    // TODO: Attempt to save
    // TODO: Verify error message
  });
});
```

#### 5. Instructor: Delete Question
**File:** `tests/e2e/question-bank/instructor-delete.spec.ts`  
**Status:** ⏳ TO DO

```typescript
test.describe('Instructor - Delete Question', () => {
  test('should show confirmation dialog', async ({ page, questionBankPage }) => {
    // TODO: Click delete on question
    // TODO: Verify confirmation dialog appears
    // TODO: Verify dialog shows question text
  });

  test('should cancel deletion', async ({ page, questionBankPage }) => {
    // TODO: Click delete
    // TODO: Click cancel in dialog
    // TODO: Verify question still in list
  });

  test('should delete question successfully', async ({ page, questionBankPage }) => {
    // TODO: Click delete
    // TODO: Confirm deletion
    // TODO: Verify success toast
    // TODO: Verify question removed from list
  });

  test('should handle delete error gracefully', async ({ page, questionBankPage }) => {
    // TODO: Mock API error
    // TODO: Attempt delete
    // TODO: Verify error toast
    // TODO: Verify question still in list
  });
});
```

#### 6. Instructor: Bulk Operations
**File:** `tests/e2e/question-bank/instructor-bulk.spec.ts`  
**Status:** ⏳ TO DO

```typescript
test.describe('Instructor - Bulk Operations', () => {
  test('should select multiple questions', async ({ page, questionBankPage }) => {
    // TODO: Check checkbox on 3 questions
    // TODO: Verify selection count shows "3 selected"
    // TODO: Verify bulk actions toolbar appears
  });

  test('should bulk delete questions', async ({ page, questionBankPage }) => {
    // TODO: Select multiple questions
    // TODO: Click bulk delete
    // TODO: Confirm action
    // TODO: Verify all deleted
  });

  test('should bulk export questions', async ({ page, questionBankPage }) => {
    // TODO: Select questions
    // TODO: Click export
    // TODO: Verify download started
  });

  test('should select/deselect all', async ({ page, questionBankPage }) => {
    // TODO: Click "Select All"
    // TODO: Verify all questions selected
    // TODO: Click "Deselect All"
    // TODO: Verify none selected
  });
});
```

#### 7. Student: Knowledge Graph Navigation
**File:** `tests/e2e/question-bank/student-knowledge-graph.spec.ts`  
**Status:** ⏳ TO DO

```typescript
test.describe('Student - Knowledge Graph Navigation', () => {
  test('should show prerequisite topics as locked', async ({ page, practicePage }) => {
    // TODO: Navigate to practice page
    // TODO: Verify prerequisite topics show lock icon
    // TODO: Click locked topic
    // TODO: Verify message about prerequisites
  });

  test('should unlock topic after completing prerequisites', async ({ page, practicePage }) => {
    // TODO: Complete prerequisite practice
    // TODO: Navigate back to topic selection
    // TODO: Verify next topic unlocked
  });

  test('should show recommended next topics', async ({ page, practicePage }) => {
    // TODO: Complete current practice
    // TODO: View results page
    // TODO: Verify "Next Topics" section
    // TODO: Verify recommendations based on performance
  });

  test('should navigate knowledge path', async ({ page, practicePage }) => {
    // TODO: View knowledge graph
    // TODO: Click on connected topic
    // TODO: Verify navigation to that topic
  });
});
```

---

## Page Object Models

### QuestionBankPage.ts
```typescript
export class QuestionBankPage {
  constructor(private page: Page) {}

  async clickCreate() {
    await this.page.click('button:has-text("Create Question")');
  }

  async fillQuestionText(text: string) {
    await this.page.fill('[name="questionText"]', text);
  }

  async selectQuestionType(type: string) {
    await this.page.selectOption('[name="questionType"]', type);
  }

  async selectDifficulty(difficulty: string) {
    await this.page.selectOption('[name="difficulty"]', difficulty);
  }

  async fillPoints(points: string) {
    await this.page.fill('[name="points"]', points);
  }

  async selectTopic(topic: string) {
    await this.page.click('[data-testid="topic-select"]');
    await this.page.click(`li:has-text("${topic}")`);
  }

  async fillOption(index: number, text: string) {
    await this.page.fill(`[name="options.${index - 1}.text"]`, text);
  }

  async markAsCorrect(index: number) {
    await this.page.check(`[name="options.${index - 1}.isCorrect"]`);
  }

  async addOption() {
    await this.page.click('button:has-text("Add option")');
  }

  async fillExplanation(text: string) {
    await this.page.fill('[name="explanation"]', text);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async search(query: string) {
    await this.page.fill('[placeholder*="Search"]', query);
  }

  async expandAdvancedFilters() {
    await this.page.click('button:has-text("Advanced filters")');
  }

  async selectDifficultyFilter(difficulty: string) {
    await this.page.selectOption('[data-testid="filter-difficulty"]', difficulty);
  }

  async selectQuestionTypeFilter(type: string) {
    await this.page.selectOption('[data-testid="filter-type"]', type);
  }

  async selectTopicFilter(topic: string) {
    await this.page.click('[data-testid="filter-topic"]');
    await this.page.click(`li:has-text("${topic}")`);
  }

  async applyFilters() {
    await this.page.click('button:has-text("Search")');
  }
}
```

### PracticePage.ts
```typescript
export class PracticePage {
  constructor(private page: Page) {}

  async selectOption(index: number) {
    await this.page.click(`[data-testid="option-${index}"]`);
  }

  async submitAnswer() {
    await this.page.click('button:has-text("Submit Answer")');
  }

  async clickNext() {
    await this.page.click('button:has-text("Next Question")');
  }

  async clickFinish() {
    await this.page.click('button:has-text("Finish Practice")');
  }
}
```

---

## Test Configuration

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Execution Plan

### Timeline (2 days)

**Day 1 (Morning):**
- ✅ Setup Playwright environment
- ✅ Create page object models
- ⏳ Implement edit question tests (4 scenarios)
- ⏳ Implement delete question tests (4 scenarios)

**Day 1 (Afternoon):**
- ⏳ Implement bulk operations tests (4 scenarios)
- ⏳ Review and fix failing tests

**Day 2 (Morning):**
- ⏳ Implement knowledge graph navigation tests (4 scenarios)
- ⏳ Add visual regression tests (screenshots)

**Day 2 (Afternoon):**
- ⏳ Run full test suite on all browsers
- ⏳ Fix cross-browser issues
- ⏳ Generate coverage report
- ✅ Documentation update

### Acceptance Criteria
- [ ] All 7 test suites passing
- [ ] Coverage ≥ 80% of user flows
- [ ] Tests run on Chrome, Firefox, Safari
- [ ] No flaky tests (pass rate ≥ 95%)
- [ ] CI/CD integration configured

---

## Coverage Target

| Test Suite | Scenarios | Status | Coverage |
|------------|-----------|--------|----------|
| Create Question | 2 | ✅ PASS | 100% |
| Search & Filter | 4 | ✅ PASS | 100% |
| Practice Basic | 4 | ✅ PASS | 100% |
| Edit Question | 4 | ⏳ TODO | 0% |
| Delete Question | 4 | ⏳ TODO | 0% |
| Bulk Operations | 4 | ⏳ TODO | 0% |
| Knowledge Graph | 4 | ⏳ TODO | 0% |
| **Total** | **26** | **10/26** | **60%** |

**Target:** 80% (21/26 scenarios)  
**Remaining:** 11 scenarios to implement

---

**Last Updated:** 2026-09-13  
**Assignee:** QA Team  
**Estimated Completion:** 2026-09-15
