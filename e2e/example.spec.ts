import { test, expect } from '@playwright/test';

test('App loads successfully', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  // Update this to match your actual app title
  await expect(page).toHaveTitle(/O Girador/i);
});
