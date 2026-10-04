/** Wave 2D — E2E: /student/practice/:topicId */
import { test, expect } from '@playwright/test';
import { PracticePage } from '../pages/student/PracticePage';

const question = {
  uid: 'q-1',
  questionText: 'What is the time complexity of binary search?',
  questionType: 'multiple_choice',
  difficulty: 'medium',
  points: 10,
  topic: { uid: 't-1', name: 'Algorithms', level: 1 },
  skills: [{ uid: 's-1', name: 'Sorting' }],
  options: [
    { uid: 'o-1', optionText: 'O(n)', isCorrect: false, position: 0 },
    { uid: 'o-2', optionText: 'O(log n)', isCorrect: true, position: 1 },
    { uid: 'o-3', optionText: 'O(n log n)', isCorrect: false, position: 2 },
    { uid: 'o-4', optionText: 'O(1)', isCorrect: false, position: 3 },
  ],
  answerText: null,
  explanation: 'Binary search halves the search space each step.',
  createdBy: 'i-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

test.describe('TC-PRACTICE-001: /student/practice/:topicId flow', () => {
  test('should load a question, allow picking an option, submit, and show explanation; next fires a second GET', async ({
    page,
  }) => {
    let getCalls = 0;
    await page.route('**/api/v1/question-bank/topics/topic-42/practice', async (route) => {
      getCalls += 1;
      const payload =
        getCalls === 1
          ? {
              question,
              prerequisites: [],
              nextQuestions: [{ ...question, uid: 'q-2', topic: question.topic }],
            }
          : { question: { ...question, uid: 'q-2' }, prerequisites: [], nextQuestions: [] };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'ok', timestamp: 't', data: payload }),
      });
    });

    const practice = new PracticePage(page);
    await practice.goto('topic-42');
    await practice.expectQuestionText(/time complexity of binary search/i);
    await practice.clickOption('O(n)');
    await practice.clickSubmit();
    await practice.expectQuestionText(/halves the search space/i);
    await practice.clickNext();
    await expect.poll(() => getCalls).toBe(2);
  });
});
