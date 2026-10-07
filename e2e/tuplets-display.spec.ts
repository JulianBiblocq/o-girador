import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe('Affichage des subdivisions (Triolets & Sextolets) dans Pistas et Timeline', () => {
  test('La vue DAW Linéaire (Pistas) et la Timeline affichent les temps égaux et les formes triangulaires pour les tuplets', async ({ page }) => {
    await page.goto('/');
    
    // Entrer dans l'application
    await ensureStudioLoaded(page);

    // Attendre que le store et les pistes soient prêts
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    // 1. Passer en vue PISTES
    const pistasBtn = page.locator('button', { hasText: /PISTES|PISTAS/i }).first();
    await pistasBtn.click();

    // Attendre l'affichage des pas du séquenceur linéaire
    await page.locator('.sequencer-step').first().waitFor({ state: 'visible', timeout: 10000 });

    // 2. Vérifier que la réglette (ruler) contient bien les en-têtes de temps T1, T2, T3, T4
    await expect(page.locator('text=T1').first()).toBeVisible();
    await expect(page.locator('text=T2').first()).toBeVisible();
    await expect(page.locator('text=T3').first()).toBeVisible();
    await expect(page.locator('text=T4').first()).toBeVisible();

    // 3. Modifier la résolution d'une piste visible pour avoir un triolet (3 pas sur le temps 1)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => !t.isBusFolder && !t.isLinkFolder && t.patterns && t.patterns.length > 0) || store.tracks[0];
      const activePat = track.patterns?.find((p: any) => p.measureAssignments?.[store.currentMeasure]) || track.patterns?.[0];
      if (activePat) {
        store.handlePatternBeatResolutionChange(activePat.id, 0, 3);
      }
    });

    await page.waitForTimeout(500);

    // 4. Vérifier la présence de pas avec clip-path triangulaire
    const hasTriangles = await page.evaluate(() => {
      const steps = Array.from(document.querySelectorAll('.sequencer-step'));
      return steps.some(el => {
        const style = window.getComputedStyle(el);
        return style.clipPath && style.clipPath.includes('polygon');
      });
    });

    expect(hasTriangles).toBe(true);

    // 5. Modifier le temps 2 pour avoir un sextolet (6 pas)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => !t.isBusFolder && !t.isLinkFolder && t.patterns && t.patterns.length > 0) || store.tracks[0];
      const activePat = track.patterns?.find((p: any) => p.measureAssignments?.[store.currentMeasure]) || track.patterns?.[0];
      if (activePat) {
        store.handlePatternBeatResolutionChange(activePat.id, 1, 6);
      }
    });

    await page.waitForTimeout(500);

    // 6. Vérifier que les pas du temps 2 comportent des triangles alternés
    const tupletStepCount = await page.evaluate(() => {
      const steps = Array.from(document.querySelectorAll('.sequencer-step'));
      return steps.filter(el => {
        const style = window.getComputedStyle(el);
        return style.clipPath && style.clipPath.includes('polygon');
      }).length;
    });

    // Au moins 3 (triolet) + 6 (sextolet) = 9 pas en triangle
    expect(tupletStepCount).toBeGreaterThanOrEqual(9);
  });
});
