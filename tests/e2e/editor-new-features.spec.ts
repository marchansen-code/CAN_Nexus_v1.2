/**
 * Iteration 17: Frontend tests for new features:
 * 1. Fullscreen editor toggle
 * 2. User mentions (@@) dropdown
 * 3. Version history dialog
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://knowledge-hub-531.preview.emergentagent.com';

test.describe('Article Editor New Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder*="name@canusa.de"]', 'marc.hansen@canusa.de');
    await page.fill('input[type="password"]', 'CanusaNexus2024!');
    await page.click('button:has-text("Anmelden")');
    await page.waitForTimeout(2000);
  });

  test.describe('Fullscreen Editor', () => {
    test('fullscreen button is visible in card header for new article', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const fullscreenBtn = page.getByTestId('fullscreen-editor-btn');
      await expect(fullscreenBtn).toBeVisible();
      await expect(fullscreenBtn).toContainText('Vollbild');
    });

    test('fullscreen button is visible in card header for existing article', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const fullscreenBtn = page.getByTestId('fullscreen-editor-btn');
      await expect(fullscreenBtn).toBeVisible();
    });

    test('clicking fullscreen button opens fullscreen editor', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('fullscreen-editor-btn').click();
      await page.waitForTimeout(1000);

      // Fullscreen editor should be visible
      const fullscreenEditor = page.getByTestId('fullscreen-editor');
      await expect(fullscreenEditor).toBeVisible();
    });

    test('fullscreen editor shows article title and close button', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('fullscreen-editor-btn').click();
      await page.waitForTimeout(1000);

      const fullscreenEditor = page.getByTestId('fullscreen-editor');
      
      // Check for title "Verhalten bei der IT"
      await expect(fullscreenEditor.locator('h2')).toContainText('Verhalten bei der IT');
      // Check for Vollbild-Editor subtitle
      await expect(fullscreenEditor).toContainText('Vollbild-Editor');
      // Check for close button
      await expect(fullscreenEditor.locator('button:has-text("Schließen")')).toBeVisible();
    });

    test('toolbar Vollbild button opens fullscreen editor', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Click on toolbar Vollbild button (inside the editor toolbar)
      const toolbarFullscreenBtn = page.locator('.border-b button:has-text("Vollbild")').first();
      await toolbarFullscreenBtn.click();
      await page.waitForTimeout(1000);

      const fullscreenEditor = page.getByTestId('fullscreen-editor');
      await expect(fullscreenEditor).toBeVisible();
    });

    test('fullscreen editor can be closed with close button', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('fullscreen-editor-btn').click();
      await page.waitForTimeout(1000);

      // Fullscreen should be visible
      const fullscreenEditor = page.getByTestId('fullscreen-editor');
      await expect(fullscreenEditor).toBeVisible();

      // Click close button
      await fullscreenEditor.locator('button:has-text("Schließen")').click();
      await page.waitForTimeout(500);

      // Fullscreen should be hidden
      await expect(fullscreenEditor).not.toBeVisible();
    });

    test('fullscreen editor can be closed with Escape key', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('fullscreen-editor-btn').click();
      await page.waitForTimeout(1000);

      const fullscreenEditor = page.getByTestId('fullscreen-editor');
      await expect(fullscreenEditor).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      await expect(fullscreenEditor).not.toBeVisible();
    });
  });

  test.describe('User Mentions (@@)', () => {
    test('typing @@ triggers user mention dropdown', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Click in editor
      const editorContent = page.locator('.ProseMirror');
      await editorContent.click();
      await page.waitForTimeout(500);

      // Type @@
      await page.keyboard.type('@@');
      await page.waitForTimeout(2000);

      // User mention dropdown should appear
      const dropdown = page.locator('.bg-popover:has(button)').first();
      await expect(dropdown).toBeVisible();
    });

    test('user dropdown shows user name, email, and role badge', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const editorContent = page.locator('.ProseMirror');
      await editorContent.click();
      await page.waitForTimeout(500);

      await page.keyboard.type('@@');
      await page.waitForTimeout(2000);

      // Check for user items with name, email, and role
      const dropdown = page.locator('.bg-popover:has(button)').first();
      
      // Should show at least one user
      const userItems = dropdown.locator('button');
      const count = await userItems.count();
      expect(count).toBeGreaterThan(0);
      
      // First user should have name and email visible
      const firstUser = userItems.first();
      await expect(firstUser).toBeVisible();
    });

    test('user dropdown shows Admin badge for admin users', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const editorContent = page.locator('.ProseMirror');
      await editorContent.click();
      await page.waitForTimeout(500);

      await page.keyboard.type('@@');
      await page.waitForTimeout(2000);

      // Should show Admin badge
      const adminBadge = page.locator('.bg-popover span:has-text("Admin")');
      await expect(adminBadge.first()).toBeVisible();
    });

    test('user dropdown shows Editor badge for editor users', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const editorContent = page.locator('.ProseMirror');
      await editorContent.click();
      await page.waitForTimeout(500);

      await page.keyboard.type('@@');
      await page.waitForTimeout(2000);

      // Should show Editor badge
      const editorBadge = page.locator('.bg-popover span:has-text("Editor")');
      await expect(editorBadge.first()).toBeVisible();
    });

    test('typing @@ followed by search query filters users', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const editorContent = page.locator('.ProseMirror');
      await editorContent.click();
      await page.waitForTimeout(500);

      // Type @@marc to search for Marc
      await page.keyboard.type('@@marc');
      await page.waitForTimeout(2000);

      // Dropdown should show filtered results with "Marc" in the name
      const dropdown = page.locator('.bg-popover:has(button)').first();
      await expect(dropdown).toContainText('Marc');
    });
  });

  test.describe('Version History', () => {
    test('version history button is hidden for new articles', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const versionBtn = page.getByTestId('version-history-btn');
      await expect(versionBtn).not.toBeVisible();
    });

    test('version history button is visible for existing articles', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const versionBtn = page.getByTestId('version-history-btn');
      await expect(versionBtn).toBeVisible();
      await expect(versionBtn).toContainText('Versionen');
    });

    test('clicking version history button opens dialog', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('version-history-btn').click();
      await page.waitForTimeout(1500);

      // Version dialog should be visible
      const versionDialog = page.locator('.fixed:has-text("Versionshistorie")');
      await expect(versionDialog).toBeVisible();
    });

    test('version history dialog shows Versionshistorie title', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('version-history-btn').click();
      await page.waitForTimeout(1500);

      // Check for Versionshistorie title in the dialog
      const versionDialog = page.locator('.fixed:has-text("Versionshistorie")');
      await expect(versionDialog).toContainText('Versionshistorie');
    });

    test('version history shows version entries with date and author', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('version-history-btn').click();
      await page.waitForTimeout(1500);

      const versionDialog = page.locator('.fixed:has-text("Versionshistorie")');
      
      // Should show Version 1
      await expect(versionDialog.locator('text=Version 1')).toBeVisible();
      // Should show author name
      await expect(versionDialog).toContainText('Marc Hansen');
    });

    test('version entry shows Vorschau (preview) button', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('version-history-btn').click();
      await page.waitForTimeout(1500);

      const versionDialog = page.locator('.fixed:has-text("Versionshistorie")');
      await expect(versionDialog.locator('button:has-text("Vorschau")')).toBeVisible();
    });

    test('version entry shows Wiederherstellen (restore) button', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('version-history-btn').click();
      await page.waitForTimeout(1500);

      const versionDialog = page.locator('.fixed:has-text("Versionshistorie")');
      await expect(versionDialog.locator('button:has-text("Wiederherstellen")')).toBeVisible();
    });

    test('version history dialog can be closed with X button', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.getByTestId('version-history-btn').click();
      await page.waitForTimeout(1500);

      const versionDialog = page.locator('.fixed:has-text("Versionshistorie")');
      await expect(versionDialog).toBeVisible();

      // Click close button (X)
      await versionDialog.locator('button').first().click();
      await page.waitForTimeout(500);

      await expect(versionDialog).not.toBeVisible();
    });
  });

  test.describe('Article Editor Core Functionality', () => {
    test('article editor page loads correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await expect(page.getByTestId('article-editor')).toBeVisible();
      await expect(page.locator('text=Artikel bearbeiten')).toBeVisible();
    });

    test('article title field is populated for existing article', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/art_1378b6293c09/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const titleInput = page.getByTestId('article-title');
      await expect(titleInput).toHaveValue('Verhalten bei der IT');
    });

    test('editor toolbar is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Check for toolbar buttons
      await expect(page.locator('button:has-text("Format")')).toBeVisible();
    });

    test('article content editor is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles/new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const editorContent = page.locator('.ProseMirror');
      await expect(editorContent).toBeVisible();
    });
  });
});
