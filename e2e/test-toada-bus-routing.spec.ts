/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, expect } from '@playwright/test';
import { ensureStudioLoaded } from './helpers/navigation';

test.describe('Raccordement complet du Bus Toada dans le graphe audio', () => {
  test('Topologie hiérarchique Puxador/Coro -> Bus Toada -> Master et réactivité Volume, Pan, Mute, Solo', async ({ page }) => {
    // 1. Ouvrir l'application
    await page.goto('/');

    await ensureStudioLoaded(page);

    // Attendre le chargement initial du store
    await page.waitForFunction(() => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      return Boolean(store && store.tracks && store.tracks.length > 0);
    }, { timeout: 20000 });

    await page.waitForFunction(() => {
      const tracks = (window as any).useSequencerStore?.getState?.()?.tracks || [];
      return tracks.some((t: any) => 
        t.instrumentRoleKey === 'puxador' || 
        t.instrumentRoleKey === 'coro' || 
        t.name?.toLowerCase().includes('puxador') ||
        t.id === 'puxador'
      );
    }, { timeout: 10000 });

    // S'assurer que Puxador et Coro sont présents pour générer le bus Toada
    const puxTrack = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { instrumentsConfig } = await import('../src/data.ts');
      const puxExists = store.tracks.some((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador');
      const coroExists = store.tracks.some((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro');

      let currentTracks = [...store.tracks];
      if (!puxExists || !coroExists) {
        const puxIdx = instrumentsConfig.findIndex(i => i.id === 'puxador');
        const coroIdx = instrumentsConfig.findIndex(i => i.id === 'coro');

        const newTracks = [...currentTracks];
        if (!puxExists) {
          newTracks.push({
            id: 999101,
            instrumentIdx: puxIdx !== -1 ? puxIdx : 10,
            patterns: [{ id: 9101, name: 'Puxador 1', steps: 16, activeSteps: Array(16).fill(0), measureAssignments: [true] }],
            isMute: false,
            isSolo: false,
            isHidden: false,
            volumeVal: 100,
            selectedPatternId: 9101,
            reverbVal: 0,
            panVal: 0,
            pan: 0,
            tuning: 0,
            fxSends: { reverb: 0, distortion: 0 }
          });
        }
        if (!coroExists) {
          newTracks.push({
            id: 999102,
            instrumentIdx: coroIdx !== -1 ? coroIdx : 11,
            patterns: [{ id: 9102, name: 'Coro 1', steps: 16, activeSteps: Array(16).fill(0), measureAssignments: [true] }],
            isMute: false,
            isSolo: false,
            isHidden: false,
            volumeVal: 100,
            selectedPatternId: 9102,
            reverbVal: 0,
            panVal: 0,
            pan: 0,
            tuning: 0,
            fxSends: { reverb: 0, distortion: 0 }
          });
        }
        currentTracks = newTracks;
      }
      const { ensureToadaBus } = await import('../src/stores/useSequencerStore.ts');
      const finalTracks = ensureToadaBus(currentTracks);
      store.setTracks(finalTracks);
      return finalTracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador');
    });

    // Déverrouiller et initialiser l'audio via interaction utilisateur
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('Space');

    // Attendre que le busChannel de Toada ainsi que les channels de Puxador et Coro soient créés et actifs
    await page.waitForFunction(async () => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      const { isToadaBus } = await import('../src/stores/useSequencerStore.ts');
      const { instrumentsConfig } = await import('../src/data.ts');
      const busChannels = (window as any).__BUS_CHANNELS__;
      const channels = (window as any).__CHANNELS__;
      const effectsChain = (window as any).__EFFECTS_CHAIN__ || await import('../src/audio/effectsChain.ts');
      const trackInputs = effectsChain.trackInputs || {};
      const toada = store?.tracks?.find((t: any) => isToadaBus(t));
      const pux = store?.tracks?.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador');
      const coro = store?.tracks?.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro');
      if (!toada || !pux || !coro) return false;
      const busChannel = busChannels && (busChannels[toada.id] || busChannels[String(toada.id)]);
      const puxChannel = channels && (channels[pux.id] || trackInputs[pux.id]);
      const coroChannel = channels && (channels[coro.id] || trackInputs[coro.id]);
      return Boolean(busChannel && puxChannel && coroChannel);
    }, { timeout: 20000 });

    await page.waitForFunction((puxId) => {
      const ch = (window as any).__CHANNELS__ || {};
      return Boolean(ch[puxId] || ch[String(puxId)] || ch[Number(puxId)]);
    }, puxTrack.id, { timeout: 5000 });

    // 2. Vérification de la topologie du graphe audio (Topologie en cascade)
    const topologyAudit = await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const tracks = store.tracks;
      const { isToadaBus } = await import('../src/stores/useSequencerStore.ts');
      const effectsChain = (window as any).__EFFECTS_CHAIN__ || await import('../src/audio/effectsChain.ts');
      const busChannels = (window as any).__BUS_CHANNELS__ || effectsChain.busChannels;
      const channels = (window as any).__CHANNELS__ || effectsChain.channels;
      const masterVolumeNode = effectsChain.masterVolumeNode;
      const trackInputs = effectsChain.trackInputs;
      const audioSyncModule = await import('../src/hooks/useAudioSync.ts');
      const audioEngine = (window as any).__AUDIO_ENGINE__ || audioSyncModule.audioEngine;
      const { resolveVocalOutputNode } = await import('../src/audio/vocalEngineService.ts');
      const { instrumentsConfig } = await import('../src/data.ts');

      const toadaTrack = tracks.find((t: any) => isToadaBus(t));
      const puxTrack = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador' || String(t.id) === 'puxador');
      const coroTrack = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro' || String(t.id) === 'coro');

      const toadaBusChannel = toadaTrack ? (busChannels[toadaTrack.id] || busChannels[String(toadaTrack.id)]) : null;
      const puxChannel = puxTrack ? (channels[puxTrack.id] || trackInputs[puxTrack.id]) : null;
      const coroChannel = coroTrack ? (channels[coroTrack.id] || trackInputs[coroTrack.id]) : null;

      // Résolution des nœuds de sortie vocaux
      const puxOutput = resolveVocalOutputNode(puxTrack?.id, false);
      const coroOutput = resolveVocalOutputNode(coroTrack?.id, true);

      // VoiceSynths dédiés
      const puxSynth = audioEngine ? audioEngine.getOrCreateVoiceSynth(puxTrack?.id) : null;
      const coroSynth = audioEngine ? audioEngine.getOrCreateVoiceSynth(coroTrack?.id) : null;

      const puxValid = Boolean(puxOutput && (
        puxOutput === channels[puxTrack?.id] || 
        puxOutput === (trackInputs && trackInputs[puxTrack?.id]) ||
        puxOutput === toadaBusChannel
      ));
      const coroValid = Boolean(coroOutput && (
        coroOutput === channels[coroTrack?.id] || 
        coroOutput === (trackInputs && trackInputs[coroTrack?.id]) ||
        coroOutput === toadaBusChannel
      ));

      return {
        hasToadaTrack: Boolean(toadaTrack),
        toadaTrackId: toadaTrack?.id,
        hasToadaBusChannel: Boolean(toadaBusChannel),
        hasPuxChannel: Boolean(puxChannel),
        hasCoroChannel: Boolean(coroChannel),
        hasMasterVolumeNode: Boolean(masterVolumeNode),
        puxResolvedMatchesPuxChannel: puxValid,
        coroResolvedMatchesCoroChannel: coroValid,
        hasPuxVoiceSynth: Boolean(puxSynth),
        hasCoroVoiceSynth: Boolean(coroSynth),
        puxAndCoroSynthsDistinct: puxSynth !== coroSynth,
        busChannelsKeys: Object.keys(busChannels),
      };
    });

    expect(topologyAudit.hasToadaTrack).toBe(true);
    expect(topologyAudit.hasToadaBusChannel).toBe(true);
    expect(topologyAudit.hasPuxChannel).toBe(true);
    expect(topologyAudit.hasCoroChannel).toBe(true);
    expect(topologyAudit.hasMasterVolumeNode).toBe(true);
    expect(topologyAudit.puxResolvedMatchesPuxChannel).toBe(true);
    expect(topologyAudit.coroResolvedMatchesCoroChannel).toBe(true);
    expect(topologyAudit.hasPuxVoiceSynth).toBe(true);
    expect(topologyAudit.hasCoroVoiceSynth).toBe(true);
    expect(topologyAudit.puxAndCoroSynthsDistinct).toBe(true);

    // 3. Test du Contrôle de Volume du Bus Toada
    // Descendre le volume de Toada à 0
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackVolumeChange(toadaId, 0);
    }, topologyAudit.toadaTrackId);

    // Vérifier l'application sur le nœud audio busChannels[toadaTrack.id]
    await page.waitForTimeout(200);
    const busVolAfterZero = await page.evaluate(async (toadaId) => {
      const busChannels = (window as any).__BUS_CHANNELS__ || (await import('../src/audio/effectsChain.ts')).busChannels;
      const bus = busChannels[toadaId] || busChannels[String(toadaId)];
      return bus ? bus.volume.value : null;
    }, topologyAudit.toadaTrackId);

    // Le volume à 0 donne -Infinity ou <= -100 dB (coupure totale Tone.js)
    expect(busVolAfterZero <= -100 || busVolAfterZero === -Infinity).toBe(true);

    // Remonter le volume de Toada à Unity Gain (75 = 0.0 dB)
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackVolumeChange(toadaId, 75);
    }, topologyAudit.toadaTrackId);

    await page.waitForTimeout(200);
    const busVolAfter75 = await page.evaluate(async (toadaId) => {
      const busChannels = (window as any).__BUS_CHANNELS__ || (await import('../src/audio/effectsChain.ts')).busChannels;
      const bus = busChannels[toadaId] || busChannels[String(toadaId)];
      return bus ? bus.volume.value : null;
    }, topologyAudit.toadaTrackId);

    // À 75 (Unity Gain nominal), le volume en dB vaut exactement 0 dB
    expect(busVolAfter75 !== null && Math.abs(busVolAfter75 - 0) < 0.2).toBe(true);

    // Tester la réserve de boost à 100 (+6.0 dB)
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackVolumeChange(toadaId, 100);
    }, topologyAudit.toadaTrackId);

    await page.waitForTimeout(200);
    const busVolAfter100 = await page.evaluate(async (toadaId) => {
      const busChannels = (window as any).__BUS_CHANNELS__ || (await import('../src/audio/effectsChain.ts')).busChannels;
      const bus = busChannels[toadaId] || busChannels[String(toadaId)];
      return bus ? bus.volume.value : null;
    }, topologyAudit.toadaTrackId);

    // À 100 (Max Boost), le volume en dB vaut +6.0 dB
    expect(busVolAfter100 !== null && Math.abs(busVolAfter100 - 6.0) < 0.2).toBe(true);

    // 4. Test du Panoramique du Bus Toada
    // Pan à gauche (-100)
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackPanChange(toadaId, -100);
    }, topologyAudit.toadaTrackId);

    await page.waitForTimeout(200);
    const busPanLeft = await page.evaluate(async (toadaId) => {
      const busChannels = (window as any).__BUS_CHANNELS__ || (await import('../src/audio/effectsChain.ts')).busChannels;
      const bus = busChannels[toadaId] || busChannels[String(toadaId)];
      return bus ? bus.pan.value : null;
    }, topologyAudit.toadaTrackId);
    expect(busPanLeft).toBeCloseTo(-1, 2);

    // Pan à droite (+100)
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackPanChange(toadaId, 100);
    }, topologyAudit.toadaTrackId);

    await page.waitForTimeout(200);
    const busPanRight = await page.evaluate(async (toadaId) => {
      const busChannels = (window as any).__BUS_CHANNELS__ || (await import('../src/audio/effectsChain.ts')).busChannels;
      const bus = busChannels[toadaId] || busChannels[String(toadaId)];
      return bus ? bus.pan.value : null;
    }, topologyAudit.toadaTrackId);
    expect(busPanRight).toBeCloseTo(1, 2);

    // 5. Test du Mute du Bus Toada
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackMuteToggle(toadaId);
    }, topologyAudit.toadaTrackId);

    await page.waitForTimeout(200);
    const muteAudit = await page.evaluate(async (toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const tracks = store.tracks;
      const { getEffectiveMuteState } = await import('../src/stores/useSequencerStore.ts');
      const busChannels = (window as any).__BUS_CHANNELS__ || (await import('../src/audio/effectsChain.ts')).busChannels;
      const { instrumentsConfig } = await import('../src/data.ts');

      const pux = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const toada = tracks.find((t: any) => t.id === toadaId || String(t.id) === String(toadaId));
      const bus = busChannels[toadaId] || busChannels[String(toadaId)];

      return {
        toadaIsMute: toada?.isMute,
        busChannelMute: bus ? bus.mute : null,
        puxEffectiveMute: pux ? getEffectiveMuteState(tracks, pux.id) : null,
        coroEffectiveMute: coro ? getEffectiveMuteState(tracks, coro.id) : null,
      };
    }, topologyAudit.toadaTrackId);

    expect(muteAudit.toadaIsMute).toBe(true);
    expect(muteAudit.busChannelMute).toBe(true);
    expect(muteAudit.puxEffectiveMute).toBe(true); // Puxador muté par héritage du bus Toada
    expect(muteAudit.coroEffectiveMute).toBe(true); // Coro muté par héritage du bus Toada

    // Démuter Toada
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackMuteToggle(toadaId);
    }, topologyAudit.toadaTrackId);

    // 6. Test du Solo Hiérarchique du Bus Toada (Consigne 1.A)
    // A. Activer le Solo sur le Bus Toada
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackSoloToggle(toadaId);
    }, topologyAudit.toadaTrackId);

    await page.waitForFunction((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      const track = store?.tracks?.find((t: any) => t.id === toadaId || String(t.id) === String(toadaId));
      return Boolean(track && track.isSolo === true);
    }, topologyAudit.toadaTrackId, { timeout: 5000 });
    const toadaSoloAudit = await page.evaluate(async (toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const tracks = store.tracks;
      const { getEffectiveMuteState } = await import('../src/stores/useSequencerStore.ts');
      const { instrumentsConfig } = await import('../src/data.ts');

      const pux = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const marcante = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'marcante');
      const caixa = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'caixa');

      return {
        toadaId,
        puxId: pux?.id,
        puxBusId: pux?.busId,
        toadaIsSolo: tracks.find((t: any) => t.id === toadaId || String(t.id) === String(toadaId))?.isSolo,
        puxEffectiveMute: pux ? getEffectiveMuteState(tracks, pux.id) : null,
        coroEffectiveMute: coro ? getEffectiveMuteState(tracks, coro.id) : null,
        marcanteEffectiveMute: marcante ? getEffectiveMuteState(tracks, marcante.id) : null,
        caixaEffectiveMute: caixa ? getEffectiveMuteState(tracks, caixa.id) : null,
      };
    }, topologyAudit.toadaTrackId);

    // Si Toada est en solo : Puxador et Coro restent audibles (effectiveMute = false)
    expect(toadaSoloAudit.puxEffectiveMute).toBe(false);
    expect(toadaSoloAudit.coroEffectiveMute).toBe(false);
    // La bateria est mutée (effectiveMute = true)
    expect(toadaSoloAudit.marcanteEffectiveMute).toBe(true);
    expect(toadaSoloAudit.caixaEffectiveMute).toBe(true);

    // B. Désactiver le Solo sur Toada et activer le Solo uniquement sur Puxador
    await page.evaluate((toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      store.handleTrackSoloToggle(toadaId); // off
    }, topologyAudit.toadaTrackId);

    await page.evaluate(async () => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const { instrumentsConfig } = await import('../src/data.ts');
      const pux = store.tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      if (pux) {
        store.handleTrackSoloToggle(pux.id);
      }
    });

    await page.waitForFunction(async () => {
      const store = (window as any).__SEQUENCER_STORE__?.getState();
      const { instrumentsConfig } = await import('../src/data.ts');
      const pux = store?.tracks?.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      return Boolean(pux && pux.isSolo === true);
    }, { timeout: 5000 });
    const puxSoloAudit = await page.evaluate(async (toadaId) => {
      const store = (window as any).__SEQUENCER_STORE__.getState();
      const tracks = store.tracks;
      const { getEffectiveMuteState } = await import('../src/stores/useSequencerStore.ts');
      const { instrumentsConfig } = await import('../src/data.ts');

      const pux = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      const toada = tracks.find((t: any) => t.id === toadaId || String(t.id) === String(toadaId));
      const marcante = tracks.find((t: any) => instrumentsConfig[t.instrumentIdx]?.id === 'marcante');

      return {
        toadaEffectiveMute: toada ? getEffectiveMuteState(tracks, toada.id) : null,
        puxEffectiveMute: pux ? getEffectiveMuteState(tracks, pux.id) : null,
        coroEffectiveMute: coro ? getEffectiveMuteState(tracks, coro.id) : null,
        marcanteEffectiveMute: marcante ? getEffectiveMuteState(tracks, marcante.id) : null,
      };
    }, topologyAudit.toadaTrackId);

    // Puxador reste actif
    expect(puxSoloAudit.puxEffectiveMute).toBe(false);
    // Le bus Toada parent reste ouvert
    expect(puxSoloAudit.toadaEffectiveMute).toBe(false);
    // La piste sœur (Coro) est mutée
    expect(puxSoloAudit.coroEffectiveMute).toBe(true);
    // La bateria est mutée
    expect(puxSoloAudit.marcanteEffectiveMute).toBe(true);
  });
});
