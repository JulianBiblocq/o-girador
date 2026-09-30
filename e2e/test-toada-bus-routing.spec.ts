import { test, expect } from '@playwright/test';

test.describe("Toada Bus Routing & Controls", () => {
  test("Toada bus channel is created on audio init and controls volume, pan, mute, solo", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DEBUG') || text.includes('error') || text.includes('Error')) {
        console.log('BROWSER:', text);
      }
    });

    await page.goto('http://localhost:5174/?view=timeline');
    await page.waitForTimeout(2000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for store to be ready
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    // Click play to initialize audio context
    const playButton = page.locator('button:has(svg.lucide-play)').first();
    await expect(playButton).toBeVisible();
    await playButton.click();
    await page.waitForTimeout(1000);

    // Stop playback
    const squareButton = page.locator('button:has(svg.lucide-square)').first();
    if (await squareButton.isVisible().catch(() => false)) {
      await squareButton.click();
      await page.waitForTimeout(500);
    }

    // Inspect store tracks and audio nodes
    const audit = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const tracks = store.tracks;
      const busChannels = (window as any).__BUS_CHANNELS__;
      const channels = (window as any).__CHANNELS__;

      const toadaTrack = tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const puxTrack = tracks.find((t: any) => t.busId && String(t.busId) === String(toadaTrack?.id));
      const coroTrack = tracks.find((t: any) => t.busId && String(t.busId) === String(toadaTrack?.id) && t.id !== puxTrack?.id);

      const toadaBusNode = toadaTrack ? busChannels?.[toadaTrack.id] : null;
      const puxNode = puxTrack ? channels?.[puxTrack.id] : null;
      const coroNode = coroTrack ? channels?.[coroTrack.id] : null;

      return {
        hasToadaTrack: Boolean(toadaTrack),
        toadaTrackId: toadaTrack?.id,
        hasPuxTrack: Boolean(puxTrack),
        puxTrackId: puxTrack?.id,
        puxBusId: puxTrack?.busId,
        hasCoroTrack: Boolean(coroTrack),
        coroTrackId: coroTrack?.id,
        coroBusId: coroTrack?.busId,
        hasToadaBusNode: Boolean(toadaBusNode),
        toadaBusNodeVolume: toadaBusNode?.volume?.value,
        toadaBusNodePan: toadaBusNode?.pan?.value,
        toadaBusNodeMute: toadaBusNode?.mute,
        hasPuxNode: Boolean(puxNode),
        hasCoroNode: Boolean(coroNode),
      };
    });

    expect(audit.hasToadaTrack).toBe(true);
    expect(audit.hasPuxTrack).toBe(true);
    expect(audit.hasCoroTrack).toBe(true);
    expect(String(audit.puxBusId)).toBe(String(audit.toadaTrackId));
    expect(String(audit.coroBusId)).toBe(String(audit.toadaTrackId));

    // busChannels must have the Toada bus node instantiated!
    expect(audit.hasToadaBusNode).toBe(true);
    expect(audit.hasPuxNode).toBe(true);
    expect(audit.hasCoroNode).toBe(true);

    // ── Test 1: Volume control (Fader Toada à zéro = silence total) ──
    const debugBefore = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const busChannels = (window as any).__BUS_CHANNELS__;
      return {
        id: toadaTrack?.id,
        volBefore: toadaTrack?.volumeVal,
        busVolBefore: busChannels[toadaTrack.id]?.volume?.value,
      };
    });
    console.log('DEBUG BEFORE:', debugBefore);

    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackVolumeChange(toadaTrack.id, 0);
    });
    await page.waitForTimeout(200);

    const volZeroState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const busChannels = (window as any).__BUS_CHANNELS__;
      const v = busChannels[toadaTrack.id]?.volume?.value;
      return {
        trackVolAfter: toadaTrack?.volumeVal,
        volValue: v,
        isMutedOrSilent: v <= -100 || v === -Infinity,
        busChannelKeys: Object.keys(busChannels)
      };
    });
    console.log('DEBUG AFTER:', volZeroState);
    expect(volZeroState.trackVolAfter).toBe(0);
    expect(volZeroState.isMutedOrSilent).toBe(true);

    // Remettre le volume à 100
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackVolumeChange(toadaTrack.id, 100);
    });
    await page.waitForTimeout(200);

    const volHundredState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const busChannels = (window as any).__BUS_CHANNELS__;
      return {
        volValue: busChannels[toadaTrack.id]?.volume?.value
      };
    });
    expect(volHundredState.volValue).toBeCloseTo(0, 1);

    // ── Test 2: Pan control (Panoramique global du bus Toada) ──
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackPanChange(toadaTrack.id, -50);
    });
    await page.waitForTimeout(200);

    const panStateLeft = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const busChannels = (window as any).__BUS_CHANNELS__;
      return {
        panValue: busChannels[toadaTrack.id]?.pan?.value
      };
    });
    expect(panStateLeft.panValue).toBeCloseTo(-0.5, 2);

    // Remettre le pan à 0
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackPanChange(toadaTrack.id, 0);
    });
    await page.waitForTimeout(200);

    // ── Test 3: Mute toggle sur Toada (silence complet) ──
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackMuteToggle(toadaTrack.id);
    });
    await page.waitForTimeout(200);

    const muteState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const busChannels = (window as any).__BUS_CHANNELS__;
      const channels = (window as any).__CHANNELS__;
      const puxTrack = store.tracks.find((t: any) => t.busId && String(t.busId) === String(toadaTrack.id));

      return {
        busMute: busChannels[toadaTrack.id]?.mute,
        childMute: channels[puxTrack.id]?.mute,
      };
    });
    expect(muteState.busMute).toBe(true);
    expect(muteState.childMute).toBe(true);

    // Unmute
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackMuteToggle(toadaTrack.id);
    });
    await page.waitForTimeout(200);

    // ── Test 4: Solo toggle sur Toada (isole les voix, mute la Roda) ──
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackSoloToggle(toadaTrack.id);
    });
    await page.waitForTimeout(200);

    const soloState = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const busChannels = (window as any).__BUS_CHANNELS__;
      const channels = (window as any).__CHANNELS__;

      const puxTrack = store.tracks.find((t: any) => t.busId && String(t.busId) === String(toadaTrack.id));
      const percTrack = store.tracks.find((t: any) => !t.isBusFolder && !t.busId);

      return {
        busMute: busChannels[toadaTrack.id]?.mute,
        puxMute: channels[puxTrack.id]?.mute,
        percMute: percTrack ? channels[percTrack.id]?.mute : true,
      };
    });

    // Toada and its child Puxador must NOT be muted
    expect(soloState.busMute).toBe(false);
    expect(soloState.puxMute).toBe(false);
    // Other non-soloed tracks (percussion) MUST be muted
    expect(soloState.percMute).toBe(true);

    // Unsolo
    await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toadaTrack = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      store.handleTrackSoloToggle(toadaTrack.id);
    });
    await page.waitForTimeout(200);

    expect(pageErrors).toEqual([]);
  });

  test("Mixer view Toada fader directly controls bus channel node", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto('http://localhost:5174/?view=mixer');
    await page.waitForTimeout(2000);

    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible().catch(() => false)) {
      await entraBtn.click();
      await page.waitForTimeout(1000);
    }

    // Wait for store and tracks
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 10000 });

    // Initialize audio by triggering play
    const playButton = page.locator('button:has(svg.lucide-play)').first();
    await playButton.click();
    await page.waitForTimeout(600);

    // Stop playback
    const squareButton = page.locator('button:has(svg.lucide-square)').first();
    if (await squareButton.isVisible().catch(() => false)) {
      await squareButton.click();
      await page.waitForTimeout(300);
    }

    // Verify initial volume of Toada bus channel is ~0 dB
    const initialBusVol = await page.evaluate(() => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const toada = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
      const busChannels = (window as any).__BUS_CHANNELS__;
      return busChannels?.[toada.id]?.volume?.value;
    });
    expect(initialBusVol).toBeCloseTo(0, 1);

    // Locate the Toada folder bus fader container
    const toadaBusHeader = page.locator('span.font-cactus:has-text("Toada")').first();
    await expect(toadaBusHeader).toBeVisible();

    // Drag the Toada bus fader in the UI
    const toadaBusContainer = page.locator('div.border-\\[var\\(--cordel-border\\)\\]:has(span.font-cactus:has-text("Toada"))').first();
    const fader = toadaBusContainer.locator('div.cursor-pointer.touch-none').first();
    
    if (await fader.isVisible().catch(() => false)) {
      const box = await fader.boundingBox();
      if (box) {
        // Drag from top to near bottom (minimum volume)
        await page.mouse.move(box.x + box.width / 2, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        const busVolAfterDrag = await page.evaluate(() => {
          const store = (window as any).__SEQUENCER_STORE__.getState();
          const toada = store.tracks.find((t: any) => t.isBusFolder && t.customName === 'Toada');
          const busChannels = (window as any).__BUS_CHANNELS__;
          return busChannels?.[toada.id]?.volume?.value;
        });

        // The bus volume must have dropped significantly (<= -20 dB or silence)
        expect(busVolAfterDrag <= -20 || busVolAfterDrag === -Infinity).toBe(true);
      }
    }

    expect(pageErrors).toEqual([]);
  });
});
