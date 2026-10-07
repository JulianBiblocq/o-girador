import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Timeline Ruler Measure Structure Controls (+ / ×)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);

    await ensureStudioLoaded(page);

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    // S'assurer que le mode illimité est actif pour les tests structurels
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      if (store) {
        store.hasFullPlaybackAccess = true;
        store.maxMeasuresAllowed = null;
      }
    });
  });

  test("Badge BPM retiré et boutons + / × fonctionnels avec Undo (Ctrl+Z)", async ({ page }) => {
    // 1. Vérifier qu'aucun badge de type 'XX BPM' n'est présent dans l'en-tête de mesure de la règle
    const rulerMeasureHeaders = page.locator('.ruler-measure-header');
    await expect(rulerMeasureHeaders.first()).toBeVisible({ timeout: 5000 });

    const bpmBadgeInRuler = page.locator('.ruler-measure-header button:has-text("BPM")');
    await expect(bpmBadgeInRuler).toHaveCount(0);

    // 2. Vérifier la présence des boutons '+' et '×'
    const insertButtons = rulerMeasureHeaders.locator('button:text-is("+")');
    const deleteButtons = rulerMeasureHeaders.locator('button:text-is("×")');
    await expect(insertButtons.first()).toBeVisible();
    await expect(deleteButtons.first()).toBeVisible();

    // Récupérer le nombre initial de mesures
    const initialMeasuresCount = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState()?.totalMeasures || 0;
    });
    expect(initialMeasuresCount).toBeGreaterThan(0);

    // 3. Cliquer sur '+' de la première mesure pour insérer une mesure
    await insertButtons.first().click();
    await page.waitForTimeout(300);

    const afterInsertMeasuresCount = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState()?.totalMeasures || 0;
    });
    expect(afterInsertMeasuresCount).toBe(initialMeasuresCount + 1);

    // 4. Tester l'annulation avec Ctrl+Z
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    const afterUndoCount = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState()?.totalMeasures || 0;
    });
    expect(afterUndoCount).toBe(initialMeasuresCount);

    // 5. Cliquer sur '×' de la première mesure (dialogue custom confirmAsync)
    await deleteButtons.first().click();
    await page.waitForTimeout(300);

    // La modal custom de confirmation doit être affichée
    const confirmBtn = page.locator('button:has-text("OK"), button:has-text("Valider")').last();
    await expect(confirmBtn).toBeVisible({ timeout: 3000 });
    await confirmBtn.click();
    await page.waitForTimeout(300);

    const afterDeleteCount = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState()?.totalMeasures || 0;
    });
    expect(afterDeleteCount).toBe(initialMeasuresCount - 1);

    // 6. Annuler la suppression avec Ctrl+Z
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    const restoredCount = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState()?.totalMeasures || 0;
    });
    expect(restoredCount).toBe(initialMeasuresCount);
  });

  test("Vue dézoomée (MEASURE_W < 70px) : overlay au survol et navigation seek préservée", async ({ page }) => {
    // 1. Dézoomer la Timeline pour atteindre le plancher minimal (60px)
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => {
        const container = document.querySelector('.timeline-sequencer-container') as HTMLElement;
        const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
        const rect = scrollEl ? scrollEl.getBoundingClientRect() : { left: 0, top: 0 };
        const event = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: 120,
          clientX: rect.left + 300,
          clientY: rect.top + 100,
        });
        container?.dispatchEvent(event);
      });
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(300);

    // 2. Vérifier que la colonne de mesure de la règle possède bien l'overlay masqué par défaut
    const firstMeasureRulerCol = page.locator('.group.flex.flex-col').first();
    await expect(firstMeasureRulerCol).toBeVisible();

    const structureControlsOverlay = firstMeasureRulerCol.locator('.pointer-events-none');
    await expect(structureControlsOverlay).toHaveCount(1);

    // Vérifier les classes de survol de l'overlay
    const overlayClass = await structureControlsOverlay.getAttribute('class');
    expect(overlayClass).toContain('group-hover:flex');
    expect(overlayClass).toContain('pointer-events-none');

    // 3. Survoler la colonne de mesure : les boutons deviennent visibles
    await firstMeasureRulerCol.hover();
    await page.waitForTimeout(200);

    const insertBtn = structureControlsOverlay.locator('button:text-is("+")');
    const deleteBtn = structureControlsOverlay.locator('button:text-is("×")');
    await expect(insertBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();

    // 4. Clic sur la colonne de règle en dehors des boutons : seek sans altération du nombre de mesures
    const measuresBeforeClick = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState()?.totalMeasures || 0;
    });

    // Clic sur le bas de la règle (repères de temps)
    const beatsRow = firstMeasureRulerCol.locator('.flex.w-full.opacity-50');
    await beatsRow.click();
    await page.waitForTimeout(200);

    const measuresAfterClick = await page.evaluate(() => {
      return (window as any).__SEQUENCER_STORE__?.getState()?.totalMeasures || 0;
    });
    expect(measuresAfterClick).toBe(measuresBeforeClick);
  });
});
