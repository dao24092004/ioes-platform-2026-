// apps/web/tests/e2e/pages/public/HomePage.ts
// Page Object for the public Home page. All locators (page test selectors)
// live in this file — spec files must not embed raw selectors. Web-first
// assertions are used everywhere; no waitForTimeout is allowed.
import { type Page, type Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  // Header
  readonly logoLink: Locator;
  readonly headerHome: Locator;
  readonly headerCourses: Locator;
  readonly headerAbout: Locator;
  readonly headerContact: Locator;
  readonly headerTenants: Locator;
  readonly headerLogin: Locator;
  readonly headerRegister: Locator;
  readonly langToggle: Locator;
  readonly menuToggle: Locator;

  // Hero & CTA buttons inside Home sections
  readonly heroCtaPrimary: Locator;
  readonly heroCtaSecondary: Locator;
  readonly ctaPrimary: Locator;
  readonly ctaSecondary: Locator;

  // Sections by id
  readonly heroSection: Locator;
  readonly featuresSection: Locator;
  readonly coursesSection: Locator;
  readonly aiMentorSection: Locator;
  readonly pricingSection: Locator;
  readonly testimonialsSection: Locator;
  readonly faqSection: Locator;
  readonly ctaSection: Locator;

  // FAQ
  readonly faqFirstItem: Locator;
  readonly faqSecondItem: Locator;

  // Footer
  readonly footer: Locator;
  readonly footerLogo: Locator;

  // Floating chat
  readonly chatToggle: Locator;
  readonly chatInput: Locator;

  constructor(page: Page) {
    this.page = page;
    const nav = page.getByRole('navigation');
    this.logoLink = nav.getByRole('link', { name: /IOES/ }).first();
    this.headerHome = nav.getByRole('link', { name: /Trang chủ|^Home$/i });
    this.headerCourses = nav.getByRole('link', { name: /Khóa học|^Courses$/i });
    this.headerAbout = nav.getByRole('link', { name: /Giới thiệu|^About$/i });
    this.headerContact = nav.getByRole('link', { name: /Liên hệ|^Contact$/i });
    this.headerTenants = nav.getByRole('link', { name: /Đối tác|^Tenants$/i });
    this.headerLogin = nav.getByRole('link', { name: /Đăng nhập/ });
    this.headerRegister = nav.getByRole('link', { name: /Đăng ký/ });
    this.langToggle = page.getByRole('button', { name: /toggle language/i });
    this.menuToggle = page.getByRole('button', { name: /toggle menu/i });

    this.heroCtaPrimary = page.getByRole('button', { name: /Bắt đầu miễn phí/i });
    this.heroCtaSecondary = page.getByRole('button', { name: /Xem cách hoạt động/i });
    this.ctaPrimary = page.getByRole('button', { name: /Bắt đầu miễn phí/i });
    this.ctaSecondary = page.getByRole('button', { name: /Liên hệ sales/i });

    this.heroSection = page.locator('#home');
    this.featuresSection = page.locator('#features');
    this.coursesSection = page.locator('#courses');
    this.aiMentorSection = page.locator('#aitutor');
    this.pricingSection = page.locator('#pricing');
    this.testimonialsSection = page.locator('#testimonials');
    this.faqSection = page.locator('#faq');
    this.ctaSection = page.locator('#contact');

    this.faqFirstItem = page.getByRole('button', { name: /IOES có miễn phí/i });
    this.faqSecondItem = page.getByRole('button', { name: /Chứng chỉ của IOES/i });

    this.footer = page.getByRole('contentinfo');
    this.footerLogo = this.footer.getByRole('link', { name: /IOES/ }).first();

    this.chatToggle = page.getByTestId('floating-chat-toggle');
    this.chatInput = page.getByPlaceholder('Nhập tin nhắn...');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    // Web-first: assert the hero rendered before any other interaction.
    await expect(this.heroSection).toBeVisible();
  }

  async toggleMobileMenu(): Promise<void> {
    await this.menuToggle.click();
  }

  async toggleLanguage(): Promise<void> {
    await this.langToggle.click();
  }

  async toggleFloatingChat(): Promise<void> {
    await this.chatToggle.click();
    // Web-first: input becomes visible right after open.
    await expect(this.chatInput).toBeVisible();
  }

  async closeFloatingChat(): Promise<void> {
    // Close (X) button has bg-white/20 class.
    const closeButton = this.page.locator('button.bg-white\\/20.rounded-full').last();
    await closeButton.click();
    await expect(this.chatToggle).toBeVisible();
  }
}
