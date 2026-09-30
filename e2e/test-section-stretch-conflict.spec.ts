import { test, expect } from '@playwright/test';

test.describe("Étirement de section sur la Timeline avec détection de collision (Insérer vs Écraser)", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Charger l'application en vue Timeline
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1500);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Attendre que le store et les pistes soient prêts
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    // Attendre la stabilisation
    await page.waitForTimeout(1500);
  });

  test("1. Étirer une section de 4 mesures sur une zone vide -> extension directe sans modal", async ({ page }) => {
    // Configuration : Trouver une piste réelle avec patterns (ex: Caixa, Alfaia)
    const targetTrackIdx = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.setTotalMeasures(16);

      const trackIdx = store.tracks.findIndex(
        (t: any) => t.patterns && t.patterns.length > 0 && !t.isBusFolder && !t.isLinkFolder
      );
      const chosenIdx = trackIdx !== -1 ? trackIdx : 0;

      const newTracks = store.tracks.map((t: any, idx: number) => {
        if (idx === chosenIdx) {
          const firstPat = t.patterns[0] || {
            id: 101,
            name: 'P1',
            steps: 16,
            activeSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            measureAssignments: Array(16).fill(false)
          };
          const p1 = {
            ...firstPat,
            activeSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i < 4) // M1-M4 (0..3)
          };
          return {
            ...t,
            patterns: [p1, ...t.patterns.slice(1).map((p: any) => ({ ...p, measureAssignments: Array(16).fill(false) }))]
          };
        }
        return {
          ...t,
          patterns: t.patterns.map((p: any) => ({
            ...p,
            measureAssignments: Array(16).fill(false)
          }))
        };
      });
      store.setTracks(newTracks);

      store.setSongSections([
        { id: 'sec-a', name: 'Intro', startMeasure: 0, endMeasure: 3, color: '#f19066', repeatCount: 1, level: 0 }
      ]);

      return chosenIdx;
    });

    await page.waitForTimeout(500);

    // Récupérer la largeur de mesure
    const measureW = await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container');
      return container ? parseFloat(getComputedStyle(container).getPropertyValue('--measure-width')) || 160 : 160;
    });

    // Poignée droite de redimensionnement de Section A
    const handle = page.locator('[data-testid="section-resize-right-sec-a"]');
    await expect(handle).toBeVisible();

    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Glisser de 4 mesures vers la droite (bloc de 4 mesures)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 4 * measureW + 10, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Vérifier : AUCUN modal n'apparaît sur une zone vierge
    const modal = page.locator('[data-testid="section-stretch-conflict-modal"]');
    await expect(modal).not.toBeVisible();

    // Vérifier l'état dans le store : Section A couvre désormais M1-M8 (0..7)
    const state = await page.evaluate((chosenIdx) => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      const secA = s.songSections.find((sec: any) => sec.id === 'sec-a');
      const p0 = s.tracks[chosenIdx]?.patterns[0];
      return {
        secA,
        p0Assignments: p0?.measureAssignments?.slice(0, 8)
      };
    }, targetTrackIdx);

    expect(state.secA.startMeasure).toBe(0);
    expect(state.secA.endMeasure).toBe(7);
    // Motifs dupliqués sur M5-M8
    expect(state.p0Assignments).toEqual([true, true, true, true, true, true, true, true]);
  });

  test("2. Conflit d'étirement : Détection de collision et arbitrage « Écraser » + Undo Ctrl+Z", async ({ page }) => {
    // Configuration : Section A (0..3) sur M1-M4 et Section B (4..7) sur M5-M8 avec motifs distincts
    const targetTrackIdx = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.setTotalMeasures(16);

      const trackIdx = store.tracks.findIndex(
        (t: any) => t.patterns && t.patterns.length > 0 && !t.isBusFolder && !t.isLinkFolder
      );
      const chosenIdx = trackIdx !== -1 ? trackIdx : 0;

      const newTracks = store.tracks.map((t: any, idx: number) => {
        if (idx === chosenIdx) {
          const p1 = {
            id: 101,
            name: 'P1',
            steps: 16,
            activeSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i < 4) // M1-M4 (0..3)
          };
          const p2 = {
            id: 102,
            name: 'P2',
            steps: 16,
            activeSteps: [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i >= 4 && i < 8) // M5-M8 (4..7)
          };
          return {
            ...t,
            patterns: [p1, p2]
          };
        }
        return {
          ...t,
          patterns: t.patterns.map((p: any) => ({
            ...p,
            measureAssignments: Array(16).fill(false)
          }))
        };
      });
      store.setTracks(newTracks);

      store.setSongSections([
        { id: 'sec-a', name: 'Intro', startMeasure: 0, endMeasure: 3, color: '#f19066', repeatCount: 1, level: 0 },
        { id: 'sec-b', name: 'Refrain', startMeasure: 4, endMeasure: 7, color: '#27ae60', repeatCount: 1, level: 0 }
      ]);

      return chosenIdx;
    });

    await page.waitForTimeout(500);

    const measureW = await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container');
      return container ? parseFloat(getComputedStyle(container).getPropertyValue('--measure-width')) || 160 : 160;
    });

    const handle = page.locator('[data-testid="section-resize-right-sec-a"]');
    await expect(handle).toBeVisible();

    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Glisser de 4 mesures vers la droite pour empiéter sur Section B (M5-M8)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 4 * measureW + 10, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Vérifier l'apparition du modal Cordel
    const modal = page.locator('[data-testid="section-stretch-conflict-modal"]');
    await expect(modal).toBeVisible();

    // Cliquer sur « Écraser »
    const overwriteBtn = page.locator('[data-testid="section-conflict-overwrite-btn"]');
    await overwriteBtn.click();
    await page.waitForTimeout(400);

    // Vérifier que le modal s'est fermé
    await expect(modal).not.toBeVisible();

    // Vérifier l'état post-écrasement
    let state = await page.evaluate((chosenIdx) => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      const secA = s.songSections.find((sec: any) => sec.id === 'sec-a');
      const secB = s.songSections.find((sec: any) => sec.id === 'sec-b');
      const p0 = s.tracks[chosenIdx]?.patterns[0];
      const p1 = s.tracks[chosenIdx]?.patterns[1];
      return {
        secA,
        secB,
        p0Assignments: p0?.measureAssignments?.slice(0, 8),
        p1Assignments: p1?.measureAssignments?.slice(0, 8)
      };
    }, targetTrackIdx);

    // Section A couvre M1-M8 (0..7)
    expect(state.secA.endMeasure).toBe(7);
    // Section B complètement recouverte a été supprimée
    expect(state.secB).toBeUndefined();
    // Pattern 0 (Intro) est assigné sur M1-M8
    expect(state.p0Assignments).toEqual([true, true, true, true, true, true, true, true]);
    // Pattern 1 (Refrain) a été écrasé sur M5-M8
    expect(state.p1Assignments).toEqual([false, false, false, false, false, false, false, false]);

    // Raccourci Ctrl+Z pour annuler
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(400);

    // Vérifier la restauration complète
    state = await page.evaluate((chosenIdx) => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      const secA = s.songSections.find((sec: any) => sec.id === 'sec-a');
      const secB = s.songSections.find((sec: any) => sec.id === 'sec-b');
      const p0 = s.tracks[chosenIdx]?.patterns[0];
      const p1 = s.tracks[chosenIdx]?.patterns[1];
      return {
        secA,
        secB,
        p0Assignments: p0?.measureAssignments?.slice(0, 8),
        p1Assignments: p1?.measureAssignments?.slice(0, 8)
      };
    }, targetTrackIdx);

    expect(state.secA.endMeasure).toBe(3);
    expect(state.secB).toBeDefined();
    expect(state.secB.startMeasure).toBe(4);
    expect(state.secB.endMeasure).toBe(7);
    expect(state.p0Assignments).toEqual([true, true, true, true, false, false, false, false]);
    expect(state.p1Assignments).toEqual([false, false, false, false, true, true, true, true]);
  });

  test("3. Conflit d'étirement : Détection de collision et arbitrage « Insérer » (Ripple Edit) + Undo Ctrl+Z", async ({ page }) => {
    // Configuration : Section A (0..3), Section B (4..7), repère sur M5 (index 4)
    const targetTrackIdx = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.setTotalMeasures(16);

      const trackIdx = store.tracks.findIndex(
        (t: any) => t.patterns && t.patterns.length > 0 && !t.isBusFolder && !t.isLinkFolder
      );
      const chosenIdx = trackIdx !== -1 ? trackIdx : 0;

      const newTracks = store.tracks.map((t: any, idx: number) => {
        if (idx === chosenIdx) {
          const p1 = {
            id: 101,
            name: 'P1',
            steps: 16,
            activeSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i < 4) // M1-M4 (0..3)
          };
          const p2 = {
            id: 102,
            name: 'P2',
            steps: 16,
            activeSteps: [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i >= 4 && i < 8) // M5-M8 (4..7)
          };
          return {
            ...t,
            patterns: [p1, p2]
          };
        }
        return {
          ...t,
          patterns: t.patterns.map((p: any) => ({
            ...p,
            measureAssignments: Array(16).fill(false)
          }))
        };
      });
      store.setTracks(newTracks);

      store.setSongSections([
        { id: 'sec-a', name: 'Intro', startMeasure: 0, endMeasure: 3, color: '#f19066', repeatCount: 1, level: 0 },
        { id: 'sec-b', name: 'Refrain', startMeasure: 4, endMeasure: 7, color: '#27ae60', repeatCount: 1, level: 0 }
      ]);

      store.setSongMarkers([
        { id: 'marker-1', name: 'Pont', measure: 4, color: '#f19066' }
      ]);

      return chosenIdx;
    });

    await page.waitForTimeout(500);

    const measureW = await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container');
      return container ? parseFloat(getComputedStyle(container).getPropertyValue('--measure-width')) || 160 : 160;
    });

    const handle = page.locator('[data-testid="section-resize-right-sec-a"]');
    await expect(handle).toBeVisible();

    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Glisser de 4 mesures vers la droite
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 4 * measureW + 10, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Modal visible
    const modal = page.locator('[data-testid="section-stretch-conflict-modal"]');
    await expect(modal).toBeVisible();

    // Cliquer sur « Insérer (Décaler la suite) »
    const insertBtn = page.locator('[data-testid="section-conflict-insert-btn"]');
    await insertBtn.click();
    await page.waitForTimeout(400);

    await expect(modal).not.toBeVisible();

    // Vérifier l'insertion physique et le décalage
    let state = await page.evaluate((chosenIdx) => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      const secA = s.songSections.find((sec: any) => sec.id === 'sec-a');
      const secB = s.songSections.find((sec: any) => sec.id === 'sec-b');
      const marker1 = s.songMarkers.find((m: any) => m.id === 'marker-1');
      const p0 = s.tracks[chosenIdx]?.patterns[0];
      const p1 = s.tracks[chosenIdx]?.patterns[1];
      return {
        totalMeasures: s.totalMeasures,
        secA,
        secB,
        marker1,
        p0Assignments: p0?.measureAssignments?.slice(0, 12),
        p1Assignments: p1?.measureAssignments?.slice(0, 12)
      };
    }, targetTrackIdx);

    // 4 mesures insérées physiquement : totalMeasures passe de 16 à 20
    expect(state.totalMeasures).toBe(20);
    // Section A couvre désormais M1-M8 (0..7)
    expect(state.secA.startMeasure).toBe(0);
    expect(state.secA.endMeasure).toBe(7);
    // Section B repoussée sur M9-M12 (8..11) avec ses motifs intacts !
    expect(state.secB.startMeasure).toBe(8);
    expect(state.secB.endMeasure).toBe(11);
    // Repère décalé de 4 mesures (passé de l'index 4 à l'index 8)
    expect(state.marker1.measure).toBe(8);

    // Pattern 0 (Intro) dupliqué sur M1-M8
    expect(state.p0Assignments?.slice(0, 8)).toEqual([true, true, true, true, true, true, true, true]);
    // Pattern 1 (Refrain) décalé intact sur M9-M12 (indices 8..11)
    expect(state.p1Assignments?.slice(8, 12)).toEqual([true, true, true, true]);

    // Raccourci Ctrl+Z pour annuler
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(400);

    // Vérifier la restauration complète
    state = await page.evaluate(() => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      const secA = s.songSections.find((sec: any) => sec.id === 'sec-a');
      const secB = s.songSections.find((sec: any) => sec.id === 'sec-b');
      const marker1 = s.songMarkers.find((m: any) => m.id === 'marker-1');
      return {
        totalMeasures: s.totalMeasures,
        secA,
        secB,
        marker1
      };
    });

    expect(state.totalMeasures).toBe(16);
    expect(state.secA.endMeasure).toBe(3);
    expect(state.secB.startMeasure).toBe(4);
    expect(state.secB.endMeasure).toBe(7);
    expect(state.marker1.measure).toBe(4);
  });

  test("4. Conflit d'étirement : Annulation via la touche Échap", async ({ page }) => {
    // Configuration : Section A (0..3) et Section B (4..7)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.setTotalMeasures(16);

      const trackIdx = store.tracks.findIndex(
        (t: any) => t.patterns && t.patterns.length > 0 && !t.isBusFolder && !t.isLinkFolder
      );
      const chosenIdx = trackIdx !== -1 ? trackIdx : 0;

      const newTracks = store.tracks.map((t: any, idx: number) => {
        if (idx === chosenIdx) {
          const p1 = {
            id: 101,
            name: 'P1',
            steps: 16,
            activeSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i < 4) // M1-M4 (0..3)
          };
          const p2 = {
            id: 102,
            name: 'P2',
            steps: 16,
            activeSteps: [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i >= 4 && i < 8) // M5-M8 (4..7)
          };
          return {
            ...t,
            patterns: [p1, p2]
          };
        }
        return {
          ...t,
          patterns: t.patterns.map((p: any) => ({
            ...p,
            measureAssignments: Array(16).fill(false)
          }))
        };
      });
      store.setTracks(newTracks);

      store.setSongSections([
        { id: 'sec-a', name: 'Intro', startMeasure: 0, endMeasure: 3, color: '#f19066', repeatCount: 1, level: 0 },
        { id: 'sec-b', name: 'Refrain', startMeasure: 4, endMeasure: 7, color: '#27ae60', repeatCount: 1, level: 0 }
      ]);
    });
    await page.waitForTimeout(500);

    const measureW = await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container');
      return container ? parseFloat(getComputedStyle(container).getPropertyValue('--measure-width')) || 160 : 160;
    });

    const handle = page.locator('[data-testid="section-resize-right-sec-a"]');
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Glisser de 4 mesures vers la droite
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 4 * measureW + 10, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const modal = page.locator('[data-testid="section-stretch-conflict-modal"]');
    await expect(modal).toBeVisible();

    // Appuyer sur Échap
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await expect(modal).not.toBeVisible();

    // Vérifier que la structure est strictement inchangée
    const state = await page.evaluate(() => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      const secA = s.songSections.find((sec: any) => sec.id === 'sec-a');
      const secB = s.songSections.find((sec: any) => sec.id === 'sec-b');
      return { secA, secB };
    });

    expect(state.secA.startMeasure).toBe(0);
    expect(state.secA.endMeasure).toBe(3);
    expect(state.secB.startMeasure).toBe(4);
    expect(state.secB.endMeasure).toBe(7);
  });

  test("5. Conflit d'étirement : Annulation via le bouton Annuler du modal Cordel", async ({ page }) => {
    // Configuration : Section A (0..3) et Section B (4..7)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.setTotalMeasures(16);

      const trackIdx = store.tracks.findIndex(
        (t: any) => t.patterns && t.patterns.length > 0 && !t.isBusFolder && !t.isLinkFolder
      );
      const chosenIdx = trackIdx !== -1 ? trackIdx : 0;

      const newTracks = store.tracks.map((t: any, idx: number) => {
        if (idx === chosenIdx) {
          const p1 = {
            id: 101,
            name: 'P1',
            steps: 16,
            activeSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i < 4) // M1-M4 (0..3)
          };
          const p2 = {
            id: 102,
            name: 'P2',
            steps: 16,
            activeSteps: [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            measureAssignments: Array(16).fill(false).map((_, i) => i >= 4 && i < 8) // M5-M8 (4..7)
          };
          return {
            ...t,
            patterns: [p1, p2]
          };
        }
        return {
          ...t,
          patterns: t.patterns.map((p: any) => ({
            ...p,
            measureAssignments: Array(16).fill(false)
          }))
        };
      });
      store.setTracks(newTracks);

      store.setSongSections([
        { id: 'sec-a', name: 'Intro', startMeasure: 0, endMeasure: 3, color: '#f19066', repeatCount: 1, level: 0 },
        { id: 'sec-b', name: 'Refrain', startMeasure: 4, endMeasure: 7, color: '#27ae60', repeatCount: 1, level: 0 }
      ]);
    });
    await page.waitForTimeout(500);

    const measureW = await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container');
      return container ? parseFloat(getComputedStyle(container).getPropertyValue('--measure-width')) || 160 : 160;
    });

    const handle = page.locator('[data-testid="section-resize-right-sec-a"]');
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Glisser de 4 mesures vers la droite
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 4 * measureW + 10, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const modal = page.locator('[data-testid="section-stretch-conflict-modal"]');
    await expect(modal).toBeVisible();

    // Cliquer sur le bouton Annuler
    const cancelBtn = page.locator('[data-testid="section-conflict-cancel-btn"]');
    await cancelBtn.click();
    await page.waitForTimeout(300);

    await expect(modal).not.toBeVisible();

    // Vérifier que la structure est strictement inchangée
    const state = await page.evaluate(() => {
      const s = (window as any).__SEQUENCER_STORE__.getState();
      const secA = s.songSections.find((sec: any) => sec.id === 'sec-a');
      const secB = s.songSections.find((sec: any) => sec.id === 'sec-b');
      return { secA, secB };
    });

    expect(state.secA.startMeasure).toBe(0);
    expect(state.secA.endMeasure).toBe(3);
    expect(state.secB.startMeasure).toBe(4);
    expect(state.secB.endMeasure).toBe(7);
  });
});
