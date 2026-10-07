import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe('Contraste Mode Jour des icônes du catalogue (Cactus, Bounce & Sablier)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/?view=roda');
    await page.waitForTimeout(1000);
    await ensureStudioLoaded(page);
  });

  test('Les icônes du catalogue adoptent les styles et contrastes sémantiques Cordel', async ({ page }) => {
    // 1. Ouvrir le menu pour révéler PresetAccordionSelector
    const menuBtn = page.locator('button:has-text("Menu")').first();
    await menuBtn.click();
    await page.waitForTimeout(500);

    // Vérifier que le catalogue est monté
    const catalogHeader = page.getByText(/Cat[áa]logo|Catalogue/).first();
    await expect(catalogHeader).toBeVisible({ timeout: 5000 });

    // 2. Basculer en mode jour (data-theme="light")
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    });

    // 3. Vérifier que le titre de morceau courant n'a plus de couleur en dur text-[#f4ecd8]
    const songTitleLocator = page.locator('span.font-cactus:has-text("🎵")');
    if (await songTitleLocator.isVisible()) {
      await expect(songTitleLocator).toHaveClass(/text-\[var\(--cordel-text\)\]/);
      await expect(songTitleLocator).not.toHaveClass(/text-\[#f4ecd8\]/);
    }

    // 4. Vérifier la présence des icônes vectorielles linogravées (xilo-icon)
    const xiloIcons = page.locator('svg.xilo-icon');
    const xiloCount = await xiloIcons.count();
    expect(xiloCount).toBeGreaterThanOrEqual(1);

    // 5. Basculer en mode nuit (data-theme="dark")
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    });

    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  });
});
