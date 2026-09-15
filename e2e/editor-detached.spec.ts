import { test, expect } from '@playwright/test';

test.describe("Onglet Éditeur et Fenêtre Détachable", () => {
  test("Le bouton ÉDITEUR est présent dans le Header desktop, ouvre l'éditeur, et supporte le détachement popup", async ({ page }) => {
    await page.goto('/');
    
    // Cliquer directement sur ENTRA NA RODA pour accéder au studio
    const enterBtn = page.getByRole('button', { name: 'ENTRA NA RODA' });
    await enterBtn.waitFor({ state: 'visible', timeout: 15000 });
    await enterBtn.click();

    // Attendre que la landing page disparaisse
    await expect(enterBtn).not.toBeVisible({ timeout: 10000 });

    // Le bouton ÉDITEUR / EDITOR doit être visible sur desktop dans le Header
    const editorHeaderBtn = page.getByRole('button', { name: /ÉDITEUR|EDITOR/i });
    await expect(editorHeaderBtn).toBeVisible({ timeout: 15000 });

    // Cliquer sur ÉDITEUR pour ouvrir l'éditeur d'instrument
    await editorHeaderBtn.click();

    // L'éditeur modal doit apparaître avec son bouton fermer ✕ (exact match)
    const closeBtn = page.getByRole('button', { name: '✕', exact: true });
    await expect(closeBtn).toBeVisible({ timeout: 10000 });

    // Le bouton détacher ↗ doit être présent dans le modal de l'éditeur
    const detachBtn = page.getByRole('button', { name: '↗' });
    await expect(detachBtn).toBeVisible({ timeout: 5000 });

    // Tester le détachement en popup window
    const popupPromise = page.waitForEvent('popup');
    await detachBtn.click();
    const popup = await popupPromise;
    await expect(popup).toBeTruthy();

    // Vérifier le titre de la fenêtre détachée
    await expect(async () => {
      const title = await popup.title();
      expect(title).toMatch(/Editor de Instrumento|Éditeur d'Instrument/i);
    }).toPass({ timeout: 5000 });

    // Vérifier que le bouton réintégrer ↙ est présent dans la popup
    const reintegrateBtn = popup.getByRole('button', { name: '↙' });
    await expect(reintegrateBtn).toBeVisible({ timeout: 10000 });

    // Fermeture externe de la popup (comme la croix de l'OS)
    await popup.close();
    await page.waitForTimeout(500);

    // Après fermeture de la popup, l'éditeur peut être rouvert normalement
    await editorHeaderBtn.click();
    const newCloseBtn = page.getByRole('button', { name: '✕', exact: true });
    await expect(newCloseBtn).toBeVisible({ timeout: 10000 });
    await newCloseBtn.click();
    await expect(newCloseBtn).not.toBeVisible({ timeout: 5000 });
  });
});
