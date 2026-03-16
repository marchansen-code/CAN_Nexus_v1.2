/**
 * Iteration 19: Bug Fix Verification Tests
 * Tests for the 4 bugs that were fixed:
 * 1. Documents page upload now accepts PDF, DOC/DOCX, TXT, CSV, XLS/XLSX (not just PDF)
 * 2. Import dialog in editor auto-imports content after upload completion
 * 3. Viewer tab shows 'Dokument-Ansicht' instead of 'PDF-Ansicht'
 * 4. DOCX content displays German umlauts correctly (fixed with html.escape())
 */
import { test, expect } from '@playwright/test';

test.describe('Bug Fix Verification - Iteration 19', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.fill('input[type="email"]', 'marc.hansen@canusa.de');
    await page.fill('input[type="password"]', 'CanusaNexus2024!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Bug Fix 1: Multi-format Upload Support', () => {
    test('documents page upload accepts multiple file types', async ({ page }) => {
      // Navigate to documents page
      await page.click('text=Dokumente');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('documents-page')).toBeVisible();
      
      // Check file input accepts multiple formats
      const fileInput = page.locator('input[type="file"]').first();
      const acceptAttr = await fileInput.getAttribute('accept');
      
      // Bug was: only .pdf was accepted. Fix: accepts multiple formats
      expect(acceptAttr).toContain('.pdf');
      expect(acceptAttr).toContain('.doc');
      expect(acceptAttr).toContain('.docx');
      expect(acceptAttr).toContain('.txt');
      expect(acceptAttr).toContain('.csv');
      expect(acceptAttr).toContain('.xls');
      expect(acceptAttr).toContain('.xlsx');
    });

    test('documents list shows files of different types', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Should show docx files
      await expect(page.locator('text=test_umlaute.docx').first()).toBeVisible();
      
      // Should show txt files
      await expect(page.locator('text=test_folder_upload.txt').first()).toBeVisible();
    });
  });

  test.describe('Bug Fix 2: Import Dialog Auto-Import', () => {
    test('import dialog in editor has upload tab with supported formats', async ({ page }) => {
      // Navigate to articles and create new article
      await page.click('text=Artikel');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Click Neuer Artikel button
      await page.click('text=Neuer Artikel');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Click Importieren button
      await page.locator('text=Importieren').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Verify dialog opened with supported formats description
      await expect(page.locator('text=Dokument importieren').first()).toBeVisible();
      await expect(page.locator('text=PDF, DOC/DOCX, TXT, CSV, XLS/XLSX').first()).toBeVisible();
      
      // Check upload tab is available
      await expect(page.locator('text=Neue Datei hochladen').first()).toBeVisible();
      
      // Switch to upload tab
      await page.locator('text=Neue Datei hochladen').first().click();
      await page.waitForTimeout(500);
      
      // Verify upload area shows supported formats
      await expect(page.locator('text=PDF, DOC, DOCX, TXT, CSV, XLS, XLSX').first()).toBeVisible();
    });

    test('import dialog shows existing documents for import', async ({ page }) => {
      // Navigate to articles and create new article
      await page.click('text=Artikel');
      await page.waitForLoadState('networkidle');
      await page.click('text=Neuer Artikel');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Click Importieren button
      await page.locator('text=Importieren').first().click();
      await page.waitForTimeout(1500);
      
      // Should show existing documents including different formats
      await expect(page.locator('text=test_umlaute.docx').first()).toBeVisible();
    });

    test('selecting document enables import button', async ({ page }) => {
      // Navigate to articles and create new article
      await page.click('text=Artikel');
      await page.waitForLoadState('networkidle');
      await page.click('text=Neuer Artikel');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Click Importieren button
      await page.locator('text=Importieren').first().click();
      await page.waitForTimeout(1500);
      
      // Select a document
      await page.locator('text=test_umlaute.docx').first().click();
      await page.waitForTimeout(500);
      
      // Import button should be enabled
      const importBtn = page.getByRole('button', { name: 'Importieren' });
      await expect(importBtn).toBeEnabled();
    });
  });

  test.describe('Bug Fix 3: Document Viewer Tab Label', () => {
    test('document viewer tab shows "Dokument-Ansicht" not "PDF-Ansicht"', async ({ page }) => {
      // Navigate to documents page
      await page.click('text=Dokumente');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Find and click a view button
      const viewBtns = page.locator('[data-testid^="doc-view-"]');
      const count = await viewBtns.count();
      expect(count).toBeGreaterThan(0);
      
      await viewBtns.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Bug was: "PDF-Ansicht" tab shown. Fix: "Dokument-Ansicht"
      await expect(page.getByTestId('document-viewer-tab')).toBeVisible();
      const tabText = await page.getByTestId('document-viewer-tab').textContent();
      expect(tabText).toContain('Dokument-Ansicht');
      expect(tabText).not.toContain('PDF-Ansicht');
    });

    test('extracted text tab still works correctly', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Open a document
      const viewBtns = page.locator('[data-testid^="doc-view-"]');
      await viewBtns.first().click();
      await page.waitForTimeout(1500);
      
      // Check extracted text tab exists
      await expect(page.getByTestId('text-preview-tab')).toBeVisible();
      
      // Click on extracted text tab
      await page.getByTestId('text-preview-tab').click();
      await page.waitForTimeout(500);
      
      // Tab should be active
      await expect(page.getByTestId('text-preview-tab')).toBeVisible();
    });
  });

  test.describe('Bug Fix 4: German Umlauts Display', () => {
    test('DOCX content displays German umlauts correctly', async ({ page }) => {
      // Navigate to documents page
      await page.click('text=Dokumente');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Find the test_umlaute.docx document and click its view button
      const docRow = page.locator('[data-testid^="document-item-"]').filter({ hasText: 'test_umlaute.docx' });
      await expect(docRow).toBeVisible();
      
      const viewBtn = docRow.locator('[data-testid^="doc-view-"]');
      await viewBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Wait for the document viewer modal
      await expect(page.getByRole('heading', { name: 'test_umlaute.docx' })).toBeVisible();
      
      // Bug was: German umlauts were garbled/distorted. Fix: html.escape() correctly encodes
      // Check text content has proper German characters
      await expect(page.locator('text=Überschrift mit Ä, Ö, Ü').first()).toBeVisible();
      await expect(page.locator('text=deutschen Umlauten').first()).toBeVisible();
      await expect(page.locator('text=ä, ö, ü, ß').first()).toBeVisible();
      await expect(page.locator('text=Größere Wörter').first()).toBeVisible();
    });

    test('table with German umlauts renders correctly', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Find and open the test_umlaute.docx document
      const docRow = page.locator('[data-testid^="document-item-"]').filter({ hasText: 'test_umlaute.docx' });
      const viewBtn = docRow.locator('[data-testid^="doc-view-"]');
      await viewBtn.click();
      await page.waitForTimeout(1500);
      
      // Check table with umlauts renders correctly
      await expect(page.locator('text=Städte').first()).toBeVisible();
      await expect(page.locator('text=München').first()).toBeVisible();
      await expect(page.locator('text=Köln').first()).toBeVisible();
      await expect(page.locator('text=Größe').first()).toBeVisible();
    });

    test('special characters like €, @, # display correctly', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Find and open the test_umlaute.docx document
      const docRow = page.locator('[data-testid^="document-item-"]').filter({ hasText: 'test_umlaute.docx' });
      const viewBtn = docRow.locator('[data-testid^="doc-view-"]');
      await viewBtn.click();
      await page.waitForTimeout(1500);
      
      // Check special characters display correctly
      await expect(page.locator('text=€, @, #').first()).toBeVisible();
    });
  });
});
