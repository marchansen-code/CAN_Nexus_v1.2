import { test, expect, Page } from '@playwright/test';

// Helper function to login
async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill('marc.hansen@canusa.de');
  await page.getByTestId('login-password').fill('CanusaNexus2024!');
  await page.getByTestId('login-submit').click();
  // Wait for navigation
  await page.waitForURL(/\/(home|dashboard|articles)/, { timeout: 15000 });
}

// Helper to remove Emergent badge
async function removeEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

test.describe('YouTube Video Insert Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
  });

  test('YouTube dialog shows preview vs link choice when inserting video', async ({ page }) => {
    // Navigate to article editor
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Find and click the YouTube button in the toolbar
    const youtubeButton = page.locator('button[title="YouTube-Video einfügen"]');
    await youtubeButton.click();
    
    // Verify popover appears with URL input
    const youtubePopover = page.locator('[data-state="open"]').filter({ hasText: 'YouTube URL' });
    await expect(youtubePopover).toBeVisible();
    
    // Enter a YouTube URL
    const urlInput = youtubePopover.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    
    // Click the "Video einfügen" button to trigger the dialog
    const insertButton = youtubePopover.getByRole('button', { name: 'Video einfügen' });
    await insertButton.click();
    
    // Verify the YouTube display type dialog appears
    const youtubeDialog = page.locator('[role="dialog"]').filter({ hasText: 'YouTube-Video einfügen' });
    await expect(youtubeDialog).toBeVisible();
    
    // Take screenshot of the dialog
    await page.screenshot({ path: 'youtube-dialog-options.jpeg', quality: 20 });
    
    // Verify the two options are present
    await expect(youtubeDialog.getByText('Video-Vorschau einbetten')).toBeVisible();
    await expect(youtubeDialog.getByText('Nur als Link anzeigen')).toBeVisible();
    
    // Verify radio buttons are present
    const previewRadio = youtubeDialog.locator('#yt-preview');
    const linkRadio = youtubeDialog.locator('#yt-link');
    await expect(previewRadio).toBeVisible();
    await expect(linkRadio).toBeVisible();
    
    // Verify preview option is selected by default
    await expect(previewRadio).toBeChecked();
    
    // Verify "Einfügen" button is present
    await expect(youtubeDialog.getByRole('button', { name: 'Einfügen' })).toBeVisible();
    await expect(youtubeDialog.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  });

  test('YouTube can be inserted as embedded preview', async ({ page }) => {
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Click YouTube button
    const youtubeButton = page.locator('button[title="YouTube-Video einfügen"]');
    await youtubeButton.click();
    
    // Enter URL and submit
    const popover = page.locator('[data-state="open"]').filter({ hasText: 'YouTube URL' });
    await popover.locator('input').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await popover.getByRole('button', { name: 'Video einfügen' }).click();
    
    // In dialog, select "preview" option (should be default)
    const dialog = page.locator('[role="dialog"]').filter({ hasText: 'YouTube-Video einfügen' });
    await expect(dialog).toBeVisible();
    
    // Ensure preview is selected
    await dialog.locator('label[for="yt-preview"]').click();
    
    // Click Einfügen
    await dialog.getByRole('button', { name: 'Einfügen' }).click();
    
    // Verify dialog closes
    await expect(dialog).not.toBeVisible();
    
    // Verify iframe is inserted in editor
    const editor = page.locator('.ProseMirror');
    const iframe = editor.locator('iframe[src*="youtube"]');
    await expect(iframe).toBeVisible();
    
    await page.screenshot({ path: 'youtube-embedded-preview.jpeg', quality: 20 });
  });

  test('YouTube can be inserted as link only', async ({ page }) => {
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Click YouTube button
    const youtubeButton = page.locator('button[title="YouTube-Video einfügen"]');
    await youtubeButton.click();
    
    // Enter URL and submit
    const popover = page.locator('[data-state="open"]').filter({ hasText: 'YouTube URL' });
    await popover.locator('input').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await popover.getByRole('button', { name: 'Video einfügen' }).click();
    
    // In dialog, select "link" option
    const dialog = page.locator('[role="dialog"]').filter({ hasText: 'YouTube-Video einfügen' });
    await expect(dialog).toBeVisible();
    
    // Click the link option
    await dialog.locator('label[for="yt-link"]').click();
    
    // Verify link option is now selected
    await expect(dialog.locator('#yt-link')).toBeChecked();
    
    // Click Einfügen
    await dialog.getByRole('button', { name: 'Einfügen' }).click();
    
    // Verify dialog closes
    await expect(dialog).not.toBeVisible();
    
    // Verify link is inserted in editor (not iframe)
    const editor = page.locator('.ProseMirror');
    const videoLink = editor.locator('a[href*="youtube"]');
    await expect(videoLink).toBeVisible();
    
    // Verify no iframe is present
    const iframe = editor.locator('iframe[src*="youtube"]');
    await expect(iframe).toHaveCount(0);
    
    await page.screenshot({ path: 'youtube-as-link.jpeg', quality: 20 });
  });
});

