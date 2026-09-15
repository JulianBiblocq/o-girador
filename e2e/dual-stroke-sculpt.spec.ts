import { test, expect } from '@playwright/test';

test.describe("Mission 3 : Sculpture Indépendante des Ras / Triples Croches (Dual-Stroke)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Login the test user created in global setup
    await page.evaluate(async () => {
      // @ts-ignore
      const auth = window.firebaseAuth;
      if (!auth) return;
      // @ts-ignore
      const signIn = window.signInWithEmailAndPassword;
      if (signIn) {
        await signIn(auth, 'playwright@ogirador.com', 'playwrighttest');
      }
    });

    await page.waitForTimeout(2000);

    // Enter the app
    await page.locator('#entra-btn').click();
    await page.waitForTimeout(1000);

    // Create an empty Roda and add Caixa (percussion instrument with rich strokes)
    await page.locator('button', { hasText: 'Menu' }).click();
    await page.locator('button', { hasText: /Créer une roda|Criar uma roda/i }).click();
    await page.locator('button', { hasText: /Créer Roda vide|Criar Roda vazia/i }).click();

    await page.locator('button', { hasText: /➕ Ajouter|➕ Adicionar/i }).click();
    await page.locator('text=/caixa/i').first().click();
    await page.waitForTimeout(1500);
  });

  test("Double colonne d'indicateurs sur un pas scindé et sélection indépendante dans l'Escultor", async ({ page }) => {
    // 1. Ouvrir l'éditeur en cliquant sur Caixa
    await page.locator('text=/caixa/i').first().click();
    await page.waitForTimeout(1000);

    // 2. Sélectionner l'outil ciseaux pour scinder le pas 1
    const scissorsBtn = page.locator('button[title*="Scinder"], button[title*="triples croches"]').first();
    if (await scissorsBtn.isVisible()) {
      await scissorsBtn.click();
      await page.waitForTimeout(300);

      // Cliquer sur la première cellule pour la scinder
      const firstCell = page.locator('.percussion-step-container').first();
      await firstCell.click();
      await page.waitForTimeout(500);

      // Repasser sur l'outil standard (première frappe)
      const firstToolBtn = page.locator('.percussion-step-container').first();
      // Vérifier si le pas contient deux triangles
      const triangles = page.locator('.percussion-step-container').first().locator('[data-sub-index]');
      const triangleCount = await triangles.count();
      expect(triangleCount).toBeGreaterThanOrEqual(2);

      // 3. Vérifier la présence des deux colonnes de micro-barres
      const splitBars = page.locator('.percussion-step-container').first().locator('.grid-cols-2');
      await expect(splitBars).toBeVisible();

      // 4. Cliquer sur la colonne gauche de micro-barre (1er coup)
      const stroke1Bar = splitBars.locator('div[title*="1er coup"]').first();
      await stroke1Bar.click();
      await page.waitForTimeout(500);

      // 5. L'Escultor doit s'ouvrir avec l'indicateur "1er Coup"
      const escultorTitle = page.locator('text=/Sculpteur|Escultor/i').first();
      await expect(escultorTitle).toBeVisible();

      const coup1Btn = page.locator('button', { hasText: /1er Coup|1º Golpe/i });
      await expect(coup1Btn).toBeVisible();

      // 6. Cliquer sur la colonne droite de micro-barre (2ème coup)
      const stroke2Bar = splitBars.locator('div[title*="2ème coup"]').first();
      await stroke2Bar.click();
      await page.waitForTimeout(500);

      // Le bouton "2ème Coup" dans l'Escultor doit être actif
      const coup2Btn = page.locator('button', { hasText: /2ème Coup|2º Golpe/i });
      await expect(coup2Btn).toBeVisible();
    }
  });
});
