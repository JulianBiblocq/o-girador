import { test, expect } from '@playwright/test';

test.describe("Timeline Floating Pattern Picker on Double-Click", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });
  });

  test("Double-clic ouvre le popover Cordel en vue dézoomée et permet l'assignation de motif et silence", async ({ page }) => {
    // 1. Dézoomer la Timeline pour masquer les <select> natifs (isMinZoom = MEASURE_W <= 120)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      // Forcer une largeur dézoomée
      const seqEl = document.querySelector('.timeline-sequencer-container');
      if (seqEl) {
        seqEl.setAttribute('data-zoom', 'macro');
      }
    });

    // 2. Localiser une cellule de mesure et double-cliquer dessus avec Playwright
    const cell = page.locator('.macro-pattern-block, .cell-macro, .cell-detailed').first();
    await expect(cell).toBeVisible();
    await cell.dblclick();

    // 3. Vérifier que le popover Cordel est affiché
    const popover = page.locator('[data-testid="timeline-pattern-picker-popover"]');
    await expect(popover).toBeVisible({ timeout: 3000 });

    const trackIdStr = await popover.getAttribute('data-track-id');
    const trackId = Number(trackIdStr);
    const measureIdxStr = await popover.getAttribute('data-measure-idx');
    const measureIdx = Number(measureIdxStr);

    // 4. Cliquer sur un motif dans la liste du popover
    const patternBtns = popover.locator('button:not(:has-text("Silence")):not(:has-text("Silêncio")):not(:has-text("maître")):not(:has-text("mestre"))');
    const firstPatternBtn = patternBtns.first();
    const patternName = (await firstPatternBtn.locator('span.truncate').textContent())?.trim();
    await firstPatternBtn.click();
    await page.waitForTimeout(200);

    // Le popover doit être fermé
    await expect(popover).not.toBeVisible();

    // 5. Vérifier dans le store que le motif a été assigné à la mesure
    const assignedPattern = await page.evaluate(({ tId, mIdx }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === tId);
      const activePtn = track?.patterns.find((p: any) => p.measureAssignments[mIdx]);
      return activePtn ? activePtn.name : null;
    }, { tId: trackId, mIdx: measureIdx });

    expect(assignedPattern).toBe(patternName);

    // 6. Ré-ouvrir le popover au double-clic et choisir "Silence"
    await cell.dblclick();
    await expect(popover).toBeVisible({ timeout: 3000 });

    // Cliquer sur le bouton Silence
    const silenceBtn = popover.locator('button', { hasText: 'Silence' }).or(popover.locator('button', { hasText: 'Silêncio' })).first();
    await silenceBtn.click();
    await page.waitForTimeout(200);

    await expect(popover).not.toBeVisible();

    // Vérifier que la cellule est en silence (aucun motif assigné à cette mesure)
    const afterSilence = await page.evaluate(({ tId, mIdx }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === tId);
      const activePtn = track?.patterns.find((p: any) => p.measureAssignments[mIdx]);
      return activePtn ? activePtn.id : null;
    }, { tId: trackId, mIdx: measureIdx });

    expect(afterSilence).toBeNull();
  });

  test("Vérification que la ligne parente Toada ignore le double-clic", async ({ page }) => {
    // Si une piste Toada existe, double-cliquer dessus ne doit pas ouvrir de popover
    const hasToada = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toada = store.tracks.find((t: any) => t.isLinkFolder && t.name?.toLowerCase().includes('toada'));
      return Boolean(toada);
    });

    if (hasToada) {
      await page.evaluate(() => {
        const store = (window as any).__SEQUENCER_STORE__.getState();
        const toada = store.tracks.find((t: any) => t.isLinkFolder && t.name?.toLowerCase().includes('toada'));
        if (toada) {
          const toadaRow = document.querySelector(`[data-track-id="${toada.id}"]`);
          const cell = toadaRow?.querySelector('div[style*="contain: layout paint style"]');
          cell?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
        }
      });

      await page.waitForTimeout(300);
      const popover = page.locator('[data-testid="timeline-pattern-picker-popover"]');
      await expect(popover).not.toBeVisible();
    }
  });

  test("Vérification que le simple clic n'ouvre pas le popover et que Échap le ferme", async ({ page }) => {
    const cell = page.locator('.macro-pattern-block, .cell-macro, .cell-detailed').first();
    const popover = page.locator('[data-testid="timeline-pattern-picker-popover"]');

    // 1. Simple clic
    await cell.click();
    await page.waitForTimeout(300);
    await expect(popover).not.toBeVisible();

    // 2. Double-clic pour ouvrir
    await cell.dblclick();
    await expect(popover).toBeVisible({ timeout: 3000 });

    // 3. Appui sur Escape pour fermer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(popover).not.toBeVisible();
  });
});
