import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe('Grille 16 pas continue et Barre de motif InstrumentDetailEditor', () => {
  test('La grille de 16 pas de percussion affiche une seule ligne continue de 4 temps (grid-cols-4)', async ({ page }) => {
    await page.goto('/');
    await ensureStudioLoaded(page);

    // Attendre que les pistes du store soient hydratées
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState() || (window as any).useSequencerStore?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 15000 });

    // S'assurer de sélectionner une piste de percussion (ex: première piste percussion)
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__ || (window as any).useSequencerStore;
      const tracks = store.getState().tracks;
      const percTrack = tracks.find((t: any) => t.instrumentRoleKey !== 'puxador' && t.instrumentRoleKey !== 'coro' && t.instrumentRoleKey !== 'toada');
      if (percTrack) {
        store.getState().setEditingTrackId(percTrack.id);
      }
    });

    // Ouvrir l'éditeur en cliquant sur la piste Marcante
    const marcanteBtn = page.locator('text=/marcante/i').first();
    await expect(marcanteBtn).toBeVisible({ timeout: 10000 });
    await marcanteBtn.click();

    // Attendre que la grille de pas soit visible
    const stepBoxes = page.locator('.step-boxes').first();
    await expect(stepBoxes).toBeVisible({ timeout: 10000 });

    // Vérifier les propriétés de disposition CSS Grid
    const layout = await stepBoxes.evaluate(el => {
      const cs = window.getComputedStyle(el);
      const parentEl = el.parentElement;
      const parentWidth = parentEl ? parentEl.getBoundingClientRect().width : 0;
      const elRect = el.getBoundingClientRect();
      const children = Array.from(el.children);
      const rects = children.map((c, i) => {
        const r = c.getBoundingClientRect();
        return {
          beat: i + 1,
          top: Math.round(r.top),
          left: Math.round(r.left),
          width: Math.round(r.width),
          height: Math.round(r.height)
        };
      });
      return {
        display: cs.display,
        classList: Array.from(el.classList),
        gridTemplateColumns: cs.gridTemplateColumns,
        childCount: children.length,
        rects,
        width: Math.round(elRect.width),
        parentWidth: Math.round(parentWidth)
      };
    });

    console.log('Layout de la grille de pas 16 pas :', layout);

    expect(layout.display).toBe('grid');
    // Vérifier l'absence de classe grid-cols-2 et la présence de 4 colonnes
    expect(layout.classList).not.toContain('grid-cols-2');
    const columns = layout.gridTemplateColumns.trim().split(/\s+/);
    expect(columns.length).toBe(4);

    // Si on a 4 temps (16 pas en 4/4) :
    // Tous les 4 blocs de temps doivent être alignés horizontalement sur la même ligne (même `top`)
    if (layout.childCount >= 4) {
      const beat1Top = layout.rects[0].top;
      // Les 4 temps sur la même ligne horizontale (tolérance 3px)
      expect(Math.abs(layout.rects[0].top - beat1Top)).toBeLessThanOrEqual(3);
      expect(Math.abs(layout.rects[1].top - beat1Top)).toBeLessThanOrEqual(3);
      expect(Math.abs(layout.rects[2].top - beat1Top)).toBeLessThanOrEqual(3);
      expect(Math.abs(layout.rects[3].top - beat1Top)).toBeLessThanOrEqual(3);

      // Les 4 temps ordonnés de gauche à droite
      expect(layout.rects[0].left).toBeLessThan(layout.rects[1].left);
      expect(layout.rects[1].left).toBeLessThan(layout.rects[2].left);
      expect(layout.rects[2].left).toBeLessThan(layout.rects[3].left);
    }

    // Vérifier l'occupation pleine largeur de la grille par rapport au conteneur parent (ratio >= 90%)
    if (layout.parentWidth > 0) {
      const widthRatio = layout.width / layout.parentWidth;
      expect(widthRatio).toBeGreaterThanOrEqual(0.9);
    }

    // Vérifier le bouton de suppression de motif dans le header
    const deleteBtn = page.locator('button:has-text("Suppr."), button:has-text("Excluir")').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      const btnStyles = await deleteBtn.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          flexShrink: cs.flexShrink,
          whiteSpace: cs.whiteSpace
        };
      });
      console.log('Styles du bouton Suppr. :', btnStyles);
      expect(btnStyles.flexShrink).toBe('0');
      expect(btnStyles.whiteSpace).toBe('nowrap');
    }

    // Capture d'écran de l'éditeur de motif
    await page.screenshot({ path: 'e2e/screenshots/pattern-grid-16-continuous.png', fullPage: false });
  });
});