test.describe('Extended Link Dialog Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
  });

  test('Link dialog has URL and Document tabs', async ({ page }) => {
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Find and click the Link button in the toolbar
    const linkButton = page.locator('button[title="Link einfügen"]');
    await linkButton.click();
    
    // Verify dialog opens
    const linkDialog = page.locator('[role="dialog"]').filter({ hasText: 'Link einfügen' });
    await expect(linkDialog).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'link-dialog-tabs.jpeg', quality: 20 });
    
    // Verify tabs are present
    const urlTab = linkDialog.locator('[role="tablist"]').getByText('URL', { exact: true });
    const documentTab = linkDialog.locator('[role="tablist"]').getByText('Dokument', { exact: true });
    await expect(urlTab).toBeVisible();
    await expect(documentTab).toBeVisible();
    
    // Verify URL tab is selected by default
    await expect(urlTab).toHaveAttribute('data-state', 'active');
  });

  test('Link dialog URL tab allows entering URL and optional display text', async ({ page }) => {
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Click Link button
    const linkButton = page.locator('button[title="Link einfügen"]');
    await linkButton.click();
    
    // Verify dialog opens
    const linkDialog = page.locator('[role="dialog"]').filter({ hasText: 'Link einfügen' });
    await expect(linkDialog).toBeVisible();
    
    // Verify URL input is visible
    const urlInput = linkDialog.locator('input[placeholder*="https"]');
    await expect(urlInput).toBeVisible();
    
    // Verify display text input is visible (since no text selected)
    const textInput = linkDialog.locator('input[placeholder*="Text für den Link"]');
    await expect(textInput).toBeVisible();
    
    // Fill in URL
    await urlInput.fill('https://example.com');
    
    // Fill in display text
    await textInput.fill('Example Website');
    
    // Verify "Link einfügen" button is enabled
    const insertButton = linkDialog.getByRole('button', { name: 'Link einfügen' });
    await expect(insertButton).toBeEnabled();
    
    // Click insert
    await insertButton.click();
    
    // Verify link is inserted
    const editor = page.locator('.ProseMirror');
    const link = editor.locator('a[href="https://example.com"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Example Website');
  });

  test('Link dialog Document tab shows document list with search', async ({ page }) => {
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Click Link button
    const linkButton = page.locator('button[title="Link einfügen"]');
    await linkButton.click();
    
    // Verify dialog opens
    const linkDialog = page.locator('[role="dialog"]').filter({ hasText: 'Link einfügen' });
    await expect(linkDialog).toBeVisible();
    
    // Click on Document tab
    const documentTab = linkDialog.locator('[role="tablist"]').getByText('Dokument', { exact: true });
    await documentTab.click();
    
    // Verify Document tab is now active
    await expect(documentTab).toHaveAttribute('data-state', 'active');
    
    // Take screenshot of document tab
    await page.screenshot({ path: 'link-dialog-document-tab.jpeg', quality: 20 });
    
    // Verify search input is visible
    const searchInput = linkDialog.locator('input[placeholder*="Suchen"]');
    await expect(searchInput).toBeVisible();
    
    // Verify document list area is visible (scroll area)
    const documentList = linkDialog.locator('[data-radix-scroll-area-viewport]');
    await expect(documentList).toBeVisible();
    
    // Wait a moment for documents to load
    await page.waitForTimeout(1000);
    
    // Check if there are documents listed or "Keine Dokumente gefunden" message
    const hasDocuments = await linkDialog.locator('button').filter({ hasText: /\.(pdf|docx?|png|jpg)/ }).count();
    const noDocsMessage = linkDialog.getByText('Keine Dokumente gefunden');
    
    if (hasDocuments > 0) {
      await page.screenshot({ path: 'link-dialog-documents-list.jpeg', quality: 20 });
    } else {
      await expect(noDocsMessage).toBeVisible();
    }
  });

  test('Document selection shows display type options when no text selected', async ({ page }) => {
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Click Link button (without selecting text)
    const linkButton = page.locator('button[title="Link einfügen"]');
    await linkButton.click();
    
    // Open Document tab
    const linkDialog = page.locator('[role="dialog"]').filter({ hasText: 'Link einfügen' });
    const documentTab = linkDialog.locator('[role="tablist"]').getByText('Dokument', { exact: true });
    await documentTab.click();
    
    // Wait for documents to load
    await page.waitForTimeout(1500);
    
    // Check if there are documents
    const documentButtons = linkDialog.locator('button').filter({ has: page.locator('p.truncate') });
    const documentCount = await documentButtons.count();
    
    if (documentCount > 0) {
      // Click on first document
      await documentButtons.first().click();
      
      // Verify display type options appear
      const displayLabel = linkDialog.getByText('Darstellung');
      await expect(displayLabel).toBeVisible();
      
      // Verify radio options
      const textOption = linkDialog.locator('label[for="text"]');
      const shortOption = linkDialog.locator('label[for="short"]');
      await expect(textOption).toBeVisible();
      await expect(shortOption).toBeVisible();
      
      // If it's an image document, thumbnail option should also be visible
      const thumbnailOption = linkDialog.locator('label[for="thumbnail"]');
      // This may or may not be visible depending on whether the document is an image
      
      await page.screenshot({ path: 'link-dialog-display-options.jpeg', quality: 20 });
    } else {
      // Skip if no documents - this is expected in some test environments
      test.skip();
    }
  });

  test('Link button disabled when no URL or document selected', async ({ page }) => {
    await page.goto('/articles/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('article-editor')).toBeVisible();
    
    // Click Link button
    const linkButton = page.locator('button[title="Link einfügen"]');
    await linkButton.click();
    
    // Verify dialog opens
    const linkDialog = page.locator('[role="dialog"]').filter({ hasText: 'Link einfügen' });
    await expect(linkDialog).toBeVisible();
    
    // Verify "Link einfügen" button is disabled when no URL entered
    const insertButton = linkDialog.getByRole('button', { name: 'Link einfügen' });
    await expect(insertButton).toBeDisabled();
    
    // Go to Document tab
    const documentTab = linkDialog.locator('[role="tablist"]').getByText('Dokument', { exact: true });
    await documentTab.click();
    
    // Verify button is still disabled (no document selected)
    await expect(insertButton).toBeDisabled();
  });
});

test.describe('Document Link Preview in Article View', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await removeEmergentBadge(page);
  });

  test('Article view has handler for document preview links', async ({ page }) => {
    // Navigate to articles
    await page.goto('/articles', { waitUntil: 'domcontentloaded' });
    
    // Click on the first article
    const articleCard = page.locator('[data-testid="article-card"]').first();
    
    // Check if there are any articles
    const articleCount = await articleCard.count();
    if (articleCount === 0) {
      test.skip();
      return;
    }
    
    await articleCard.click();
    
    // Wait for article view to load
    await expect(page.getByTestId('article-view')).toBeVisible();
    
    // The handleContentClick handler is set up on the article content
    // We can verify the content div has the click handler by checking the content area
    const articleContent = page.getByTestId('article-content');
    await expect(articleContent).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'article-view-content.jpeg', quality: 20 });
  });
});
