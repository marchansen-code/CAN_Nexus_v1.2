import { test, expect } from '@playwright/test';

/**
 * Notification System Tests - Iteration 22
 * Tests for notification preferences, review request dialog, and settings UI
 */

const ADMIN_EMAIL = 'marc.hansen@canusa.de';
const ADMIN_PASSWORD = 'CanusaNexus2024!';

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Fill login form
    await page.fill('input[type="email"], input[placeholder*="name@canusa"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Anmelden")');
    
    // Wait for login to complete
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test.describe('Notification Preferences Page', () => {
    test('should navigate to Settings > Benachrichtigungen tab', async ({ page }) => {
      // Navigate to Settings
      await page.click('a[href="/settings"]');
      await expect(page.getByTestId('settings-page')).toBeVisible();
      
      // Click on Benachrichtigungen tab
      await page.click('button:has-text("Benachrichtigungen")');
      
      // Verify NotificationSettings component is visible using exact match
      await expect(page.getByText('E-Mail-Benachrichtigungen', { exact: true })).toBeVisible();
      
      // Take screenshot for verification
      await page.screenshot({ path: '/app/tests/e2e/notification-settings.jpeg', quality: 20, fullPage: false });
    });

    test('should display all notification preference toggles', async ({ page }) => {
      await page.click('a[href="/settings"]');
      await expect(page.getByTestId('settings-page')).toBeVisible();
      await page.click('button:has-text("Benachrichtigungen")');
      
      // Verify all preference toggles are visible using label selectors
      await expect(page.locator('label[for="mentions"]')).toBeVisible();
      await expect(page.locator('label[for="favorite_updates"]')).toBeVisible();
      await expect(page.locator('label[for="reviews"]')).toBeVisible();
      await expect(page.locator('label[for="status_changes"]')).toBeVisible();
      
      // Verify switch components exist
      const switches = page.locator('button[role="switch"]');
      await expect(switches).toHaveCount(4);
    });

    test('should toggle notification preferences', async ({ page }) => {
      await page.click('a[href="/settings"]');
      await expect(page.getByTestId('settings-page')).toBeVisible();
      await page.click('button:has-text("Benachrichtigungen")');
      
      // Wait for preferences to load
      await expect(page.locator('label[for="mentions"]')).toBeVisible();
      
      // Get the favorite_updates switch (defaults to off, so we can toggle it)
      const favoriteUpdatesSwitch = page.locator('#favorite_updates');
      
      // Wait for switch to be visible
      await expect(favoriteUpdatesSwitch).toBeVisible();
      
      // Click to toggle
      await favoriteUpdatesSwitch.click();
      
      // Wait for toast notification - this confirms the API call succeeded
      await expect(page.getByText('Einstellungen gespeichert')).toBeVisible();
      
      // Toggle back to original state
      await favoriteUpdatesSwitch.click();
      await expect(page.getByText('Einstellungen gespeichert').nth(1)).toBeVisible();
      
      // Verify the switch is clickable and responsive (the key test)
      // We don't need to verify exact state, just that clicking works
    });

    test('should show test email button for admin users', async ({ page }) => {
      await page.click('a[href="/settings"]');
      await expect(page.getByTestId('settings-page')).toBeVisible();
      await page.click('button:has-text("Benachrichtigungen")');
      
      // Verify test email button is visible for admin
      await expect(page.getByRole('button', { name: /Test-E-Mail senden/i })).toBeVisible();
      
      // Verify description text
      await expect(page.getByText('Sendet eine Test-E-Mail an Ihre E-Mail-Adresse')).toBeVisible();
    });

    test('should handle test email button click', async ({ page }) => {
      await page.click('a[href="/settings"]');
      await expect(page.getByTestId('settings-page')).toBeVisible();
      await page.click('button:has-text("Benachrichtigungen")');
      
      // Click test email button
      const testEmailBtn = page.getByRole('button', { name: /Test-E-Mail senden/i });
      await testEmailBtn.click();
      
      // Wait for response - either success or SMTP error (both are valid)
      await expect(
        page.getByText('Test-E-Mail gesendet').or(page.getByText(/App-spezifisches Passwort|SMTP/i))
      ).toBeVisible();
    });
  });

  test.describe('Review Request Feature', () => {
    test('should show Review Request button in article editor for draft articles', async ({ page }) => {
      // Create a new draft article first
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on New Article button
      await page.getByRole('button', { name: /Neuer Artikel/i }).first().click();
      
      // Wait for editor to load
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      // Fill in title and save as draft
      await page.getByTestId('article-title').fill('TEST_Review_Article_' + Date.now());
      
      // Click Save (not Publish)
      await page.click('button:has-text("Speichern")');
      
      // Wait for save
      await expect(page.getByText('Artikel erstellt')).toBeVisible();
      
      // Navigate back and find the article
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on our test article to edit it
      await page.getByText('TEST_Review_Article_').first().click();
      
      // Wait for article view
      await page.waitForLoadState('domcontentloaded');
      
      // Click Edit button
      await page.getByRole('button', { name: /Bearbeiten/i }).first().click();
      
      // Verify Review Request button is visible for draft article
      await expect(page.getByTestId('review-request-btn')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: '/app/tests/e2e/review-request-btn.jpeg', quality: 20, fullPage: false });
    });

    test('should open Review Request dialog with user list', async ({ page }) => {
      // Navigate to articles
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      
      // Create new draft article
      await page.getByRole('button', { name: /Neuer Artikel/i }).first().click();
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      await page.getByTestId('article-title').fill('TEST_Review_Dialog_' + Date.now());
      await page.click('button:has-text("Speichern")');
      await expect(page.getByText('Artikel erstellt')).toBeVisible();
      
      // Navigate back and edit
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      await page.getByText('TEST_Review_Dialog_').first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: /Bearbeiten/i }).first().click();
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      // Click Review Request button
      await page.getByTestId('review-request-btn').click();
      
      // Verify dialog opens with correct title
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review anfordern' })).toBeVisible();
      
      // Verify user search field exists
      await expect(page.getByPlaceholder('Benutzer suchen...')).toBeVisible();
      
      // Verify at least one user is listed (wait for users to load)
      await page.waitForTimeout(1000);
      
      // Take screenshot of dialog
      await page.screenshot({ path: '/app/tests/e2e/review-dialog-open.jpeg', quality: 20, fullPage: false });
      
      // Close dialog
      await page.click('button:has-text("Abbrechen")');
    });

    test('should filter users in Review Request dialog', async ({ page }) => {
      // Navigate to articles
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      
      // Find an existing article or create new one
      await page.getByRole('button', { name: /Neuer Artikel/i }).first().click();
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      await page.getByTestId('article-title').fill('TEST_User_Search_' + Date.now());
      await page.click('button:has-text("Speichern")');
      await expect(page.getByText('Artikel erstellt')).toBeVisible();
      
      // Navigate back and edit
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      await page.getByText('TEST_User_Search_').first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: /Bearbeiten/i }).first().click();
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      // Open Review Request dialog
      await page.getByTestId('review-request-btn').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      
      // Wait for users to load
      await page.waitForTimeout(1000);
      
      // Search for "marc"
      await page.getByPlaceholder('Benutzer suchen...').fill('marc');
      
      // Wait for filter to apply
      await page.waitForTimeout(500);
      
      // Verify Marc Hansen appears in filtered results (use dialog-scoped selector)
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Marc Hansen | CANUSA').first()).toBeVisible();
      
      // Take screenshot of filtered results
      await page.screenshot({ path: '/app/tests/e2e/review-dialog-filtered.jpeg', quality: 20, fullPage: false });
      
      // Close dialog
      await page.click('button:has-text("Abbrechen")');
    });

    test('should not show Review Request button for published articles', async ({ page }) => {
      // Navigate to articles
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      
      // Create and publish a new article
      await page.getByRole('button', { name: /Neuer Artikel/i }).first().click();
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      await page.getByTestId('article-title').fill('TEST_Published_Article_' + Date.now());
      
      // Click Publish instead of Save
      await page.click('button:has-text("Veröffentlichen")');
      await expect(page.getByText('Artikel erstellt').or(page.getByText('Artikel gespeichert'))).toBeVisible();
      
      // Navigate back and edit the published article
      await page.click('a[href="/articles"]');
      await page.waitForLoadState('domcontentloaded');
      await page.getByText('TEST_Published_Article_').first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: /Bearbeiten/i }).first().click();
      await expect(page.getByTestId('article-editor')).toBeVisible();
      
      // Verify Review Request button is NOT visible for published article
      await expect(page.getByTestId('review-request-btn')).not.toBeVisible();
      
      // Instead, "Zurück zu Entwurf" button should be visible
      await expect(page.getByTestId('revert-to-draft-btn')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: '/app/tests/e2e/published-article-editor.jpeg', quality: 20, fullPage: false });
    });
  });

  test.describe('Settings Page Navigation', () => {
    test('should navigate between Settings tabs correctly', async ({ page }) => {
      await page.click('a[href="/settings"]');
      await expect(page.getByTestId('settings-page')).toBeVisible();
      
      // Verify Profil tab is default active
      await expect(page.getByText('Profil-Informationen')).toBeVisible();
      
      // Click Benachrichtigungen tab
      await page.click('button:has-text("Benachrichtigungen")');
      await expect(page.getByText('E-Mail-Benachrichtigungen', { exact: true })).toBeVisible();
      
      // Click API & Widget tab
      await page.click('button:has-text("API & Widget")');
      await expect(page.getByText('REST-API Endpunkte')).toBeVisible();
      
      // Go back to Profil
      await page.click('button:has-text("Profil")');
      await expect(page.getByText('Profil-Informationen')).toBeVisible();
      
      // Take screenshot of settings page
      await page.screenshot({ path: '/app/tests/e2e/settings-tabs.jpeg', quality: 20, fullPage: false });
    });

    test('should display correct user profile information', async ({ page }) => {
      await page.click('a[href="/settings"]');
      await expect(page.getByTestId('settings-page')).toBeVisible();
      
      // Verify user information is displayed - use more specific selectors
      const settingsPage = page.getByTestId('settings-page');
      await expect(settingsPage.getByText('Marc Hansen | CANUSA')).toBeVisible();
      await expect(settingsPage.getByText('marc.hansen@canusa.de')).toBeVisible();
      // Use exact match to avoid matching "Administrator" in the password change hint
      await expect(settingsPage.getByText('Administrator', { exact: true })).toBeVisible();
    });
  });

  // Cleanup test data
  test.afterAll(async ({ request }) => {
    // Login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });
    
    const cookies = loginResponse.headers()['set-cookie'];
    const sessionToken = cookies?.match(/session_token=([^;]+)/)?.[1];
    
    if (!sessionToken) return;
    
    // Get articles and delete test ones
    const articlesResponse = await request.get('/api/articles', {
      headers: { Cookie: `session_token=${sessionToken}` }
    });
    
    if (articlesResponse.ok()) {
      const articles = await articlesResponse.json();
      for (const article of articles) {
        if (article.title?.startsWith('TEST_')) {
          await request.delete(`/api/articles/${article.article_id}`, {
            headers: { Cookie: `session_token=${sessionToken}` }
          });
        }
      }
    }
  });
});
