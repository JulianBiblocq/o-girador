import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Onglet Éditeur et Fenêtre Détachable", () => {
  test("Le bouton ÉDITEUR est présent dans le Header desktop, ouvre l'éditeur, et supporte le détachement popup", async ({ page }) => {
    await page.goto('/');
    
    // Accéder au studio
    await ensureStudioLoaded(page);

    // Le bouton ÉDITEUR / EDITOR doit être visible sur desktop dans le Header
    const editorHeaderBtn = page.getByRole('button', { name: /ÉDITEUR|EDITOR/i });
    await expect(editorHeaderBtn).toBeVisible({ timeout: 15000 });

    // Attendre que les pistes du séquenceur soient prêtes
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState() || (window as any).useSequencerStore?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 }).catch(() => {});

    // Cliquer sur ÉDITEUR pour ouvrir l'éditeur d'instrument
    await editorHeaderBtn.click();

    // L'éditeur modal doit apparaître avec son bouton fermer ✕ (exact match)
    const closeBtn = page.getByRole('button', { name: '✕', exact: true });
    await expect(closeBtn).toBeVisible({ timeout: 10000 });

    // Le bouton détacher ↗ doit être testé si le multi-fenêtres est actif
    const detachBtn = page.getByRole('button', { name: '↗' });
    if (await detachBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
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
    } else {
      // Mode mono-fenêtre (sanctuarisé) : fermeture directe
      await closeBtn.click();
      await expect(closeBtn).not.toBeVisible({ timeout: 5000 });
    }
  });
});
