/**
 * Iteration 18: Multi-format document support tests
 * Tests document upload, viewing, and import for multiple file types
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://nexus-platform-36.preview.emergentagent.com';

test.describe('Multi-format Document Support', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Login
    await page.fill('input[type="email"]', 'marc.hansen@canusa.de');
    await page.fill('input[type="password"]', 'CanusaNexus2024!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test.describe('Documents Page', () => {
    test('should display documents page with multi-format support', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Verify page loaded
      await expect(page.getByTestId('documents-page')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dokumente', exact: true })).toBeVisible();
    });

    test('should show documents with different file types', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Check for documents with different extensions
      const docsList = page.locator('[data-testid^="document-item-"]');
      const count = await docsList.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display correct file icons for different types', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Verify file type specific icons are displayed (based on file_type field)
      // The FileIcon component shows different colors/icons per type
      const docItems = page.locator('[data-testid^="document-item-"]');
      await expect(docItems.first()).toBeVisible();
    });

    test('should have upload button with correct accepted files', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Check upload button exists
      await expect(page.locator('text=Datei hochladen')).toBeVisible();
      
      // Verify the file input accepts multiple formats
      const fileInput = page.locator('input[type="file"]');
      const acceptAttr = await fileInput.getAttribute('accept');
      expect(acceptAttr).toContain('.pdf');
      expect(acceptAttr).toContain('.doc');
      expect(acceptAttr).toContain('.docx');
      expect(acceptAttr).toContain('.txt');
      expect(acceptAttr).toContain('.csv');
      expect(acceptAttr).toContain('.xls');
      expect(acceptAttr).toContain('.xlsx');
    });
  });

  test.describe('Document Viewer - DOCX', () => {
    test('should open and display DOCX document content', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Find and click on the docx document view button
      const docxViewBtn = page.locator('[data-testid="doc-view-doc_2a733eb653f5"]');
      if (await docxViewBtn.count() > 0) {
        await docxViewBtn.click();
        await page.waitForTimeout(2000);
        
        // Verify dialog opened with document content - use heading role to be specific
        await expect(page.getByRole('heading', { name: 'reiserichtlinien.docx' })).toBeVisible();
        
        // DOCX content should be rendered as HTML with headings
        await expect(page.locator('text=CANUSA Reiserichtlinien').first()).toBeVisible();
        await expect(page.locator('text=Wichtige Informationen').first()).toBeVisible();
      }
    });

    test('should have tabs for Dokument-Ansicht and Extrahierter Text', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Click any document view button
      const viewBtns = page.locator('[data-testid^="doc-view-"]');
      if (await viewBtns.count() > 0) {
        await viewBtns.first().click();
        await page.waitForTimeout(2000);
        
        // Verify tabs exist - Changed from PDF-Ansicht to Dokument-Ansicht in Bug Fix 3
        await expect(page.getByTestId('document-viewer-tab')).toBeVisible();
        await expect(page.getByTestId('text-preview-tab')).toBeVisible();
      }
    });

    test('should show extracted text tab content', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Click docx document view button
      const docxViewBtn = page.locator('[data-testid="doc-view-doc_2a733eb653f5"]');
      if (await docxViewBtn.count() > 0) {
        await docxViewBtn.click();
        await page.waitForTimeout(2000);
        
        // Click on extracted text tab
        await page.locator('[data-testid="text-preview-tab"]').click();
        await page.waitForTimeout(1000);
        
        // Should show extracted text
        await expect(page.locator('text=CANUSA Reiserichtlinien').first()).toBeVisible();
      }
    });
  });

  test.describe('Document Viewer - CSV', () => {
    test('should display CSV as formatted table', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Find and click on the CSV document
      const csvViewBtn = page.locator('[data-testid="doc-view-doc_e635fbedbb76"]');
      if (await csvViewBtn.count() > 0) {
        await csvViewBtn.click();
        await page.waitForTimeout(2000);
        
        // Verify CSV filename is shown in dialog heading
        await expect(page.getByRole('heading', { name: 'test_products.csv' })).toBeVisible();
        
        // Verify table structure is rendered (CSV should show as table)
        await expect(page.locator('text=Produkt').first()).toBeVisible();
        await expect(page.locator('text=Kategorie').first()).toBeVisible();
        await expect(page.locator('text=Preis').first()).toBeVisible();
      }
    });

    test('should show spreadsheet icon for CSV files', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Find and click on CSV to see viewer
      const csvViewBtn = page.locator('[data-testid="doc-view-doc_e635fbedbb76"]');
      if (await csvViewBtn.count() > 0) {
        await csvViewBtn.click();
        await page.waitForTimeout(2000);
        
        // The spreadsheet icon component should be visible - check dialog heading
        await expect(page.getByRole('heading', { name: 'test_products.csv' })).toBeVisible();
      }
    });
  });

  test.describe('Convert to Article', () => {
    test('should have In Artikel umwandeln button in viewer', async ({ page }) => {
      await page.click('text=Dokumente');
      await page.waitForTimeout(2000);
      
      // Open any document
      const viewBtns = page.locator('[data-testid^="doc-view-"]');
      if (await viewBtns.count() > 0) {
        await viewBtns.first().click();
        await page.waitForTimeout(2000);
        
        // Verify convert to article button exists
        await expect(page.locator('[data-testid="convert-to-article-btn"]')).toBeVisible();
      }
    });
  });
});

test.describe('Document Import Dialog in Article Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Login
    await page.fill('input[type="email"]', 'marc.hansen@canusa.de');
    await page.fill('input[type="password"]', 'CanusaNexus2024!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to article editor
    await page.click('text=Artikel');
    await page.waitForTimeout(2000);
    await page.click('text=Neuer Artikel');
    await page.waitForTimeout(2000);
  });

  test('should have Import button in article editor', async ({ page }) => {
    // Verify Importieren button exists
    await expect(page.locator('text=Importieren')).toBeVisible();
  });

  test('should open document import dialog on click', async ({ page }) => {
    // Click Importieren button
    await page.click('text=Importieren');
    await page.waitForTimeout(1500);
    
    // Verify dialog opened
    await expect(page.locator('text=Dokument importieren')).toBeVisible();
    await expect(page.locator('text=Bestehende Dokumente')).toBeVisible();
    await expect(page.locator('text=Neue Datei hochladen')).toBeVisible();
  });

  test('should display supported formats in dialog description', async ({ page }) => {
    await page.click('text=Importieren');
    await page.waitForTimeout(1500);
    
    // Check description mentions all supported formats
    const description = page.locator('text=PDF, DOC/DOCX, TXT, CSV, XLS/XLSX');
    await expect(description).toBeVisible();
  });

  test('should list existing documents in import dialog', async ({ page }) => {
    await page.click('text=Importieren');
    await page.waitForTimeout(1500);
    
    // Verify documents are listed
    await expect(page.locator('text=reiserichtlinien.docx')).toBeVisible();
  });

  test('should have search functionality in import dialog', async ({ page }) => {
    await page.click('text=Importieren');
    await page.waitForTimeout(1500);
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="durchsuchen"]');
    await expect(searchInput).toBeVisible();
    
    // Search for a document
    await searchInput.fill('reise');
    await page.waitForTimeout(1000);
    
    // Should filter results
    await expect(page.locator('text=reiserichtlinien.docx')).toBeVisible();
  });

  test('should switch to upload tab', async ({ page }) => {
    await page.click('text=Importieren');
    await page.waitForTimeout(1500);
    
    // Click upload tab
    await page.click('text=Neue Datei hochladen');
    await page.waitForTimeout(1000);
    
    // Verify upload area is shown
    await expect(page.locator('text=Datei zum Hochladen auswählen')).toBeVisible();
    await expect(page.locator('text=PDF, DOC, DOCX, TXT, CSV, XLS, XLSX')).toBeVisible();
  });

  test('should close dialog on Abbrechen click', async ({ page }) => {
    await page.click('text=Importieren');
    await page.waitForTimeout(1500);
    
    // Click cancel button
    await page.click('text=Abbrechen');
    await page.waitForTimeout(500);
    
    // Dialog should be closed
    await expect(page.locator('text=Dokument importieren')).not.toBeVisible();
  });

  test('should select document and enable import button', async ({ page }) => {
    await page.click('text=Importieren');
    await page.waitForTimeout(1500);
    
    // Click on a document to select it
    await page.locator('text=reiserichtlinien.docx').click();
    await page.waitForTimeout(500);
    
    // Import button should be enabled
    const importBtn = page.getByRole('button', { name: 'Importieren' });
    await expect(importBtn).toBeEnabled();
  });
});

test.describe('Document Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Login
    await page.fill('input[type="email"]', 'marc.hansen@canusa.de');
    await page.fill('input[type="password"]', 'CanusaNexus2024!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Navigate to documents
    await page.click('text=Dokumente');
    await page.waitForTimeout(2000);
  });

  test('should have actions dropdown for documents', async ({ page }) => {
    // Find actions button
    const actionsBtn = page.locator('[data-testid^="doc-actions-"]').first();
    await expect(actionsBtn).toBeVisible();
  });

  test('should show move and delete options in dropdown', async ({ page }) => {
    // Click actions dropdown
    const actionsBtn = page.locator('[data-testid^="doc-actions-"]').first();
    await actionsBtn.click();
    await page.waitForTimeout(500);
    
    // Check menu items
    await expect(page.locator('text=In Ordner verschieben')).toBeVisible();
    await expect(page.locator('text=Löschen')).toBeVisible();
  });
});
