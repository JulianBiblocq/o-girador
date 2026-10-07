import { Page } from '@playwright/test';

/**
 * Franchit la Landing Page si elle est affichée,
 * ou poursuit immédiatement si la session est déjà dans le studio.
 */
export async function ensureStudioLoaded(page: Page): Promise<void> {
  const entraBtn = page.locator('#entra-btn, button:has-text("ENTRA NA RODA")');
  if (await entraBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
    await entraBtn.click();
  }
  // Confirmation d'ancrage dans le studio
  await page.locator('header, #app-header, .roda-container').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
}
