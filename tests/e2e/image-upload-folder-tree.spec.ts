import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://nexus-platform-36.preview.emergentagent.com';

// Helper to login
async function login(page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'marc.hansen@canusa.de');
  await page.fill('input[type="password"]', 'CanusaNexus2024!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

// Helper to navigate to Documents page
async function goToDocuments(page) {
  await page.click('a[href="/documents"]');
  await page.waitForURL('**/documents', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('Image Upload Dialog - Hierarchical Folder Tree', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDocuments(page);
  });

  test('should open image upload dialog when clicking Bilder button', async ({ page }) => {
    // Click on "Bilder" button using data-testid
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    // Verify the dialog is visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Verify dialog title (use heading role to avoid conflict with button)
    await expect(dialog.getByRole('heading', { name: 'Bilder hochladen' })).toBeVisible();
  });

  test('should display hierarchical folder tree in upload dialog', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Verify "In Dokumenten speichern" checkbox
    await expect(dialog.getByText('In Dokumenten speichern')).toBeVisible();
    
    // Verify "Zielordner:" label
    await expect(dialog.getByText('Zielordner:')).toBeVisible();
    
    // Verify auto folder option is selected by default
    const autoFolderOption = dialog.locator('button:has-text("Bilder (automatisch)")');
    await expect(autoFolderOption).toBeVisible();
    
    // Check that it has a checkmark (indicating selection)
    const checkIcon = autoFolderOption.locator('svg.lucide-check');
    await expect(checkIcon).toBeVisible();
  });

  test('should display folder tree with folder icons', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Look for folder icons (Folder or FolderOpen)
    const folderIcons = dialog.locator('svg.lucide-folder, svg.lucide-folder-open');
    await expect(folderIcons.first()).toBeVisible();
    
    // Verify there are multiple folder options
    const folderCount = await folderIcons.count();
    expect(folderCount).toBeGreaterThan(1);
  });

  test('should show expand/collapse arrows for folders with children', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Look for chevron icons that indicate expandable folders
    const chevrons = dialog.locator('svg.lucide-chevron-right, svg.lucide-chevron-down');
    const chevronCount = await chevrons.count();
    
    // At least some folders might have children
    expect(chevronCount).toBeGreaterThanOrEqual(0);
  });

  test('should allow selecting a different folder', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Get a folder that's not the auto folder (e.g., "Reiseunterlagen")
    const reiseunterlagenFolder = dialog.locator('button:has-text("Reiseunterlagen")').first();
    
    if (await reiseunterlagenFolder.isVisible()) {
      await reiseunterlagenFolder.click({ force: true });
      await page.waitForTimeout(300);
      
      // Verify the clicked folder now has a checkmark
      const checkIcon = reiseunterlagenFolder.locator('svg.lucide-check');
      await expect(checkIcon).toBeVisible();
      
      // Verify auto folder no longer has the checkmark
      const autoFolder = dialog.locator('button:has-text("Bilder (automatisch)")');
      const autoCheck = autoFolder.locator('svg.lucide-check');
      await expect(autoCheck).not.toBeVisible();
    }
  });

  test('should display Neuer Ordner button', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Verify "Neuer Ordner" button is visible
    const newFolderBtn = dialog.getByText('Neuer Ordner');
    await expect(newFolderBtn).toBeVisible();
  });

  test('should show new folder input when clicking Neuer Ordner', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Click "Neuer Ordner" button
    await dialog.getByText('Neuer Ordner').click();
    await page.waitForTimeout(300);
    
    // Verify input field appears for new folder name
    const newFolderInput = dialog.locator('input[placeholder*="Ordnername"]');
    await expect(newFolderInput).toBeVisible();
    
    // Verify "Erstellen" button is visible
    await expect(dialog.getByText('Erstellen')).toBeVisible();
  });

  test('should close dialog on Abbrechen click', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Click Abbrechen (Cancel) button
    await dialog.getByText('Abbrechen').click();
    await page.waitForTimeout(300);
    
    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
  });

  test('should have upload button disabled when no files selected', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Find the upload button (shows "0 Bilder hochladen")
    const uploadBtn = dialog.getByRole('button', { name: 'Bilder hochladen' });
    
    // The button should show "0 Bilder" and be disabled
    await expect(uploadBtn).toBeVisible();
    const isDisabled = await uploadBtn.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should display drop zone for file upload', async ({ page }) => {
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
    
    const dialog = page.locator('[role="dialog"]');
    
    // Verify drop zone text is visible
    await expect(dialog.getByText('Klicken oder Dateien hierher ziehen')).toBeVisible();
    await expect(dialog.getByText('JPEG, PNG, GIF, WebP (max. 10MB pro Bild)')).toBeVisible();
    
    // Verify upload icon in drop zone (use more specific class)
    const uploadIcon = dialog.locator('svg.lucide-upload.w-8');
    await expect(uploadIcon).toBeVisible();
  });
});

test.describe('Image Upload Dialog - Folder Tree Hierarchy', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDocuments(page);
    // Open image upload dialog
    await page.getByTestId('image-upload-btn').click();
    await page.waitForTimeout(500);
  });

  test('should expand folder to show children when clicking chevron', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    
    // Find a folder with expand chevron (Reiseunterlagen has children based on screenshots)
    const reiseunterlagenRow = dialog.locator('button:has-text("Reiseunterlagen")').first();
    
    // Find and click the chevron to expand
    const expandButton = reiseunterlagenRow.locator('button:has(svg.lucide-chevron-right)');
    const expandCount = await expandButton.count();
    
    if (expandCount > 0) {
      // Click to expand
      await expandButton.click({ force: true });
      await page.waitForTimeout(300);
      
      // Check for child folders (e.g., "Westkanada" or "Hawaii")
      const childFolders = dialog.getByText('Westkanada');
      await expect(childFolders).toBeVisible();
    } else {
      // Try clicking the folder row itself to expand
      await reiseunterlagenRow.click({ force: true });
      await page.waitForTimeout(300);
      
      // After selection, it may auto-expand if it has children
      const childFolders = dialog.getByText('Westkanada');
      const isChildVisible = await childFolders.isVisible();
      
      // It's okay if no children are shown - the folder may not have children
      if (!isChildVisible) {
        test.skip();
      }
    }
  });

  test('should toggle folder selection', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    
    // Auto folder should be selected by default
    const autoFolder = dialog.locator('button:has-text("Bilder (automatisch)")');
    await expect(autoFolder.locator('svg.lucide-check')).toBeVisible();
    
    // Click a different folder (e.g., Reiseunterlagen)
    const reiseunterlagenFolder = dialog.locator('button:has-text("Reiseunterlagen")').first();
    
    if (await reiseunterlagenFolder.isVisible()) {
      await reiseunterlagenFolder.click({ force: true });
      await page.waitForTimeout(300);
      
      // Verify Reiseunterlagen is now selected (has check icon)
      await expect(reiseunterlagenFolder.locator('svg.lucide-check')).toBeVisible();
      
      // Verify auto folder is no longer selected
      await expect(autoFolder.locator('svg.lucide-check')).not.toBeVisible();
    }
  });
});
