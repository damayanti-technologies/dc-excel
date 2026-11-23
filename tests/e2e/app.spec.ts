import { test, expect } from '@playwright/test';

test.describe('OmniSheet Stage 2 Design System & Navigation E2E', () => {
  test('loads home dashboard application shell with correct Stage 2 brand and tokens', async ({ page }) => {
    await page.goto('/');

    // Validate title and brand
    await expect(page).toHaveTitle(/OmniSheet/);
    await expect(page.getByText('OmniSheet').first()).toBeVisible();
    await expect(page.getByText('Stage 2 Design System')).toBeVisible();
  });

  test('navigates cleanly between Home, Settings, and Workbook Editor', async ({ page }) => {
    await page.goto('/');

    // Navigate to Settings via sidebar
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

    // Toggle theme to dark
    const darkButton = page.getByRole('button', { name: 'Dark' });
    if (await darkButton.isVisible()) {
      await darkButton.click();
      await expect(page.locator('html')).toHaveClass(/dark/);
    }

    // Toggle theme back to light
    const lightButton = page.getByRole('button', { name: 'Light' });
    if (await lightButton.isVisible()) {
      await lightButton.click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    }

    // Navigate to Workbook Editor
    await page.goto('/workbook/e2e-demo-sheet');
    await expect(page).toHaveURL(/\/workbook\/e2e-demo-sheet/);
    await expect(page.getByText('Spreadsheet Shell Prepared')).toBeVisible();

    // Navigate back to Home via Sidebar
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\//);
  });

  test('handles mobile drawer navigation responsive interaction', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Hamburger button should be visible on mobile
    const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Drawer should open with navigation links
    await expect(page.getByText('Menu')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    // Close mobile menu
    await page.getByRole('button', { name: 'Close navigation' }).click();
    await expect(page.getByText('Menu')).not.toBeVisible();
  });

  test('handles 404 routes gracefully', async ({ page }) => {
    await page.goto('/non-existent-page-xyz');
    await expect(page.getByText('404 - Page Not Found')).toBeVisible();
    await page.getByRole('link', { name: 'Return to Dashboard' }).click();
    await expect(page).toHaveURL(/\//);
  });
});
