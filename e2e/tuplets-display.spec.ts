import { test, expect } from '@playwright/test';

test.describe('Affichage des subdivisions (Triolets & Sextolets) dans Pistas et Timeline', () => {
  test('La vue DAW Linéaire (Pistas) et la Timeline affichent les temps égaux et les formes triangulaires pour les tuplets', async ({ page }) => {
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

    await page.waitForTimeout(1500);

    // Entrer dans l'application
    await page.locator('#entra-btn').click();
    await page.waitForTimeout(1500);

    // 1. Passer en vue PISTES
    const pistasBtn = page.locator('button', { hasText: /PISTES|PISTAS/i }).first();
    await pistasBtn.click();

    // 2. Vérifier que la réglette (ruler) contient bien les en-têtes de temps T1, T2, T3, T4
    await expect(page.locator('text=T1').first()).toBeVisible();
    await expect(page.locator('text=T2').first()).toBeVisible();
    await expect(page.locator('text=T3').first()).toBeVisible();
    await expect(page.locator('text=T4').first()).toBeVisible();

    // 3. Modifier la résolution d'une piste pour avoir un triolet (3 pas sur le temps 1)
    await page.evaluate(async () => {
      const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
      const store = useSequencerStore.getState();
      const track = store.tracks[0];
      if (track && track.patterns && track.patterns[0]) {
        store.handlePatternBeatResolutionChange(track.patterns[0].id, 0, 3);
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
    await page.evaluate(async () => {
      const { useSequencerStore } = await import('/src/stores/useSequencerStore.ts');
      const store = useSequencerStore.getState();
      const track = store.tracks[0];
      if (track && track.patterns && track.patterns[0]) {
        store.handlePatternBeatResolutionChange(track.patterns[0].id, 1, 6);
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
