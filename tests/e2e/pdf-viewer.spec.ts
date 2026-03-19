import { test, expect } from '@playwright/test';

const BASE_URL = 'https://nexus-platform-36.preview.emergentagent.com';
const TEST_DOC_ID = 'doc_71438fad9dc7';

test.describe('PDF Viewer Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill('marc.hansen@canusa.de');
    await page.getByTestId('login-password').fill('CanusaNexus2024!');
    await page.getByTestId('login-submit').click();
    
    // Wait for dashboard
    await expect(page.getByTestId('dashboard')).toBeVisible();
    
    // Navigate to documents
    await page.goto(`${BASE_URL}/documents`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('documents-page')).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Document Preview Dialog Tabs', () => {
    
    test('preview dialog shows PDF-Ansicht and Extrahierter Text tabs', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await expect(viewBtn).toBeVisible();
      await viewBtn.click();
      
      // Dialog should open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Check for tabs
      const pdfViewerTab = page.getByTestId('pdf-viewer-tab');
      const textPreviewTab = page.getByTestId('text-preview-tab');
      
      await expect(pdfViewerTab).toBeVisible();
      await expect(textPreviewTab).toBeVisible();
      
      // Verify tab labels
      await expect(pdfViewerTab).toContainText('PDF-Ansicht');
      await expect(textPreviewTab).toContainText('Extrahierter Text');
      
      await page.screenshot({ path: '/app/tests/e2e/pdf-viewer-tabs.jpeg', quality: 20 });
    });

    test('PDF-Ansicht tab is selected by default', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // PDF viewer tab should be active by default
      const pdfViewerTab = page.getByTestId('pdf-viewer-tab');
      await expect(pdfViewerTab).toHaveAttribute('data-state', 'active');
    });

    test('can switch between PDF-Ansicht and Extrahierter Text tabs', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Initially PDF viewer tab is active
      const pdfViewerTab = page.getByTestId('pdf-viewer-tab');
      const textPreviewTab = page.getByTestId('text-preview-tab');
      
      await expect(pdfViewerTab).toHaveAttribute('data-state', 'active');
      await expect(textPreviewTab).toHaveAttribute('data-state', 'inactive');
      
      // Click on Extrahierter Text tab
      await textPreviewTab.click();
      
      // Now text tab should be active
      await expect(textPreviewTab).toHaveAttribute('data-state', 'active');
      await expect(pdfViewerTab).toHaveAttribute('data-state', 'inactive');
      
      // Should show extracted text content area
      const textContent = dialog.locator('pre');
      await expect(textContent).toBeVisible();
      
      await page.screenshot({ path: '/app/tests/e2e/text-tab-content.jpeg', quality: 20 });
      
      // Switch back to PDF viewer
      await pdfViewerTab.click();
      await expect(pdfViewerTab).toHaveAttribute('data-state', 'active');
    });
  });

  test.describe('PDF Viewer Controls', () => {
    
    test('PDF viewer shows toolbar with controls', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Wait for PDF to load - look for the toolbar area
      const toolbar = dialog.locator('.bg-slate-100.dark\\:bg-slate-800').first();
      await expect(toolbar).toBeVisible();
      
      // Page navigation controls
      // Previous page button
      const prevPageBtn = dialog.locator('button[title="Vorherige Seite"]');
      await expect(prevPageBtn).toBeVisible();
      
      // Next page button
      const nextPageBtn = dialog.locator('button[title="Nächste Seite"]');
      await expect(nextPageBtn).toBeVisible();
      
      // Page number input
      const pageInput = dialog.locator('input[type="number"]');
      await expect(pageInput).toBeVisible();
      
      await page.screenshot({ path: '/app/tests/e2e/pdf-viewer-toolbar.jpeg', quality: 20 });
    });

    test('PDF viewer has zoom controls', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Zoom out button
      const zoomOutBtn = dialog.locator('button[title="Verkleinern"]');
      await expect(zoomOutBtn).toBeVisible();
      
      // Zoom in button
      const zoomInBtn = dialog.locator('button[title="Vergrößern"]');
      await expect(zoomInBtn).toBeVisible();
      
      // Zoom percentage display - should show 100% initially
      const zoomDisplay = dialog.locator('text=100%');
      await expect(zoomDisplay).toBeVisible();
    });

    test('zoom in increases zoom percentage', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Initial zoom should be 100%
      await expect(dialog.locator('text=100%')).toBeVisible();
      
      // Click zoom in
      const zoomInBtn = dialog.locator('button[title="Vergrößern"]');
      await zoomInBtn.click();
      
      // Zoom should increase to 125%
      await expect(dialog.locator('text=125%')).toBeVisible();
      
      await page.screenshot({ path: '/app/tests/e2e/pdf-viewer-zoomed.jpeg', quality: 20 });
    });

    test('zoom out decreases zoom percentage', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Initial zoom should be 100%
      await expect(dialog.locator('text=100%')).toBeVisible();
      
      // Click zoom out
      const zoomOutBtn = dialog.locator('button[title="Verkleinern"]');
      await zoomOutBtn.click();
      
      // Zoom should decrease to 75%
      await expect(dialog.locator('text=75%')).toBeVisible();
    });

    test('PDF viewer has rotate control', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Rotate button
      const rotateBtn = dialog.locator('button[title="Drehen"]');
      await expect(rotateBtn).toBeVisible();
    });

    test('PDF viewer has download control', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Download button
      const downloadBtn = dialog.locator('button[title="Herunterladen"]');
      await expect(downloadBtn).toBeVisible();
    });
  });

  test.describe('PDF Viewer Content Loading', () => {
    
    test('PDF viewer loads and displays PDF content', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Wait for PDF to load - the Document component should render
      // The react-pdf library renders a canvas element for the PDF
      const pdfContainer = dialog.locator('.react-pdf__Document');
      await expect(pdfContainer).toBeVisible();
      
      // Page should be rendered
      const pdfPage = dialog.locator('.react-pdf__Page');
      await expect(pdfPage).toBeVisible();
      
      await page.screenshot({ path: '/app/tests/e2e/pdf-viewer-loaded.jpeg', quality: 20 });
    });

    test('PDF viewer shows page count after loading', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Wait for PDF to load
      const pdfPage = dialog.locator('.react-pdf__Page');
      await expect(pdfPage).toBeVisible();
      
      // Page count should be displayed (/ X format)
      // The test document has 1 page, so it should show "/ 1"
      const pageCountText = dialog.locator('text=/\\/ \\d+/');
      await expect(pageCountText).toBeVisible();
    });
  });

  test.describe('Extrahierter Text Tab Content', () => {
    
    test('extracted text tab shows document text', async ({ page }) => {
      // Open document preview
      const viewBtn = page.getByTestId(`doc-view-${TEST_DOC_ID}`);
      await viewBtn.click();
      
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Switch to text tab
      const textPreviewTab = page.getByTestId('text-preview-tab');
      await textPreviewTab.click();
      
      // Text content should be visible
      const textContent = dialog.locator('pre');
      await expect(textContent).toBeVisible();
      
      // Should have actual content (not empty)
      const text = await textContent.innerText();
      expect(text.length).toBeGreaterThan(0);
      
      await page.screenshot({ path: '/app/tests/e2e/extracted-text-content.jpeg', quality: 20 });
    });
  });
});
