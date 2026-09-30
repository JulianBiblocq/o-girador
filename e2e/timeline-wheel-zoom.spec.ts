import { test, expect } from '@playwright/test';

test.describe("Timeline DAW Horizontal Wheel Zoom (Ctrl + Wheel)", () => {
  test("Ctrl + Wheel zooms in and out within [60, 320] px bounds, anchors scroll, and prevents native page zoom", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => console.log('PAGE:', msg.text()));

    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(2000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for timeline container and store
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    const timelineContainer = page.locator('.timeline-sequencer-container').first();
    await expect(timelineContainer).toBeVisible();

    // ── 1. État initial de la largeur de mesure ──
    const getTimelineMeasureWidth = async () => {
      return await page.evaluate(() => {
        const el = document.querySelector('.timeline-sequencer-container') as HTMLElement;
        const style = el?.style?.getPropertyValue('--measure-width') || '';
        return parseInt(style.replace('px', ''), 10) || 240;
      });
    };

    const initialW = await getTimelineMeasureWidth();
    expect(initialW).toBeGreaterThanOrEqual(60);
    expect(initialW).toBeLessThanOrEqual(320);

    // ── 2. Test Zoom Avant (Ctrl + Wheel UP / deltaY < 0) ──
    const zoomInResult = await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container') as HTMLElement;
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      const rect = scrollEl.getBoundingClientRect();

      // Positionner le curseur au-dessus de la mesure 1 (ex. 300px horizontal)
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -120,
        clientX: rect.left + 300,
        clientY: rect.top + 100,
      });

      const dispatched = container.dispatchEvent(event);
      return {
        defaultPrevented: event.defaultPrevented,
        dispatched,
      };
    });

    expect(zoomInResult.defaultPrevented).toBe(true);
    await page.waitForTimeout(200);

    const afterZoomInW = await getTimelineMeasureWidth();
    expect(afterZoomInW).toBeGreaterThan(initialW);

    // ── 3. Test Plafond Maximal (320 px) ──
    // Envoyer plusieurs crans de zoom avant consécutifs
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const container = document.querySelector('.timeline-sequencer-container') as HTMLElement;
        const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
        const rect = scrollEl.getBoundingClientRect();
        const event = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: -120,
          clientX: rect.left + 300,
          clientY: rect.top + 100,
        });
        container.dispatchEvent(event);
      });
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(200);

    const maxClampedW = await getTimelineMeasureWidth();
    expect(maxClampedW).toBe(320);

    // ── 4. Test Zoom Arrière (Ctrl + Wheel DOWN / deltaY > 0) ──
    await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container') as HTMLElement;
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      const rect = scrollEl.getBoundingClientRect();
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: 120,
        clientX: rect.left + 300,
        clientY: rect.top + 100,
      });
      container.dispatchEvent(event);
    });
    await page.waitForTimeout(200);

    const afterZoomOutW = await getTimelineMeasureWidth();
    expect(afterZoomOutW).toBeLessThan(maxClampedW);

    // ── 5. Test Plancher Minimal (60 px) ──
    // Envoyer plusieurs crans de zoom arrière consécutifs
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => {
        const container = document.querySelector('.timeline-sequencer-container') as HTMLElement;
        const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
        const rect = scrollEl.getBoundingClientRect();
        const event = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: 120,
          clientX: rect.left + 300,
          clientY: rect.top + 100,
        });
        container.dispatchEvent(event);
      });
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(200);

    const minClampedW = await getTimelineMeasureWidth();
    expect(minClampedW).toBe(60);

    // ── 6. Test Molette normale (sans Ctrl) : Défilement horizontal sans modification d'échelle ──
    const widthBeforeScroll = await getTimelineMeasureWidth();
    await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container') as HTMLElement;
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      const rect = scrollEl.getBoundingClientRect();
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: false,
        deltaY: 100,
        clientX: rect.left + 300,
        clientY: rect.top + 100,
      });
      container.dispatchEvent(event);
    });
    await page.waitForTimeout(100);

    const widthAfterScroll = await getTimelineMeasureWidth();
    expect(widthAfterScroll).toBe(widthBeforeScroll);

    expect(pageErrors).toEqual([]);
  });

  test("Anchor Zoom: measure under mouse cursor remains stable when zooming in", async ({ page }) => {
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(2000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    const anchorStability = await page.evaluate(() => {
      const container = document.querySelector('.timeline-sequencer-container') as HTMLElement;
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      const rect = scrollEl.getBoundingClientRect();

      // Positionner la souris à 500px du bord gauche (dans la zone des mesures)
      const mouseViewportX = 500;
      const clientX = rect.left + mouseViewportX;

      const styleBefore = container?.style?.getPropertyValue('--measure-width') || '';
      const wBefore = parseInt(styleBefore.replace('px', ''), 10) || 160;
      const scrollBefore = scrollEl.scrollLeft;

      // Mesure fractionnaire sous la souris avant zoom
      const HEADER_W = 200;
      const measureOffsetBefore = (scrollBefore + mouseViewportX - HEADER_W) / wBefore;

      // Événement zoom avant (Ctrl + Molette avant)
      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -120,
        clientX,
        clientY: rect.top + 100,
      });
      container.dispatchEvent(event);

      const styleAfter = container?.style?.getPropertyValue('--measure-width') || '';
      const wAfter = parseInt(styleAfter.replace('px', ''), 10) || 160;
      const scrollAfter = scrollEl.scrollLeft;

      // Mesure fractionnaire sous la souris après zoom
      const measureOffsetAfter = (scrollAfter + mouseViewportX - HEADER_W) / wAfter;

      return {
        wBefore,
        wAfter,
        scrollBefore,
        scrollAfter,
        measureOffsetBefore,
        measureOffsetAfter,
        offsetDiff: Math.abs(measureOffsetAfter - measureOffsetBefore),
      };
    });

    expect(anchorStability.wAfter).toBeGreaterThan(anchorStability.wBefore);
    // La position de la mesure sous le curseur doit rester strictement stable (< 0.05 mesure de différence)
    expect(anchorStability.offsetDiff).toBeLessThan(0.05);
  });
});
