import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test('Membre Samambaia connecté voit bien le catalogue privé Samambaia', async ({ page }) => {
  // 1. Injecter le profil Samambaia via addInitScript avant navigation
  await page.addInitScript(() => {
    localStorage.setItem(
      'girador_test_user_profile',
      JSON.stringify({
        uid: 'playwright-test-uid',
        email: 'playwright@ogirador.com',
        displayName: 'Membre Samambaia',
        role: 'membre',
        groupId: 'Samambaia',
        groupName: 'Samambaia',
        mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
        canWriteSequenciador: true,
      })
    );
  });

  await page.goto('/');

  // 2. Franchir l'accueil studio
  await ensureStudioLoaded(page);

  // 3. Ouvrir le Menu du projet
  const menuBtn = page.locator('button:has-text("Menu")').first();
  await expect(menuBtn).toBeVisible({ timeout: 10000 });
  await menuBtn.click();
  await page.waitForTimeout(500);

  // 4. Utiliser le sélecteur résilient pour le volet de groupe Samambaia
  const groupAccordionBtn = page.locator(
    '[data-testid="group-catalog-samambaia"], button:has-text("Samambaia"), button:has-text("SAMAMBAIA")'
  ).first();
  await expect(groupAccordionBtn).toBeVisible({ timeout: 10000 });

  // 5. Déplier l'accordéon si fermé
  const isExpanded = await groupAccordionBtn.evaluate((btn) => {
    return btn.textContent?.includes('▼') || false;
  });
  if (!isExpanded) {
    await groupAccordionBtn.click();
    await page.waitForTimeout(500);
  }

  // 6. Vérifier la présence des morceaux du groupe (ex: Opanijé)
  const opanijeBtn = page.locator('button:has-text("Opanijé")').first();
  await expect(opanijeBtn).toBeVisible({ timeout: 10000 });

  // 7. Vérifier que le volet public est également présent
  const publicAccordionBtn = page.locator('button:has-text("Catálogo"), button:has-text("Catalogue")').filter({
    hasText: /público|public/i
  }).first();
  await expect(publicAccordionBtn).toBeVisible();

  // 8. Cliquer sur le morceau du groupe et vérifier la mise à jour de l'URL (?loadPreset=)
  await opanijeBtn.click();
  await page.waitForTimeout(1000);
  const currentUrl = page.url();
  console.log('URL after clicking preset:', currentUrl);
  expect(currentUrl).toContain('loadPreset=');
});
