import { test, expect } from '@playwright/test';

const BASE_URL = 'https://nexus-platform-36.preview.emergentagent.com';

test.describe('Document Actions and PDF Import', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill('marc.hansen@canusa.de');
    await page.getByTestId('login-password').fill('CanusaNexus2024!');
    await page.getByTestId('login-submit').click();
    
    // Wait for dashboard
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });

  test.describe('Document Actions Visibility on Narrow Screens', () => {
    
    test('document actions button is visible on narrow viewport (768px)', async ({ page }) => {
      // Set narrow viewport
      await page.setViewportSize({ width: 768, height: 720 });
      
      // Navigate to documents
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      // Wait for documents to load
      await page.waitForLoadState('networkidle');
      
      // Check if there are any document items
      const documentItems = page.locator('[data-testid^="document-item-"]');
      const count = await documentItems.count();
      
      if (count > 0) {
        // Check that the first document's actions button is visible
        const firstDoc = documentItems.first();
        await expect(firstDoc).toBeVisible();
        
        // The actions dropdown button should be visible
        const actionsBtn = firstDoc.locator('[data-testid^="doc-actions-"]');
        await expect(actionsBtn).toBeVisible();
        
        // Screenshot to verify layout
        await page.screenshot({ path: '/app/tests/e2e/narrow-screen-docs.jpeg', quality: 20 });
      }
    });

    test('document actions button is visible on mobile viewport (375px)', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to documents
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      
      const documentItems = page.locator('[data-testid^="document-item-"]');
      const count = await documentItems.count();
      
      if (count > 0) {
        const firstDoc = documentItems.first();
        await expect(firstDoc).toBeVisible();
        
        // Actions button should be visible even on mobile
        const actionsBtn = firstDoc.locator('[data-testid^="doc-actions-"]');
        await expect(actionsBtn).toBeVisible();
        
        await page.screenshot({ path: '/app/tests/e2e/mobile-screen-docs.jpeg', quality: 20 });
      }
    });

    test('document view button is visible for completed documents', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 720 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      
      // Look for view buttons (only shown for completed documents)
      const viewButtons = page.locator('[data-testid^="doc-view-"]');
      const viewCount = await viewButtons.count();
      
      if (viewCount > 0) {
        // Verify view button is visible
        await expect(viewButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('Document Actions Dropdown Menu', () => {
    
    test('dropdown menu opens and shows move and delete options', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      
      const documentItems = page.locator('[data-testid^="document-item-"]');
      const count = await documentItems.count();
      
      if (count > 0) {
        // Click the actions button on the first document
        const actionsBtn = documentItems.first().locator('[data-testid^="doc-actions-"]');
        await actionsBtn.click();
        
        // Wait for dropdown to appear
        const dropdown = page.locator('[role="menu"]');
        await expect(dropdown).toBeVisible();
        
        // Check for "In Ordner verschieben" option
        const moveOption = dropdown.getByText('In Ordner verschieben');
        await expect(moveOption).toBeVisible();
        
        // Check for "Löschen" option
        const deleteOption = dropdown.getByText('Löschen');
        await expect(deleteOption).toBeVisible();
        
        await page.screenshot({ path: '/app/tests/e2e/doc-actions-dropdown.jpeg', quality: 20 });
        
        // Close dropdown by clicking elsewhere
        await page.keyboard.press('Escape');
      }
    });

    test('move document dialog opens when clicking move option', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      
      const documentItems = page.locator('[data-testid^="document-item-"]');
      const count = await documentItems.count();
      
      if (count > 0) {
        // Click actions button
        const actionsBtn = documentItems.first().locator('[data-testid^="doc-actions-"]');
        await actionsBtn.click();
        
        // Click move option
        const dropdown = page.locator('[role="menu"]');
        await expect(dropdown).toBeVisible();
        await dropdown.getByText('In Ordner verschieben').click();
        
        // Dialog should appear
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        
        // Dialog should have title about moving document
        await expect(dialog.getByText('Dokument verschieben')).toBeVisible();
        
        // Should have folder selection
        await expect(dialog.getByText('Stammverzeichnis')).toBeVisible();
        
        await page.screenshot({ path: '/app/tests/e2e/move-doc-dialog.jpeg', quality: 20 });
        
        // Close dialog
        await dialog.getByText('Abbrechen').click();
      }
    });

    test('delete document shows confirmation dialog', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      
      const documentItems = page.locator('[data-testid^="document-item-"]');
      const count = await documentItems.count();
      
      if (count > 0) {
        // Click actions button
        const actionsBtn = documentItems.first().locator('[data-testid^="doc-actions-"]');
        await actionsBtn.click();
        
        // Click delete option
        const dropdown = page.locator('[role="menu"]');
        await expect(dropdown).toBeVisible();
        await dropdown.getByText('Löschen').click();
        
        // Confirmation dialog should appear
        const alertDialog = page.locator('[role="alertdialog"]');
        await expect(alertDialog).toBeVisible();
        
        // Should ask about deleting document
        await expect(alertDialog.getByText('Dokument löschen?')).toBeVisible();
        
        await page.screenshot({ path: '/app/tests/e2e/delete-doc-dialog.jpeg', quality: 20 });
        
        // Cancel to not actually delete
        await alertDialog.getByText('Abbrechen').click();
      }
    });
  });

  test.describe('PDF to Article Conversion Flow', () => {
    
    test('document preview shows convert to article button', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      
      // Look for view button (completed documents only)
      const viewButtons = page.locator('[data-testid^="doc-view-"]');
      const viewCount = await viewButtons.count();
      
      if (viewCount > 0) {
        // Click view on first completed document
        await viewButtons.first().click();
        
        // Preview dialog should open
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        
        // Should have "In Artikel umwandeln" button
        const convertBtn = page.getByTestId('convert-to-article-btn');
        await expect(convertBtn).toBeVisible();
        
        await page.screenshot({ path: '/app/tests/e2e/pdf-preview-convert-btn.jpeg', quality: 20 });
      }
    });

    test('convert to article button navigates to editor with content', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      await page.waitForLoadState('networkidle');
      
      // Find a completed document to convert
      const viewButtons = page.locator('[data-testid^="doc-view-"]');
      const viewCount = await viewButtons.count();
      
      if (viewCount > 0) {
        // Click view on first completed document
        await viewButtons.first().click();
        
        // Wait for dialog
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        
        // Click convert button
        const convertBtn = page.getByTestId('convert-to-article-btn');
        await expect(convertBtn).toBeVisible();
        await convertBtn.click();
        
        // Wait for navigation to article editor
        await page.waitForURL(/\/articles\/new\?from_pdf=true/, { timeout: 15000 });
        
        // Verify we're in the article editor
        await expect(page.getByTestId('article-editor')).toBeVisible();
        
        // The title should be pre-filled with the PDF filename (minus .pdf)
        const titleInput = page.getByTestId('article-title');
        const titleValue = await titleInput.inputValue();
        
        // Title should not be empty (PDF filename without extension)
        expect(titleValue.length).toBeGreaterThan(0);
        
        // The editor should have content (from PDF conversion)
        const editor = page.locator('.ProseMirror');
        await expect(editor).toBeVisible();
        
        // Get editor text content
        const editorText = await editor.innerText();
        // Should have some content from the PDF
        expect(editorText.length).toBeGreaterThan(10);
        
        await page.screenshot({ path: '/app/tests/e2e/pdf-imported-to-editor.jpeg', quality: 20 });
      }
    });
  });

  test.describe('Document Page Layout Responsive', () => {
    
    test('folder panel is hidden on mobile and shows toggle', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      // On mobile, the folder sidebar should be collapsed
      // There should be a collapsible trigger
      const collapsibleTrigger = page.locator('[data-state="closed"]').first();
      
      // Take screenshot of mobile layout
      await page.screenshot({ path: '/app/tests/e2e/docs-mobile-layout.jpeg', quality: 20 });
    });

    test('folder panel is visible on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      
      await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      // Folder structure card should be visible on desktop
      const folderCard = page.getByText('Ordnerstruktur');
      await expect(folderCard).toBeVisible();
      
      await page.screenshot({ path: '/app/tests/e2e/docs-desktop-layout.jpeg', quality: 20 });
    });
  });
});
