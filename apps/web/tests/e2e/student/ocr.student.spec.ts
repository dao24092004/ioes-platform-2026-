/** Wave 2D — E2E: /student/ocr (ComingSoon wrapper) */
import { test, expect } from '@playwright/test';
import { OcrPage } from '../pages/student/OcrPage';

test.describe('TC-OCR-001: /student/ocr placeholder', () => {
  test('should render the ComingSoon placeholder with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    const ocr = new OcrPage(page);
    await ocr.goto();
    await ocr.expectPage();
    await ocr.expectComingSoonCopy();
    expect(errors).toHaveLength(0);
  });
});
