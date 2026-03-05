import { Page, expect } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'),
    async () => {
      const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"], .Toastify__close-button, .MuiSnackbar-root button');
      await close.first().click({ timeout: 2000 }).catch(() => {});
    },
    { times: 10, noWaitAfter: true }
  );
}

export async function checkForErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errorElements = Array.from(
      document.querySelectorAll('.error, [class*="error"], [id*="error"]')
    );
    return errorElements.map(el => el.textContent || '').filter(Boolean);
  });
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  // Wait for navigation to dashboard
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 10000 });
}

export async function navigateToArticles(page: Page) {
  // Click on Wissensartikel in sidebar
  await page.locator('nav').getByRole('link', { name: /Wissensartikel/i }).click();
  await expect(page.getByTestId('articles-page')).toBeVisible({ timeout: 10000 });
}

export async function navigateToNewArticle(page: Page) {
  await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('article-editor')).toBeVisible({ timeout: 10000 });
}

export async function removeEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

export async function insertMention(page: Page, searchQuery: string) {
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(`@${searchQuery}`);
  
  // Wait for dropdown
  const dropdown = page.locator('.tippy-box, [data-tippy-root]').first();
  await dropdown.waitFor({ state: 'visible', timeout: 5000 });
  
  // Click first result
  await dropdown.locator('button').first().click();
  
  // Wait for mention to be inserted
  await editor.locator('.mention-link, a[data-mention]').first().waitFor({ state: 'visible', timeout: 3000 });
}
