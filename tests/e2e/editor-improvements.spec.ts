import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://nexus-platform-36.preview.emergentagent.com';

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill('marc.hansen@canusa.de');
  await page.getByTestId('login-password').fill('CanusaNexus2024!');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('dashboard')).toBeVisible();
}

async function navigateToNewArticle(page: Page) {
  await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('article-editor')).toBeVisible();
}

async function removeEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

test.describe('Editor Improvements - Iteration 23', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Lists Display in Article View', () => {
    
    test('bullet list displays correctly in article view', async ({ page }) => {
      // Navigate to an existing article or create one
      await page.goto('/articles', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('articles-page')).toBeVisible();
      
      // Click on first article in the list
      const articleLink = page.locator('article a, [data-testid="article-link"]').first();
      if (await articleLink.count() > 0) {
        await articleLink.click();
        await expect(page.getByTestId('article-view')).toBeVisible();
        
        // Check if article content area exists
        const content = page.getByTestId('article-content');
        await expect(content).toBeVisible();
        
        // Take screenshot of article view to verify list styling
        await page.screenshot({ path: 'e2e/article-view-content.jpeg', quality: 20, fullPage: false });
        
        // Check that the content area has prose class (which has list styling)
        const hasProseClass = await content.evaluate(el => el.classList.contains('prose'));
        expect(hasProseClass).toBe(true);
      }
    });

    test('lists are styled in editor mode', async ({ page }) => {
      await navigateToNewArticle(page);
      
      // Get the editor
      const editor = page.locator('.ProseMirror');
      await expect(editor).toBeVisible();
      
      // Click into the editor
      await editor.click();
      
      // Find the bullet list button in toolbar
      const bulletListBtn = page.locator('button[title*="Aufzählung"], button:has(svg.lucide-list)').first();
      await expect(bulletListBtn).toBeVisible();
      
      // Click bullet list button
      await bulletListBtn.click();
      
      // Type some list items
      await editor.pressSequentially('First item');
      await page.keyboard.press('Enter');
      await editor.pressSequentially('Second item');
      
      // Verify list was created
      const bulletList = editor.locator('ul');
      await expect(bulletList).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'e2e/editor-bullet-list.jpeg', quality: 20, fullPage: false });
    });

    test('numbered list works in editor', async ({ page }) => {
      await navigateToNewArticle(page);
      
      const editor = page.locator('.ProseMirror');
      await expect(editor).toBeVisible();
      await editor.click();
      
      // Find numbered list button
      const orderedListBtn = page.locator('button[title*="Nummerierte"], button:has(svg.lucide-list-ordered)').first();
      await expect(orderedListBtn).toBeVisible();
      
      await orderedListBtn.click();
      
      await editor.pressSequentially('Step 1');
      await page.keyboard.press('Enter');
      await editor.pressSequentially('Step 2');
      
      // Verify ordered list was created
      const orderedList = editor.locator('ol');
      await expect(orderedList).toBeVisible();
      
      await page.screenshot({ path: 'e2e/editor-ordered-list.jpeg', quality: 20, fullPage: false });
    });
  });

  test.describe('Fullscreen Editor', () => {
    
    test('fullscreen button exists and opens fullscreen mode', async ({ page }) => {
      await navigateToNewArticle(page);
      
      // Find fullscreen button
      const fullscreenBtn = page.getByTestId('fullscreen-editor-btn');
      await expect(fullscreenBtn).toBeVisible();
      
      // Click fullscreen button
      await fullscreenBtn.click();
      
      // Verify fullscreen editor is visible
      const fullscreenEditor = page.getByTestId('fullscreen-editor');
      await expect(fullscreenEditor).toBeVisible();
      
      // Verify it has the fixed positioning (full screen)
      const hasFixedClass = await fullscreenEditor.evaluate(el => {
        return el.classList.contains('fixed') || window.getComputedStyle(el).position === 'fixed';
      });
      expect(hasFixedClass).toBe(true);
      
      await page.screenshot({ path: 'e2e/fullscreen-editor-open.jpeg', quality: 20, fullPage: false });
    });

    test('fullscreen editor toolbar does not overlap content', async ({ page }) => {
      await navigateToNewArticle(page);
      
      const fullscreenBtn = page.getByTestId('fullscreen-editor-btn');
      await fullscreenBtn.click();
      
      const fullscreenEditor = page.getByTestId('fullscreen-editor');
      await expect(fullscreenEditor).toBeVisible();
      
      // Get the toolbar and editor content area
      const toolbar = fullscreenEditor.locator('.border-b').first();
      const editorContent = fullscreenEditor.locator('.ProseMirror');
      
      // Both should be visible
      await expect(toolbar).toBeVisible();
      await expect(editorContent).toBeVisible();
      
      // Get bounding boxes to check they don't overlap
      const toolbarBox = await toolbar.boundingBox();
      const contentBox = await editorContent.boundingBox();
      
      if (toolbarBox && contentBox) {
        // Content should start after toolbar ends (no overlap)
        // Allow small gap tolerance
        expect(contentBox.y).toBeGreaterThanOrEqual(toolbarBox.y + toolbarBox.height - 5);
      }
      
      await page.screenshot({ path: 'e2e/fullscreen-editor-layout.jpeg', quality: 20, fullPage: false });
    });

    test('can close fullscreen editor with X button', async ({ page }) => {
      await navigateToNewArticle(page);
      
      await page.getByTestId('fullscreen-editor-btn').click();
      await expect(page.getByTestId('fullscreen-editor')).toBeVisible();
      
      // Find close button with X icon
      const closeBtn = page.getByTestId('fullscreen-editor').locator('button:has-text("Beenden"), button:has(svg.lucide-x)').first();
      await expect(closeBtn).toBeVisible();
      
      await closeBtn.click();
      
      // Fullscreen should be closed
      await expect(page.getByTestId('fullscreen-editor')).not.toBeVisible();
    });

    test('can close fullscreen editor with Escape key', async ({ page }) => {
      await navigateToNewArticle(page);
      
      await page.getByTestId('fullscreen-editor-btn').click();
      await expect(page.getByTestId('fullscreen-editor')).toBeVisible();
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Fullscreen should be closed
      await expect(page.getByTestId('fullscreen-editor')).not.toBeVisible();
    });
  });

  test.describe('Multi-Image Upload', () => {
    
    test('multi-image upload button exists in toolbar', async ({ page }) => {
      await navigateToNewArticle(page);
      
      // Look for the multi-image upload button (Images icon)
      const multiImageBtn = page.locator('button[title*="Mehrere Bilder"], button:has(svg.lucide-images)').first();
      await expect(multiImageBtn).toBeVisible();
      
      await page.screenshot({ path: 'e2e/editor-multi-image-btn.jpeg', quality: 20, fullPage: false });
    });

    test('multi-image upload dialog opens on click', async ({ page }) => {
      await navigateToNewArticle(page);
      
      const multiImageBtn = page.locator('button[title*="Mehrere Bilder"], button:has(svg.lucide-images)').first();
      await multiImageBtn.click();
      
      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // Should have the title "Bilder hochladen" (use getByRole heading to be specific)
      await expect(dialog.getByRole('heading', { name: 'Bilder hochladen' })).toBeVisible();
      
      // Should have drop zone
      await expect(dialog.locator('text=Klicken oder Dateien hierher ziehen')).toBeVisible();
      
      // Should have checkbox for saving to documents
      await expect(dialog.getByText(/Dokumenten-Ordner.*Bilder/)).toBeVisible();
      
      await page.screenshot({ path: 'e2e/multi-image-dialog.jpeg', quality: 20, fullPage: false });
    });

    test('multi-image dialog can be closed', async ({ page }) => {
      await navigateToNewArticle(page);
      
      const multiImageBtn = page.locator('button[title*="Mehrere Bilder"], button:has(svg.lucide-images)').first();
      await multiImageBtn.click();
      
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      
      // Click cancel/close button
      const cancelBtn = dialog.getByText('Abbrechen');
      await cancelBtn.click();
      
      // Dialog should close
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe('HTML Editor Mode', () => {
    
    test('HTML editor toggle button exists in toolbar', async ({ page }) => {
      await navigateToNewArticle(page);
      
      // Look for HTML button in toolbar
      const htmlBtn = page.locator('button:has-text("HTML"), button[title*="HTML"]').first();
      await expect(htmlBtn).toBeVisible();
      
      await page.screenshot({ path: 'e2e/editor-html-btn.jpeg', quality: 20, fullPage: false });
    });

    test('clicking HTML button shows HTML textarea', async ({ page }) => {
      await navigateToNewArticle(page);
      
      // First add some content
      const editor = page.locator('.ProseMirror');
      await editor.click();
      await editor.pressSequentially('Test content for HTML');
      
      // Click HTML button
      const htmlBtn = page.locator('button:has-text("HTML"), button[title*="HTML"]').first();
      await htmlBtn.click();
      
      // Should show textarea with HTML content
      const htmlTextarea = page.locator('textarea[placeholder*="HTML"]');
      await expect(htmlTextarea).toBeVisible();
      
      // Should contain some HTML
      const htmlContent = await htmlTextarea.inputValue();
      expect(htmlContent).toContain('<p>');
      expect(htmlContent).toContain('Test content for HTML');
      
      await page.screenshot({ path: 'e2e/html-editor-mode.jpeg', quality: 20, fullPage: false });
    });

    test('HTML editor has apply and cancel buttons', async ({ page }) => {
      await navigateToNewArticle(page);
      
      const htmlBtn = page.locator('button:has-text("HTML"), button[title*="HTML"]').first();
      await htmlBtn.click();
      
      // Should have "Änderungen übernehmen" button
      const applyBtn = page.locator('button:has-text("Änderungen übernehmen")');
      await expect(applyBtn).toBeVisible();
      
      // Should have "Abbrechen" button
      const cancelBtn = page.locator('button:has-text("Abbrechen")').first();
      await expect(cancelBtn).toBeVisible();
    });

    test('HTML editor cancel returns to visual editor', async ({ page }) => {
      await navigateToNewArticle(page);
      
      const htmlBtn = page.locator('button:has-text("HTML"), button[title*="HTML"]').first();
      await htmlBtn.click();
      
      const htmlTextarea = page.locator('textarea[placeholder*="HTML"]');
      await expect(htmlTextarea).toBeVisible();
      
      // Click cancel
      const cancelBtn = page.locator('button:has-text("Abbrechen")').first();
      await cancelBtn.click();
      
      // Should return to visual editor (ProseMirror)
      await expect(htmlTextarea).not.toBeVisible();
      await expect(page.locator('.ProseMirror')).toBeVisible();
    });

    test('HTML editor apply updates content', async ({ page }) => {
      await navigateToNewArticle(page);
      
      const htmlBtn = page.locator('button:has-text("HTML"), button[title*="HTML"]').first();
      await htmlBtn.click();
      
      const htmlTextarea = page.locator('textarea[placeholder*="HTML"]');
      await expect(htmlTextarea).toBeVisible();
      
      // Clear and add custom HTML
      await htmlTextarea.clear();
      await htmlTextarea.fill('<p>Custom HTML content <strong>bold</strong></p>');
      
      // Click apply
      const applyBtn = page.locator('button:has-text("Änderungen übernehmen")');
      await applyBtn.click();
      
      // Should return to visual editor with the content
      const editor = page.locator('.ProseMirror');
      await expect(editor).toBeVisible();
      await expect(editor.locator('text=Custom HTML content')).toBeVisible();
      await expect(editor.locator('strong:has-text("bold")')).toBeVisible();
    });
  });
});
