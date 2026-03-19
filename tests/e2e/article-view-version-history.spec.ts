/**
 * Iteration 18: Version History Timeline in ArticleView
 * 
 * Tests for version history display below article content on the article view page.
 * Version history was moved from editor dialog to article view in this iteration.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://nexus-platform-36.preview.emergentagent.com';

test.describe('ArticleView Version History Timeline', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder*="name@canusa.de"]', 'marc.hansen@canusa.de');
    await page.fill('input[type="password"]', 'CanusaNexus2024!');
    await page.click('button:has-text("Anmelden")');
    await page.waitForTimeout(2000);
  });

  test('version history section is displayed below article content', async ({ page }) => {
    // Navigate to article view for article with versions
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Scroll to bottom to see version history
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Version history section should be visible
    const versionHistorySection = page.getByTestId('version-history-section');
    await expect(versionHistorySection).toBeVisible();
  });

  test('version history section has "Änderungshistorie" title', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for title
    await expect(page.locator('text=Änderungshistorie')).toBeVisible();
  });

  test('version history shows timeline with version number badges', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for version entries with version numbers
    const versionEntry1 = page.getByTestId('version-entry-1');
    const versionEntry2 = page.getByTestId('version-entry-2');
    
    await expect(versionEntry1).toBeVisible();
    await expect(versionEntry2).toBeVisible();
  });

  test('newest version has indigo badge color', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // The first/newest version entry should have the indigo colored badge
    const versionHistorySection = page.getByTestId('version-history-section');
    const newestVersionBadge = versionHistorySection.locator('.bg-indigo-500').first();
    await expect(newestVersionBadge).toBeVisible();
  });

  test('version entries show formatted German date', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for German date format (e.g., "16. März 2026")
    const versionHistorySection = page.getByTestId('version-history-section');
    await expect(versionHistorySection).toContainText('März 2026');
  });

  test('version entries show time with "um X:XX Uhr" format', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for German time format (e.g., "um 12:45 Uhr")
    const versionHistorySection = page.getByTestId('version-history-section');
    await expect(versionHistorySection).toContainText('um');
    await expect(versionHistorySection).toContainText('Uhr');
  });

  test('version entries show author name with user icon', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for author name
    const versionHistorySection = page.getByTestId('version-history-section');
    await expect(versionHistorySection).toContainText('Marc Hansen');
  });

  test('version history shows timeline line connecting versions', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // The timeline line should be visible (a vertical line connecting the version dots)
    const versionHistorySection = page.getByTestId('version-history-section');
    // The timeline line has class "w-0.5 bg-slate-200"
    const timelineLine = versionHistorySection.locator('.w-0\\.5, [class*="bg-slate-200"]').first();
    await expect(timelineLine).toBeVisible();
  });

  test('version entries are ordered from newest to oldest', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Version 2 should appear before Version 1 (newest first)
    const versionHistorySection = page.getByTestId('version-history-section');
    const versionEntries = versionHistorySection.locator('[data-testid^="version-entry-"]');
    
    // First entry should be version 2 (newest)
    const firstEntry = versionEntries.first();
    await expect(firstEntry).toHaveAttribute('data-testid', 'version-entry-2');
  });

  test('article view page loads with version history data', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify article view page loaded correctly
    await expect(page.getByTestId('article-view')).toBeVisible();
    
    // Verify article title
    await expect(page.locator('h1')).toContainText('Verhalten bei der IT');

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Version history should have loaded
    const versionHistorySection = page.getByTestId('version-history-section');
    await expect(versionHistorySection).toBeVisible();
  });

  test('take screenshot of version history timeline', async ({ page }) => {
    await page.goto(`${BASE_URL}/articles/art_1378b6293c09`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'version-history-timeline.jpeg', quality: 20, fullPage: false });
    
    // Verify screenshot was meaningful - version history visible
    await expect(page.getByTestId('version-history-section')).toBeVisible();
  });
});
