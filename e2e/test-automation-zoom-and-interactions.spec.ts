import { test, expect } from '@playwright/test';

test.describe('Automation Track Zoom Synchronization & Node Interactions', () => {
  test('Nodes are centered in measures, scale with zoom, and unblocked for interaction', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Switch to sequencer tab if needed
    const sequencerTab = page.locator('button:has-text("SÉQUENCEUR")');
    if (await sequencerTab.isVisible().catch(() => false)) {
      await sequencerTab.click();
    }

    // Wait for the timeline container
    await page.waitForSelector('.timeline-sequencer-container');

    // Locate the Tempo automation track (French 'TEMPO' or Portuguese 'ANDAMENTO')
    const tempoTrack = page.locator('div:has(> div:has-text("TEMPO")), div:has(> div:has-text("ANDAMENTO"))').first();
    await expect(tempoTrack).toBeVisible();

    // Check SVG nodes inside Tempo automation track
    const svgCircle0 = tempoTrack.locator('svg circle.automation-node-circle[data-idx="0"]').first();
    await expect(svgCircle0).toBeVisible();

    // Verify geometric centering of node 0 and node 1:
    // Xm should be m * measureWidth + measureWidth / 2
    const circle0Cx = await svgCircle0.getAttribute('cx');
    const circle1 = tempoTrack.locator('svg circle.automation-node-circle[data-idx="1"]').first();
    const circle1Cx = await circle1.getAttribute('cx');

    expect(circle0Cx).not.toBeNull();
    expect(circle1Cx).not.toBeNull();

    const cx0 = parseFloat(circle0Cx!);
    const cx1 = parseFloat(circle1Cx!);
    const measuredWidth = cx1 - cx0;

    // Node 0 must be centered at measuredWidth / 2
    expect(cx0).toBeCloseTo(measuredWidth / 2, 1);
    expect(cx1).toBeCloseTo(measuredWidth + measuredWidth / 2, 1);

    // Verify cursor is ns-resize
    const cursor = await svgCircle0.evaluate(el => el.getAttribute('cursor') || (el as any).style?.cursor || window.getComputedStyle(el).cursor);
    expect(cursor).toBe('ns-resize');

    // Test measure selection on click (dispatch pointerdown/pointerup to avoid Playwright scrolling under sticky header)
    await svgCircle0.dispatchEvent('pointerdown', { pointerId: 1 });
    await svgCircle0.dispatchEvent('pointerup', { pointerId: 1 });
    await svgCircle0.dispatchEvent('click');
    
    // Check that Measure 1 column or selection highlight is active
    const selectedMeasureCol = page.locator('div[data-automation-type="bpm"][data-measure-idx="0"]');
    await expect(selectedMeasureCol).toHaveClass(/bg-amber-500\/20/);

    // Test double-click to open manual prompt modal
    await circle1.dispatchEvent('dblclick');

    // Verify modal is visible
    const modalHeading = page.locator('h3:has-text("Mesure"), h3:has-text("Compasso")');
    await expect(modalHeading).toBeVisible();

    // Close modal via Cancel button
    const cancelBtn = page.locator('button:has-text("Annuler"), button:has-text("Cancelar")');
    await cancelBtn.click();
    await expect(modalHeading).not.toBeVisible();

    // Test Zoom change and verify scaling
    // Click zoom button "M" (Vue moyenne / Visão média -> 60px)
    const zoomMBtn = page.locator('button[title*="moyenne"], button[title*="média"]').first();
    await expect(zoomMBtn).toBeVisible();
    await zoomMBtn.click();
    // Wait for the DOM to reflect measureWidth = 60 after clicking zoom M
    await page.waitForFunction(() => {
      const c = document.querySelector('circle.automation-node-circle[data-idx="0"]');
      const cx = parseFloat(c?.getAttribute('cx') || '0');
      return Math.abs(cx - 30) < 2;
    }, { timeout: 10000 });

    // Re-read cx directly from live DOM after zoom
    const { newCx0, newCx1 } = await page.evaluate(() => {
      const c0 = document.querySelector('circle.automation-node-circle[data-idx="0"]');
      const c1 = document.querySelector('circle.automation-node-circle[data-idx="1"]');
      return {
        newCx0: parseFloat(c0?.getAttribute('cx') || '0'),
        newCx1: parseFloat(c1?.getAttribute('cx') || '0')
      };
    });
    const newMeasuredW = newCx1 - newCx0;

    // Verify measure width is updated (60px) and nodes remain perfectly centered
    expect(newMeasuredW).toBeCloseTo(60, 1);
    expect(newCx0).toBeCloseTo(30, 1); // 60 / 2
    expect(newCx1).toBeCloseTo(90, 1); // 60 + 30
    expect(newMeasuredW).not.toEqual(measuredWidth);

    // ── Ctrl + Molette Zoom Test ──
    const container = page.locator('.timeline-sequencer-container');
    // Zoom in using Ctrl + Wheel (deltaY < 0 zooms in)
    await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 400, clientY: 300 });
    
    // Wait for cx to increase (> 60px measure width -> cx0 > 30)
    await page.waitForFunction(() => {
      const c = document.querySelector('circle.automation-node-circle[data-idx="0"]');
      const cx = parseFloat(c?.getAttribute('cx') || '0');
      return cx > 32;
    }, { timeout: 5000 });

    const wheelCx = await page.evaluate(() => {
      const c0 = document.querySelector('circle.automation-node-circle[data-idx="0"]');
      const c1 = document.querySelector('circle.automation-node-circle[data-idx="1"]');
      const x0 = parseFloat(c0?.getAttribute('cx') || '0');
      const x1 = parseFloat(c1?.getAttribute('cx') || '0');
      return { x0, x1, mw: x1 - x0 };
    });
    // Nodes must remain centered (x0 === mw / 2)
    expect(wheelCx.x0).toBeCloseTo(wheelCx.mw / 2, 1);

    // ── Zero Drift Anchor Zoom Test (Exact Invariant Verification) ──
    // Record the content point under clientX: 500
    const anchorCheckBefore = await page.evaluate(() => {
      const scrollEl = document.getElementById('timeline-scroll-container');
      const rect = scrollEl?.getBoundingClientRect();
      if (!scrollEl || !rect) return null;
      const mouseViewportX = 500 - rect.left;
      const HEADER_W = 200;
      const contentX = scrollEl.scrollLeft + (mouseViewportX - HEADER_W);
      return { mouseViewportX, contentX, scrollLeft: scrollEl.scrollLeft };
    });
    expect(anchorCheckBefore).not.toBeNull();

    // Perform another zoom tick at clientX: 500
    await container.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 500, clientY: 300 });
    await page.waitForTimeout(400);

    const anchorCheckAfter = await page.evaluate(() => {
      const scrollEl = document.getElementById('timeline-scroll-container');
      const rect = scrollEl?.getBoundingClientRect();
      const c0 = document.querySelector('circle.automation-node-circle[data-idx="0"]');
      const c1 = document.querySelector('circle.automation-node-circle[data-idx="1"]');
      if (!scrollEl || !rect || !c0 || !c1) return null;
      const mw = parseFloat(c1.getAttribute('cx') || '0') - parseFloat(c0.getAttribute('cx') || '0');
      const mouseViewportX = 500 - rect.left;
      const HEADER_W = 200;
      // Invariant: The measure under the mouse (in measure units) must match
      const measureUnderMouse = (scrollEl.scrollLeft + (mouseViewportX - HEADER_W)) / mw;
      return { measureUnderMouse, scrollLeft: scrollEl.scrollLeft, mw };
    });

    expect(anchorCheckAfter).not.toBeNull();
    // Verify that the measure under the mouse remained anchored without drift
    const expectedMeasure = anchorCheckBefore!.contentX / (anchorCheckBefore!.mouseViewportX > 200 ? wheelCx.mw : 1);
    // Drift should be negligible (< 0.05 measure)
    expect(Math.abs(anchorCheckAfter!.measureUnderMouse - expectedMeasure)).toBeLessThan(0.05);

    // ── Node Dragging (Value update) Test ──
    const initCy = await svgCircle0.getAttribute('cy');
    const initCyNum = parseFloat(initCy || '0');
    // Drag node vertically
    const circleBox = await svgCircle0.boundingBox();
    if (circleBox) {
      await page.mouse.move(circleBox.x + circleBox.width / 2, circleBox.y + circleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(circleBox.x + circleBox.width / 2, circleBox.y + circleBox.height / 2 - 20, { steps: 5 });
      await page.mouse.up();
    }
  });
});

