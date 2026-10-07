import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe("Timeline Zoom (Ctrl + Wheel), Playhead Alignment & Audio Lookahead", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(1000);
    await ensureStudioLoaded(page);

    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });
  });

  test("1. Lookahead Harmonization (250 ms)", async ({ page }) => {
    const lookaheads = await page.evaluate(() => {
      const Tone = (window as any).Tone;
      return {
        contextLookAhead: Tone?.context?.lookAhead,
        transportScheduleAheadTime: Tone?.Transport?.scheduleAheadTime,
      };
    });

    expect(lookaheads.contextLookAhead).toBe(0.25);
    expect(lookaheads.transportScheduleAheadTime).toBe(0.25);
  });

  test("2. Ctrl + Wheel Zoom: intercepté en capture sur window, clampé [60, 320] px, prévient le zoom natif", async ({ page }) => {
    const timelineContainer = page.locator('.timeline-sequencer-container').first();
    await expect(timelineContainer).toBeVisible();

    const getTimelineMeasureWidth = async () => {
      return await page.evaluate(() => {
        const el = document.querySelector('.timeline-sequencer-container') as HTMLElement;
        const style = el?.style?.getPropertyValue('--measure-width') || '';
        return parseInt(style.replace('px', ''), 10) || 240;
      });
    };

    const initialW = await getTimelineMeasureWidth();

    // Émettre un événement wheel avec ctrlKey sur window pour tester la phase de capture
    const zoomResult = await page.evaluate(() => {
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      const rect = scrollEl.getBoundingClientRect();

      const event = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -120, // Zoom in
        clientX: rect.left + 250,
        clientY: rect.top + 80,
      });

      window.dispatchEvent(event);
      return {
        defaultPrevented: event.defaultPrevented,
      };
    });

    expect(zoomResult.defaultPrevented).toBe(true);
    await page.waitForTimeout(150);

    const zoomedInW = await getTimelineMeasureWidth();
    expect(zoomedInW).toBeGreaterThan(initialW);

    // Zoom arrière consécutif pour tester le clamp bas (60px)
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => {
        const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
        const rect = scrollEl.getBoundingClientRect();
        const event = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: 120,
          clientX: rect.left + 250,
          clientY: rect.top + 80,
        });
        window.dispatchEvent(event);
      });
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(150);

    const minW = await getTimelineMeasureWidth();
    expect(minW).toBe(60);

    // Zoom avant consécutif pour tester le clamp haut (320px)
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
        const rect = scrollEl.getBoundingClientRect();
        const event = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: -120,
          clientX: rect.left + 250,
          clientY: rect.top + 80,
        });
        window.dispatchEvent(event);
      });
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(150);

    const maxW = await getTimelineMeasureWidth();
    expect(maxW).toBe(320);
  });

  test("3. Calage à l'arrêt : clic sur mesure positionne la playhead sur la mesure sans masquer ni reset scrollLeft", async ({ page }) => {
    const playhead = page.locator('#timeline-playhead-line');
    await expect(playhead).toBeVisible();

    // Vérifier l'état initial : lecture à l'arrêt
    const isPlaying = await page.evaluate(() => (window as any).__SEQUENCER_STORE__?.getState().isPlaying);
    expect(isPlaying).toBe(false);

    // Déplacer le scroll pour vérifier qu'aucun reset à 0 n'a lieu
    await page.evaluate(() => {
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      if (scrollEl) {
        scrollEl.scrollLeft = 300;
      }
    });
    await page.waitForTimeout(100);

    const scrollBefore = await page.evaluate(() => {
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      return scrollEl?.scrollLeft || 0;
    });
    expect(scrollBefore).toBe(300);

    // Clic sur la mesure 2 (index 1) ou 3 (index 2)
    const targetMeasure = 2;
    await page.evaluate((mIdx) => {
      window.dispatchEvent(new CustomEvent('o-girador-timeline-nav', {
        detail: { mIdx, sIdx: 0 }
      }));
    }, targetMeasure);

    await page.waitForTimeout(150);

    // Vérifier les états :
    // 1. currentMeasure synchronisé
    const curMeasure = await page.evaluate(() => (window as any).__SEQUENCER_STORE__?.getState().currentMeasure);
    expect(curMeasure).toBe(targetMeasure);

    // 2. Playhead visible et transformée
    const playheadInfo = await page.evaluate(() => {
      const el = document.getElementById('timeline-playhead-line');
      return {
        display: el?.style?.display,
        transform: el?.style?.transform,
      };
    });

    expect(playheadInfo.display).not.toBe('none');
    expect(playheadInfo.transform).toContain('translate3d');

    // 3. scrollLeft n'a PAS été réinitialisé à 0
    const scrollAfter = await page.evaluate(() => {
      const scrollEl = document.querySelector('#timeline-scroll-container') as HTMLElement;
      return scrollEl?.scrollLeft || 0;
    });
    expect(scrollAfter).toBe(scrollBefore);

    // 4. Tone.Transport positionné à 2:0:0
    const transportPosition = await page.evaluate(() => {
      const Tone = (window as any).Tone;
      return String(Tone?.Transport?.position || '');
    });
    expect(transportPosition).toContain('2:');
  });
});
