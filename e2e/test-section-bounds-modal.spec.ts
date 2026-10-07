import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Song Section Bounds, Duration & Quick Shortcuts Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?view=timeline');
    await page.waitForTimeout(1000);

    await ensureStudioLoaded(page);

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      if (store) {
        store.hasFullPlaybackAccess = true;
        store.maxMeasuresAllowed = null;
      }
    });
  });

  test("Création de section au clic '+' sur slot vide : 4 mesures par défaut, boutons [ 8 mes. ], édition manuelle et enregistrement", async ({ page }) => {
    // 1. Étendre à 48 mesures pour avoir des slots vierges garantis sans section existante au-dessus
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      if (store) {
        store.setTotalMeasures(48, true);
      }
    });
    await page.waitForTimeout(300);

    // Faire défiler le conteneur horizontal vers la droite pour visualiser la mesure 41
    await page.evaluate(() => {
      const scrollEl = document.getElementById('timeline-scroll-container');
      if (scrollEl) {
        scrollEl.scrollLeft = scrollEl.scrollWidth;
      }
    });
    await page.waitForTimeout(300);

    // Cliquer sur le bouton ＋ de la mesure 41 (index 40)
    const plusButtons = page.locator('button:text-is("＋")');
    const plusBtn41 = plusButtons.nth(40);
    await plusBtn41.scrollIntoViewIfNeeded();
    await plusBtn41.click({ force: true });
    await page.waitForTimeout(300);

    // 2. Vérifier que la modale/popover s'ouvre avec 4 mesures par défaut (M. 41 à 44)
    const titleRegex = /NOUVELLE SECTION \(M\. 41 - 44\)|NOVA SEÇÃO \(C\. 41 - 44\)/i;
    await expect(page.locator(`text=${titleRegex}`)).toBeVisible({ timeout: 4000 });

    const startInput = page.locator('input[type="number"]').first();
    const endInput = page.locator('input[type="number"]').nth(1);
    await expect(startInput).toHaveValue("41");
    await expect(endInput).toHaveValue("44");

    // Vérifier la durée (4 mesures)
    await expect(page.locator('text=/Durée : 4 mesure|Duração: 4 compasso/i')).toBeVisible();

    // 3. Cliquer sur le raccourci rapide [ 8 mes. ]
    const btn8Mes = page.locator('button:text-is("[ 8 mes. ]")').first();
    await btn8Mes.click();
    await page.waitForTimeout(200);

    // La fin doit passer à 48 (41 + 7) et la durée à 8
    await expect(endInput).toHaveValue("48");
    await expect(page.locator('text=/Durée : 8 mesure|Duração: 8 compasso/i')).toBeVisible();

    // 4. Modifier manuellement la fin à 45
    await endInput.fill("45");
    await page.waitForTimeout(200);

    // La durée doit passer à 5 mesures (45 - 41 + 1)
    await expect(page.locator('text=/Durée : 5 mesure|Duração: 5 compasso/i')).toBeVisible();
    await expect(page.locator('text=/NOUVELLE SECTION \\(M\\. 41 - 45\\)|NOVA SEÇÃO \\(C\\. 41 - 45\\)/i')).toBeVisible();

    // 5. Cliquer sur "Créer la section"
    const submitBtn = page.locator('button:has-text("Créer la section"), button:has-text("Criar seção")').first();
    await submitBtn.click();
    await page.waitForTimeout(400);

    // Vérifier dans le store que la section créée a bien startMeasure: 40 et endMeasure: 44 (base 0)
    const created = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      const sections = store?.songSections || [];
      return sections[sections.length - 1] || null;
    });
    expect(created).not.toBeNull();
    expect(created.startMeasure).toBe(40);
    expect(created.endMeasure).toBe(44);

    // 6. Annuler avec Ctrl+Z
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(400);

    const existsAfterUndo = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return (store?.songSections || []).some((s: any) => s.startMeasure === 40 && s.endMeasure === 44);
    });
    expect(existsAfterUndo).toBe(false);
  });

  test("Modale centrale (SongSectionModal) : mode édition au double-clic sur la section existante Trovão", async ({ page }) => {
    // 1. S'assurer qu'une section 'Trovão' est présente dans le store
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      if (!store) return;
      const hasTrovao = (store.songSections || []).some((s: any) => s.name.toLowerCase().includes("trovão"));
      if (!hasTrovao) {
        store.setSongSections([
          ...(store.songSections || []),
          { id: 'section-trovao', name: 'Trovão', startMeasure: 0, endMeasure: 3, color: '#e67e22' }
        ]);
      }
    });
    await page.waitForTimeout(300);

    // Localiser la première section existante 'Trovão'
    const sectionTrovão = page.locator('div[data-testid^="section-block-"]:has-text("Trovão"), div[data-testid^="section-block-"]:has-text("TROVÃO")').first();
    await expect(sectionTrovão).toBeVisible({ timeout: 5000 });

    // Récupérer ses bornes initiales
    const initialBounds = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      const s = (store?.songSections || []).find((sec: any) => sec.name.toLowerCase().includes("trovão"));
      return s ? { id: s.id, start: s.startMeasure + 1, end: s.endMeasure + 1 } : null;
    });
    expect(initialBounds).not.toBeNull();

    // 2. Double-cliquer sur le texte de la section pour ouvrir la modale d'édition
    await sectionTrovão.dblclick({ force: true });
    await page.waitForTimeout(300);

    // 3. Vérifier que la modale d'édition s'ouvre avec le titre MODIFIER LA SECTION
    const editModalTitle = page.locator('text=/MODIFIER LA SECTION|EDITAR SEÇÃO/i').first();
    await expect(editModalTitle).toBeVisible({ timeout: 4000 });

    const saveBtn = page.locator('button:has-text("Enregistrer les modifications"), button:has-text("Salvar alterações")').first();
    await expect(saveBtn).toBeVisible();

    // 4. Cliquer sur [ 4 mes. ]
    const btn4Mes = page.locator('button:text-is("[ 4 mes. ]")').last();
    await btn4Mes.click();
    await page.waitForTimeout(200);

    // Vérifier que la fin est calée sur startM + 3
    const expectedEnd = initialBounds!.start + 3;
    const endInput = page.locator('input[type="number"]').nth(1);
    await expect(endInput).toHaveValue(String(expectedEnd));

    // 5. Valider la modification
    await saveBtn.click();
    await page.waitForTimeout(400);

    // Vérifier la mise à jour dans le store
    const updated = await page.evaluate((secId) => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return (store?.songSections || []).find((s: any) => s.id === secId || String(s.id) === String(secId));
    }, initialBounds!.id);

    expect(updated.endMeasure).toBe(expectedEnd - 1);

    // 6. Annuler avec Ctrl+Z et vérifier le rétablissement
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(400);

    const restored = await page.evaluate((secId) => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return (store?.songSections || []).find((s: any) => s.id === secId || String(s.id) === String(secId));
    }, initialBounds!.id);

    expect(restored.endMeasure).toBe(initialBounds!.end - 1);
  });
});
