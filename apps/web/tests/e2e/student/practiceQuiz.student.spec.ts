/** Wave 2D — E2E: /student/practice (practice quiz with AI-generated questions). */
import { test, expect } from '@playwright/test';
import { PracticeQuizPage } from '../pages/student/PracticeQuizPage';

test.describe('TC-PRACTICEQUIZ-001: /student/practice quiz flow', () => {
  test('should generate questions, render the quiz view, and show explanation when option is clicked', async ({
    page,
  }) => {
    await page.route('**/api/ai/questions/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'ok',
          timestamp: 't',
          data: {
            questions: [
              {
                questionText: 'Why is the sky blue?',
                questionType: 'multiple_choice',
                difficulty: 'medium',
                options: [
                  { optionText: 'A', isCorrect: false },
                  { optionText: 'B', isCorrect: true },
                  { optionText: 'C', isCorrect: false },
                ],
                answerText: null,
                explanation: 'Because Rayleigh scattering.',
                source: {
                  docId: 'd-1',
                  chunkId: 'c-1',
                  title: 'Atmosphere',
                  score: 0.9,
                  excerpt: '...',
                },
              },
            ],
            requested: 1,
            returned: 1,
            droppedUnverified: 0,
            grounded: true,
            model: 'gemini',
            latencyMs: 100,
          },
        }),
      });
    });

    const quiz = new PracticeQuizPage(page);
    await quiz.goto();
    await quiz.expectSetupForm();
    await quiz.fillTopic('recursion');
    await quiz.clickStart();
    await quiz.expectQuizView();
    await expect(page.getByText(/Why is the sky blue/i)).toBeVisible();
    // The "B" option is the correct one.
    await quiz.clickOption('B');
    await expect(page.getByText(/Because Rayleigh scattering/i)).toBeVisible();
  });
});
