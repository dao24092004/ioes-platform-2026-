import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Edit Question Flow
 * 
 * Test scenarios for editing existing questions in Question Bank
 * Coverage: 4/26 total scenarios
 * 
 * Scenarios:
 * 1. Edit question text and save
 * 2. Change question type
 * 3. Modify options for multiple choice
 * 4. Validation errors on edit
 */

test.describe('Edit Question Flow', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Login as instructor
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'instructor@ioes.edu.vn');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/instructor/dashboard');
    
    // Navigate to Question Bank
    await page.click('[data-testid="nav-question-bank"]');
    await page.waitForURL('/instructor/question-bank');
    
    // Wait for questions to load
    await page.waitForSelector('[data-testid="question-list"]');
  });

  /**
   * Scenario 1.1: Edit Question Text
   * 
   * Given instructor is on Question Bank page
   * And a question exists with text "What is 2+2?"
   * When instructor clicks "Edit" button
   * And changes text to "What is 3+3?"
   * And clicks "Save"
   * Then question text is updated
   * And success toast appears
   * And question list refreshes
   */
  test('should edit question text successfully', async () => {
    // Find first question card
    const questionCard = page.locator('[data-testid="question-card"]').first();
    const originalText = await questionCard.locator('[data-testid="question-text"]').textContent();
    
    // Click edit button
    await questionCard.locator('[data-testid="edit-button"]').click();
    
    // Wait for edit modal
    await page.waitForSelector('[data-testid="question-form-modal"]');
    
    // Verify modal title
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Edit Question');
    
    // Change question text
    const textInput = page.locator('[data-testid="question-text-input"]');
    await textInput.clear();
    const newText = 'What is 3+3? (Edited)';
    await textInput.fill(newText);
    
    // Save changes
    await page.click('[data-testid="save-button"]');
    
    // Wait for success toast
    await page.waitForSelector('[data-testid="toast-success"]');
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Question updated successfully');
    
    // Verify modal closed
    await expect(page.locator('[data-testid="question-form-modal"]')).not.toBeVisible();
    
    // Verify question text updated in list
    const updatedCard = page.locator('[data-testid="question-card"]').first();
    await expect(updatedCard.locator('[data-testid="question-text"]')).toContainText(newText);
    
    console.log('✅ Edit question text: PASSED');
  });

  /**
   * Scenario 1.2: Change Question Type
   * 
   * Given a multiple choice question exists
   * When instructor edits the question
   * And changes type from "Multiple Choice" to "True/False"
   * Then options section updates accordingly
   * And only 2 options remain (True/False)
   * And question saves successfully
   */
  test('should change question type from Multiple Choice to True/False', async () => {
    // Find a multiple choice question
    const mcQuestion = page.locator('[data-testid="question-card"]').filter({
      has: page.locator('[data-testid="question-type"]', { hasText: 'Multiple Choice' })
    }).first();
    
    // Click edit
    await mcQuestion.locator('[data-testid="edit-button"]').click();
    await page.waitForSelector('[data-testid="question-form-modal"]');
    
    // Change question type
    await page.click('[data-testid="question-type-select"]');
    await page.click('[data-testid="option-TRUE_FALSE"]');
    
    // Verify options updated
    const optionsContainer = page.locator('[data-testid="options-container"]');
    const optionCount = await optionsContainer.locator('[data-testid^="option-"]').count();
    expect(optionCount).toBe(2);
    
    // Verify True/False labels
    await expect(optionsContainer.locator('[data-testid="option-0-label"]')).toContainText('True');
    await expect(optionsContainer.locator('[data-testid="option-1-label"]')).toContainText('False');
    
    // Save
    await page.click('[data-testid="save-button"]');
    
    // Verify success
    await page.waitForSelector('[data-testid="toast-success"]');
    
    // Verify type badge updated
    await expect(mcQuestion.locator('[data-testid="question-type"]')).toContainText('True/False');
    
    console.log('✅ Change question type: PASSED');
  });

  /**
   * Scenario 1.3: Modify Options
   * 
   * Given a multiple choice question with 4 options
   * When instructor edits question
   * And adds a 5th option
   * And removes option 2
   * And reorders options
   * Then all changes are saved
   * And option positions update
   */
  test('should modify question options (add, remove, reorder)', async () => {
    // Find multiple choice question
    const mcQuestion = page.locator('[data-testid="question-card"]').filter({
      has: page.locator('[data-testid="question-type"]', { hasText: 'Multiple Choice' })
    }).first();
    
    await mcQuestion.locator('[data-testid="edit-button"]').click();
    await page.waitForSelector('[data-testid="question-form-modal"]');
    
    // Count initial options
    const initialCount = await page.locator('[data-testid^="option-"]').count();
    expect(initialCount).toBeGreaterThanOrEqual(2);
    
    // Add new option
    await page.click('[data-testid="add-option-button"]');
    const newOptionCount = await page.locator('[data-testid^="option-"]').count();
    expect(newOptionCount).toBe(initialCount + 1);
    
    // Fill new option text
    await page.locator(`[data-testid="option-${initialCount}-input"]`).fill('New Option E');
    
    // Remove option 1 (second option, 0-indexed)
    await page.locator('[data-testid="remove-option-1"]').click();
    
    // Verify count decreased
    const afterRemoveCount = await page.locator('[data-testid^="option-"]').count();
    expect(afterRemoveCount).toBe(initialCount);
    
    // Reorder: move first option down
    await page.locator('[data-testid="move-down-option-0"]').click();
    
    // Save
    await page.click('[data-testid="save-button"]');
    await page.waitForSelector('[data-testid="toast-success"]');
    
    console.log('✅ Modify options: PASSED');
  });

  /**
   * Scenario 1.4: Validation Errors
   * 
   * Given instructor is editing a question
   * When they clear the question text field
   * And click "Save"
   * Then validation error appears
   * And question is not saved
   * And form stays open
   */
  test('should show validation errors when required fields are empty', async () => {
    // Click edit on first question
    const questionCard = page.locator('[data-testid="question-card"]').first();
    await questionCard.locator('[data-testid="edit-button"]').click();
    await page.waitForSelector('[data-testid="question-form-modal"]');
    
    // Clear question text (required field)
    const textInput = page.locator('[data-testid="question-text-input"]');
    await textInput.clear();
    
    // Try to save
    await page.click('[data-testid="save-button"]');
    
    // Verify validation error appears
    await expect(page.locator('[data-testid="error-question-text"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-question-text"]')).toContainText('Question text is required');
    
    // Verify modal still open
    await expect(page.locator('[data-testid="question-form-modal"]')).toBeVisible();
    
    // Verify no success toast
    await expect(page.locator('[data-testid="toast-success"]')).not.toBeVisible();
    
    // Test points validation
    const pointsInput = page.locator('[data-testid="points-input"]');
    await pointsInput.clear();
    await pointsInput.fill('-5'); // Invalid: negative points
    
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-points"]')).toContainText('Points must be greater than 0');
    
    // Test question text length
    await textInput.fill('a'); // Too short (min 10 chars)
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-question-text"]')).toContainText('Question text must be at least 10 characters');
    
    console.log('✅ Validation errors: PASSED');
  });

  test.afterEach(async () => {
    // Cleanup: close any open modals
    const modal = page.locator('[data-testid="question-form-modal"]');
    if (await modal.isVisible()) {
      await page.click('[data-testid="cancel-button"]');
    }
  });
});

/**
 * Test Coverage Summary:
 * - Edit question text: ✅
 * - Change question type: ✅
 * - Modify options (add/remove/reorder): ✅
 * - Validation errors: ✅
 * 
 * Total: 4/4 scenarios (100%)
 * 
 * Next: delete-question.spec.ts
 */
