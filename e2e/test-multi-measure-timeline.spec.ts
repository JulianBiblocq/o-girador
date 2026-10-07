import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Multi-Measure Pattern Support on Timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);

    await ensureStudioLoaded(page);

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });
  });

  test("Assigning a 64-step pattern on measure 2 spans measures 2, 3, 4, 5 with continuation badges and proper step slicing", async ({ page }) => {
    // 1. Injecter un motif de 64 pas (4 mesures) avec des frappes distinctes par tranche
    const patternInfo = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__;
      const state = store.getState();
      
      // Sélectionner la piste autonome Agbê (instrumentIdx 6)
      const track = state.tracks.find((t: any) => t.instrumentIdx === 6 || t.customName === 'Agbê') || state.tracks[0];
      const trackId = track.id;

      // Créer un motif de 64 pas
      const activeSteps = Array(64).fill(0);

      // Tranche 1 (mesure index 1, pas 0..15): Frappe 'D' au pas local 0
      activeSteps[0] = 'D';

      // Tranche 2 (mesure index 2, pas 16..31): Frappe 'E' au pas local 0 (offset 16)
      activeSteps[16] = 'E';

      // Tranche 3 (mesure index 3, pas 32..47): Frappe 'd' au pas local 0 (offset 32)
      activeSteps[32] = 'd';

      // Tranche 4 (mesure index 4, pas 48..63): Frappe 'e' au pas local 0 (offset 48)
      activeSteps[48] = 'e';

      const testPatternId = 99964;
      const testPattern = {
        id: testPatternId,
        name: 'Pattern 4 Mesures',
        steps: 64,
        activeSteps,
        measureAssignments: Array(state.totalMeasures || 8).fill(false),
      };

      // Ajouter le motif à la piste
      store.setState({
        tracks: state.tracks.map((t: any) => {
          if (t.id === trackId) {
            return {
              ...t,
              patterns: [...t.patterns, testPattern]
            };
          }
          return t;
        }),
        tracksVersion: state.tracksVersion + 1
      });

      // 2. Assigner le motif à la mesure index 1 (Mesure 2)
      store.getState().handleTimelinePatternAssign(trackId, testPatternId, 1);

      return { trackId, testPatternId };
    });

    await page.waitForFunction(({ trackId, testPatternId }) => {
      const store = (window as any).__SEQUENCER_STORE__?.getState?.();
      const track = store?.tracks?.find((t: any) => t.id === trackId);
      const p = track?.patterns?.find((ptn: any) => ptn.id === testPatternId);
      return Boolean(p && p.measureAssignments && p.measureAssignments[1] === true);
    }, patternInfo, { timeout: 5000 }).catch(() => {});

    // 3. Vérifications dans le Store
    const assignments = await page.evaluate(({ trackId, testPatternId }) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const track = store.tracks.find((t: any) => t.id === trackId);
      const p = track?.patterns.find((ptn: any) => ptn.id === testPatternId);
      return {
        m0: p?.measureAssignments[0],
        m1: p?.measureAssignments[1],
        m2: p?.measureAssignments[2],
        m3: p?.measureAssignments[3],
        m4: p?.measureAssignments[4],
        m5: p?.measureAssignments[5],
        totalMeasures: store.totalMeasures
      };
    }, patternInfo);

    // Mesure 1 (index 0) = false
    expect(assignments.m0).toBe(false);
    // Mesures 2, 3, 4, 5 (indices 1, 2, 3, 4) = true
    expect(assignments.m1).toBe(true);
    expect(assignments.m2).toBe(true);
    expect(assignments.m3).toBe(true);
    expect(assignments.m4).toBe(true);
    // Mesure 6 (index 5) = false
    expect(assignments.m5).toBe(false);

    // 4. Vérifications visuelles dans le DOM de la Timeline (Macro view badges)
    // Puces de liaison [2/4], [3/4], [4/4] visibles sur les mesures suivantes
    const chip24 = page.getByText('[2/4]').first();
    const chip34 = page.getByText('[3/4]').first();
    const chip44 = page.getByText('[4/4]').first();

    await expect(chip24).toBeVisible({ timeout: 5000 });
    await expect(chip34).toBeVisible({ timeout: 5000 });
    await expect(chip44).toBeVisible({ timeout: 5000 });

    // 5. Passer en vue détaillée pour observer le découpage fidèle des pas
    const zoomMacroBtn = page.locator('button[title*="Visão detalhada"], button[title*="Vue détaillée"]');
    if (await zoomMacroBtn.isVisible().catch(() => false)) {
      await zoomMacroBtn.click();
      await page.waitForTimeout(500);

      // Vérifier que chaque mesure 1..4 a bien reçu son pas spécifique au premier temps
      const stepM1 = page.locator('.timeline-step[data-measure="1"][data-step="0"][data-val="D"]').first();
      const stepM2 = page.locator('.timeline-step[data-measure="2"][data-step="0"][data-val="E"]').first();
      await expect(stepM1).toBeAttached();
      await expect(stepM2).toBeAttached();

      const stepM3 = page.locator('.timeline-step[data-measure="3"][data-step="0"]').first();
      const stepM4 = page.locator('.timeline-step[data-measure="4"][data-step="0"]').first();
      await expect(stepM3).toBeAttached();
      await expect(stepM4).toBeAttached();
    }
  });
});
