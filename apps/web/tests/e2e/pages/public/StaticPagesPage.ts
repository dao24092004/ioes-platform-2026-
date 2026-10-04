// apps/web/tests/e2e/pages/public/StaticPagesPage.ts
// Page Object for static public pages: About, Contact, HelpCenter, Legal, UserProfile.
// All locators live here — spec files must not embed raw selectors.
// Web-first assertions used throughout; no waitForTimeout.
import { type Page, type Locator, expect } from '@playwright/test';

export interface ContactFormData {
  name?: string;
  email?: string;
  phone?: string;
  topic?: string;
  message?: string;
}

export class StaticPagesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ---- About ---------------------------------------------------------------

  async gotoAbout(): Promise<void> {
    await this.page.goto('/about');
    // Wait for any h1 to be visible (About page renders an h1)
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
  }

  // ---- Contact -------------------------------------------------------------
  // The form uses label text (visible but not FOR-associated with inputs) and
  // placeholder text for the actual textbox elements. Using placeholders for
  // robust Playwright locator matching.

  contactNameInput(): Locator {
    // Placeholder in Vietnamese: "Nhập họ và tên"
    return this.page.getByPlaceholder('Nhập họ và tên');
  }

  contactEmailInput(): Locator {
    // Placeholder: "Nhập email của bạn"
    return this.page.getByPlaceholder(/email@example\.com/i);
  }

  contactPhoneInput(): Locator {
    // Placeholder: "Nhập số điện thoại"
    return this.page.getByPlaceholder('Nhập số điện thoại');
  }

  contactTopicSelect(): Locator {
    // Topic select has label text "Chủ đề *"; use combobox role
    return this.page.getByRole('combobox');
  }

  contactMessageTextarea(): Locator {
    // Placeholder: "Mô tả chi tiết vấn đề hoặc câu hỏi của bạn..."
    return this.page.getByPlaceholder(/Mô tả/i);
  }

  contactSubmitButton(): Locator {
    // Button text: "Gửi tin nhắn"
    return this.page.getByRole('button', { name: /Gửi tin nhắn/i });
  }

  async gotoContact(): Promise<void> {
    await this.page.goto('/contact');
    // The form section heading: "Gửi tin nhắn cho chúng tôi"
    await expect(this.page.getByRole('heading', { name: /Gửi tin nhắn/i })).toBeVisible();
  }

  async fillContactForm(data: ContactFormData): Promise<void> {
    if (data.name !== undefined) {
      await this.contactNameInput().fill(data.name);
    }
    if (data.email !== undefined) {
      await this.contactEmailInput().fill(data.email);
    }
    if (data.phone !== undefined) {
      await this.contactPhoneInput().fill(data.phone);
    }
    if (data.topic !== undefined) {
      await this.contactTopicSelect().selectOption(data.topic);
    }
    if (data.message !== undefined) {
      await this.contactMessageTextarea().fill(data.message);
    }
  }

  async submitContact(): Promise<void> {
    await this.contactSubmitButton().click();
  }

  async expectContactSuccess(): Promise<void> {
    // Success message: "Gửi thành công!"
    await expect(this.page.getByText(/Gửi thành công/i)).toBeVisible();
  }

  // ---- HelpCenter ----------------------------------------------------------

  helpSearchInput(): Locator {
    // Placeholder text: "Tìm bài viết, hướng dẫn, câu hỏi..."
    return this.page.getByPlaceholder(/Tìm bài viết/i);
  }

  async gotoHelp(): Promise<void> {
    await this.page.goto('/help');
    await expect(this.helpSearchInput()).toBeVisible();
  }

  async searchHelp(query: string): Promise<void> {
    await this.helpSearchInput().fill(query);
    // After typing, the results update reactively
    await this.page.waitForLoadState('networkidle');
  }

  // ---- Legal ---------------------------------------------------------------

  async gotoLegal(tab: 'privacy' | 'terms' = 'privacy'): Promise<void> {
    await this.page.goto(`/legal/privacy?tab=${tab}`);
    // Wait for the page body to be present
    await expect(this.page.locator('body')).toBeVisible();
  }

  // ---- UserProfile ---------------------------------------------------------

  async gotoUserProfile(userId: string): Promise<void> {
    await this.page.goto(`/users/${userId}`);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async expectComingSoon(): Promise<void> {
    // ComingSoon badge text: "Sắp phát triển"
    await expect(this.page.getByText(/Sắp phát triển/i)).toBeVisible();
    // ComingSoon title text: "Hồ sơ công khai" — use h1 role to avoid duplicate matches
    await expect(this.page.getByRole('heading', { name: /Hồ sơ công khai/i })).toBeVisible();
  }
}
