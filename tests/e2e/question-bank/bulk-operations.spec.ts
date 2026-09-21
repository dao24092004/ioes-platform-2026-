import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Bulk Operations
 * 
 * Test scenarios for bulk operations on multiple questions
 * Coverage: 4/26 total scenarios
 * 
 * Scenarios:
 * 1. Select multiple questions
 * 2. Bulk delete with confirmation
 * 3. Bulk export to CSV
 * 4. Bulk tag assignment
 */

test.describe('Bulk Operations', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Login as instructor
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'instructor@ioes.edu.vn');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForURL('/instructor/dashboard');
    await page.click('[data-testid="nav-question-bank"]');
    await page.waitForURL('/instructor/question-bank');
    await page.waitForSelector('[data-testid="question-list"]');
  });

  /**
   * Scenario 3.1: Select Multiple Questions
   * 
   * Given instructor views question list
   * When they check 5 question checkboxes
   * Then bulk action bar appears
   * And shows "5 selected"
   * And bulk actions are enabled
   */
  test('should select multiple questions and show bulk action bar', async () => {
    // Verify bulk action bar not visible initially
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible();
    
    // Select 5 questions
    const questions = page.locator('[data-testid="question-card"]');
    const totalCount = await questions.count();
    expect(totalCount).toBeGreaterThanOrEqual(5);
    
    const selectCount = 5;
    for (let i = 0; i < selectCount; i++) {
      await questions.nth(i).locator('[data-testid="question-checkbox"]').click();
      
      // Verify checkbox checked
      const checkbox = questions.nth(i).locator('[data-testid="question-checkbox"]');
      await expect(checkbox).toBeChecked();
    }
    
    // Verify bulk action bar appears
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
    
    // Verify selected count
    await expect(page.locator('[data-testid="selected-count"]')).toContainText(`${selectCount} selected`);
    
    // Verify bulk actions enabled
    await expect(page.locator('[data-testid="bulk-delete-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="bulk-export-button"]')).toBeEnabled();
    await expect(page.locator('[data-testid="bulk-tag-button"]')).toBeEnabled();
    
    // Test "Select All" functionality
    await page.click('[data-testid="select-all-checkbox"]');
    await expect(page.locator('[data-testid="selected-count"]')).toContainText(`${totalCount} selected`);
    
    // Test "Deselect All"
    await page.click('[data-testid="deselect-all-button"]');
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible();
    
    console.log('✅ Select multiple questions: PASSED');
  });

  /**
   * Scenario 3.2: Bulk Delete
   * 
   * Given 5 questions are selected
   * When instructor clicks "Bulk Delete"
   * And confirms the action
   * Then all 5 questions are deleted
   * And success message shows count
   * And list refreshes
   */
  test('should delete multiple questions in bulk', async () => {
    // Get initial count
    const initialCount = await page.locator('[data-testid="question-card"]').count();
    
    // Select 3 questions
    const selectCount = 3;
    const questions = page.locator('[data-testid="question-card"]');
    
    const selectedIds: string[] = [];
    for (let i = 0; i < selectCount; i++) {
      const questionId = await questions.nth(i).getAttribute('data-question-id');
      selectedIds.push(questionId!);
      await questions.nth(i).locator('[data-testid="question-checkbox"]').click();
    }
    
    // Wait for bulk action bar
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
    
    // Click bulk delete
    await page.click('[data-testid="bulk-delete-button"]');
    
    // Verify confirmation modal
    await page.waitForSelector('[data-testid="delete-confirmation-modal"]');
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Delete Questions');
    await expect(page.locator('[data-testid="modal-body"]')).toContainText(`${selectCount} questions`);
    await expect(page.locator('[data-testid="modal-body"]')).toContainText('This action cannot be undone');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for success toast
    await page.waitForSelector('[data-testid="toast-success"]');
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(`${selectCount} questions deleted successfully`);
    
    // Verify question count decreased
    await page.waitForTimeout(500); // Wait for list refresh
    const newCount = await page.locator('[data-testid="question-card"]').count();
    expect(newCount).toBe(initialCount - selectCount);
    
    // Verify specific questions deleted
    for (const id of selectedIds) {
      const deletedQuestion = page.locator(`[data-question-id="${id}"]`);
      await expect(deletedQuestion).not.toBeVisible();
    }
    
    // Verify bulk action bar hidden
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible();
    
    console.log('✅ Bulk delete: PASSED');
  });

  /**
   * Scenario 3.3: Bulk Export to CSV
   * 
   * Given 10 questions are selected
   * When instructor clicks "Export to CSV"
   * Then CSV file downloads
   * And contains all 10 questions
   * And includes all fields
   */
  test('should export selected questions to CSV', async ({ page: testPage }) => {
    page = testPage;
    
    // Login
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'instructor@ioes.edu.vn');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/instructor/dashboard');
    await page.click('[data-testid="nav-question-bank"]');
    await page.waitForURL('/instructor/question-bank');
    
    // Select questions
    const selectCount = Math.min(10, await page.locator('[data-testid="question-card"]').count());
    const questions = page.locator('[data-testid="question-card"]');
    
    for (let i = 0; i < selectCount; i++) {
      await questions.nth(i).locator('[data-testid="question-checkbox"]').click();
    }
    
    // Wait for bulk action bar
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
    
    // Setup download promise
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('[data-testid="bulk-export-button"]');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/questions_export_\d{8}_\d{6}\.csv/);
    
    // Save and read file
    const path = await download.path();
    expect(path).toBeTruthy();
    
    // Verify file content
    const fs = require('fs');
    const content = fs.readFileSync(path!, 'utf8');
    
    // Verify CSV headers
    expect(content).toContain('ID,Text,Type,Difficulty,Points,Topic,Tags,Created At');
    
    // Verify row count (header + data rows)
    const lines = content.split('\n').filter((line: string) => line.trim());
    expect(lines.length).toBe(selectCount + 1); // +1 for header
    
    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(`${selectCount} questions exported`);
    
    console.log('✅ Bulk export to CSV: PASSED');
  });

  /**
   * Scenario 3.4: Bulk Tag Assignment
   * 
   * Given 3 questions are selected
   * When instructor clicks "Add Tags"
   * And enters tags "algebra,basic,grade-9"
   * Then all 3 questions get the tags
   * And tag count updates in UI
   */
  test('should assign tags to multiple questions in bulk', async () => {
    // Select 3 questions
    const selectCount = 3;
    const questions = page.locator('[data-testid="question-card"]');
    
    const selectedIds: string[] = [];
    for (let i = 0; i < selectCount; i++) {
      const questionId = await questions.nth(i).getAttribute('data-question-id');
      selectedIds.push(questionId!);
      await questions.nth(i).locator('[data-testid="question-checkbox"]').click();
    }
    
    // Wait for bulk action bar
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
    
    // Click bulk tag button
    await page.click('[data-testid="bulk-tag-button"]');
    
    // Wait for tag modal
    await page.waitForSelector('[data-testid="bulk-tag-modal"]');
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Add Tags');
    await expect(page.locator('[data-testid="modal-body"]')).toContainText(`${selectCount} questions selected`);
    
    // Enter tags
    const tagsInput = page.locator('[data-testid="tags-input"]');
    await tagsInput.fill('algebra');
    await page.keyboard.press('Enter');
    
    await tagsInput.fill('basic');
    await page.keyboard.press('Enter');
    
    await tagsInput.fill('grade-9');
    await page.keyboard.press('Enter');
    
    // Verify tags displayed
    await expect(page.locator('[data-testid="tag-chip"]', { hasText: 'algebra' })).toBeVisible();
    await expect(page.locator('[data-testid="tag-chip"]', { hasText: 'basic' })).toBeVisible();
    await expect(page.locator('[data-testid="tag-chip"]', { hasText: 'grade-9' })).toBeVisible();
    
    // Save tags
    await page.click('[data-testid="save-tags-button"]');
    
    // Wait for success toast
    await page.waitForSelector('[data-testid="toast-success"]');
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Tags added to 3 questions');
    
    // Verify modal closed
    await expect(page.locator('[data-testid="bulk-tag-modal"]')).not.toBeVisible();
    
    // Verify tags appear on questions
    for (const id of selectedIds) {
      const question = page.locator(`[data-question-id="${id}"]`);
      const tagsContainer = question.locator('[data-testid="question-tags"]');
      
      await expect(tagsContainer.locator('[data-testid="tag"]', { hasText: 'algebra' })).toBeVisible();
      await expect(tagsContainer.locator('[data-testid="tag"]', { hasText: 'basic' })).toBeVisible();
      await expect(tagsContainer.locator('[data-testid="tag"]', { hasText: 'grade-9' })).toBeVisible();
    }
    
    console.log('✅ Bulk tag assignment: PASSED');
  });

  /**
   * Bonus: Bulk Status Change
   * 
   * Test changing status of multiple questions
   */
  test('should change status of multiple questions in bulk', async () => {
    // Select questions
    const selectCount = 3;
    const questions = page.locator('[data-testid="question-card"]');
    
    for (let i = 0; i < selectCount; i++) {
      await questions.nth(i).locator('[data-testid="question-checkbox"]').click();
    }
    
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
    
    // Open bulk actions menu
    await page.click('[data-testid="bulk-actions-menu"]');
    
    // Select "Change Status"
    await page.click('[data-testid="bulk-change-status"]');
    
    // Select new status
    await page.click('[data-testid="status-PUBLISHED"]');
    
    // Confirm
    await page.click('[data-testid="confirm-status-change"]');
    
    // Verify success
    await page.waitForSelector('[data-testid="toast-success"]');
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(`Status updated for ${selectCount} questions`);
    
    console.log('✅ Bulk status change: PASSED');
  });

  test.afterEach(async () => {
    // Deselect all questions
    const bulkBar = page.locator('[data-testid="bulk-action-bar"]');
    if (await bulkBar.isVisible()) {
      await page.click('[data-testid="deselect-all-button"]');
    }
  });
});

/**
 * Test Coverage Summary:
 * - Select multiple questions: ✅
 * - Bulk delete: ✅
 * - Bulk export to CSV: ✅
 * - Bulk tag assignment: ✅
 * - Bulk status change: ✅ (bonus)
 * 
 * Total: 5/4 scenarios (125% - includes bonus)
 * 
 * Next: knowledge-graph.spec.ts
 */
