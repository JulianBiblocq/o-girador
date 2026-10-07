import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe('Tolérance aux mesures non assignées (33 mesures) et Navigation PISTES / ÉDITEUR', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/?view=roda');
    await page.waitForTimeout(1000);
    await ensureStudioLoaded(page);

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });
  });

  test('Le Séquenceur temporel supporte un projet à 33 mesures creuses sans crash ni éjection', async ({ page }) => {
    // 1. Configurer 33 mesures avec des motifs clairsemés (mesures 13 et 25 seulement, indices 12 et 24)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__;
      const state = store.getState();

      const totalM = 33;
      // Étendre ou tronquer sans passer par les helpers d'automatisation
      store.setState({
        totalMeasures: totalM,
        tracks: state.tracks.map((t: any) => ({
          ...t,
          patterns: t.patterns.map((p: any, pIdx: number) => {
            const assignments = Array(totalM).fill(false);
            if (pIdx === 0) {
              assignments[12] = true; // Mesure 13
              assignments[24] = true; // Mesure 25
            }
            return {
              ...p,
              measureAssignments: assignments
            };
          })
        }))
      });
    });

    // 2. Basculer vers la vue Timeline (SÉQUENCEUR) via le clic sur l'onglet
    const timelineTab = page.locator('button:has-text("SÉQUENCEUR"), button:has-text("SEQUENCIADOR")');
    await timelineTab.click();

    // 3. Vérifier que TimelineSequencer est bien monté et ne crash pas
    await page.waitForSelector('.timeline-sequencer-container', { state: 'visible', timeout: 10000 });

    // 4. Vérifier qu'aucun message d'erreur d'ErrorBoundary n'apparaît
    const errorFallback = page.locator('text=Impossible de charger le module "Linha do Tempo / Timeline"');
    await expect(errorFallback).not.toBeVisible();

    // 5. Vérifier que la 33ème mesure existe dans la timeline (M.33 ou C.33)
    const measure33 = page.getByText(/^[MC]\.33$/).first();
    await expect(measure33).toBeAttached();
  });

  test('Navigation PISTES / ÉDITEUR : exclusivité stricte et fermeture de l\'éditeur', async ({ page }) => {
    // 1. Ouvrir l'éditeur d'instrument
    const editeurTab = page.locator('button:has-text("ÉDITEUR"), button:has-text("EDITOR")');
    await editeurTab.click();

    // 2. Vérifier que l'éditeur est ouvert dans le store et que seul l'onglet ÉDITEUR est actif
    await page.waitForFunction(() => {
      const state = (window as any).__SEQUENCER_STORE__?.getState();
      return state?.editingTrackId !== null;
    }, { timeout: 5000 });

    const pistesTab = page.locator('button:has-text("PISTES"), button:has-text("PISTAS")');

    // Vérifier les classes actives (utiliser un negative lookbehind pour ignorer hover:bg-)
    await expect(editeurTab).toHaveClass(/(?<!hover:)bg-\[var\(--cordel-text\)\]/);
    await expect(pistesTab).not.toHaveClass(/(?<!hover:)bg-\[var\(--cordel-text\)\]/);

    // 3. Cliquer sur l'onglet PISTES
    await pistesTab.click();

    // 4. Vérifier que l'éditeur s'est immédiatement refermé (editingTrackId === null)
    await page.waitForFunction(() => {
      const state = (window as any).__SEQUENCER_STORE__?.getState();
      return state?.editingTrackId === null;
    }, { timeout: 5000 });

    // 5. Vérifier que seul l'onglet PISTES est maintenant actif et que l'ÉDITEUR ne l'est plus
    await expect(pistesTab).toHaveClass(/(?<!hover:)bg-\[var\(--cordel-text\)\]/);
    await expect(editeurTab).not.toHaveClass(/(?<!hover:)bg-\[var\(--cordel-text\)\]/);
  });
});
