/** Wave 2D — E2E: /student/speech-to-text (ComingSoon wrapper) */
import { test } from '@playwright/test';
import { SttPage } from '../pages/student/SttPage';

test.describe('TC-STT-001: /student/speech-to-text placeholder', () => {
  test('should render the ComingSoon placeholder and never request microphone', async ({
    page,
    context,
  }) => {
    // Block real microphone use at the context level. If the page attempted
    // to call getUserMedia, the request would be denied here and the test
    // would fail because the page would surface a PermissionDenied error.
    await context.clearPermissions();

    const stt = new SttPage(page);
    await stt.goto();
    await stt.expectPage();
    await stt.expectComingSoonCopy();
  });
});
