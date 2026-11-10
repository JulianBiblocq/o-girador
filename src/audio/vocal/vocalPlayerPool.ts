/**
 * O Girador - Vocal Player Instance Pooling & Lifecycle
 * Zéro GrainPlayer : utilise exclusivement `Tone.Player` (`AudioBufferSourceNode` natif) à `playbackRate = 1.0`
 * sur les buffers haute définition calculés par le moteur DSP Studio (`vocalDsp`) (< 115 lignes).
 */

import * as Tone from 'tone';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { masterVolumeNode } from '../effectsChain';
import { resolveVocalOutputNode } from './vocalOutputNode';
import { ActiveVocal, activeVocals } from './vocalTypes';
import { createHaasModule, disposeHaasNodes } from './vocalHaasModule';

export class VocalPlayerPool {
  public static getOrCreate(
    vocalKey: string,
    audioBuffer: AudioBuffer,
    outputNode: any,
    isCoroTrack: boolean = false,
    trackId?: string | number,
    _useDirectPlayer: boolean = true
  ): ActiveVocal {
    const resolvedOutput = outputNode && outputNode !== Tone.Destination && outputNode !== (Tone as any).getDestination?.()
      ? outputNode
      : resolveVocalOutputNode(trackId, isCoroTrack);

    let entry = activeVocals.get(vocalKey);
    if (entry) {
      if (entry.currentBuffer !== audioBuffer) {
        entry.mainPlayer.buffer.set(audioBuffer);
        entry.currentBuffer = audioBuffer;
      }
      entry.mainPlayer.playbackRate = 1.0;
      entry.mainPlayer.loop = false;
      entry.mainPlayer.onstop = () => {};
      return entry;
    }

    const mainGain = new Tone.Gain(1);
    const isFxLightened = Boolean(useSequencerStore.getState().ecoConfig?.disableFx);
    let haasNodes: ActiveVocal['haasNodes'];

    if (isCoroTrack) {
      // Graphe stable : le module Haas est toujours cable pour le Coro ; le Palier 2 Eco
      // se contente d'abaisser ses gains Side (voir applyVocalHaasEco), sans recablage.
      haasNodes = createHaasModule(mainGain, resolvedOutput, isFxLightened);
    } else {
      const dest = (resolvedOutput && (resolvedOutput.input || resolvedOutput)) || (masterVolumeNode && (masterVolumeNode.input || masterVolumeNode));
      mainGain.connect(dest);
    }

    const directPlayer = new Tone.Player(audioBuffer);
    directPlayer.volume.value = 0;
    directPlayer.playbackRate = 1.0;
    directPlayer.loop = false;
    directPlayer.fadeIn = 0.004;
    directPlayer.fadeOut = 0.015;
    directPlayer.onstop = () => {};
    directPlayer.connect(mainGain);

    entry = {
      mainPlayer: directPlayer,
      directPlayer,
      mainGain,
      currentBuffer: audioBuffer,
      haasNodes,
      chorusPlayers: [],
      chorusGains: [],
      panners: [],
    };
    activeVocals.set(vocalKey, entry);
    return entry;
  }

  public static disposePlayer(trackIdOrKey: string | number, patternId?: number): void {
    const keys = new Set<string>();
    if (patternId !== undefined) keys.add(`${trackIdOrKey}_${patternId}`);
    else {
      const s = String(trackIdOrKey);
      keys.add(s);
      activeVocals.forEach((_, k) => { if (k.endsWith(`_${s}`) || k === s) keys.add(k); });
    }
    keys.forEach((k) => {
      const e = activeVocals.get(k);
      if (e) { this.disposeEntry(e); activeVocals.delete(k); }
    });
  }

  public static disposeAll(): void {
    activeVocals.forEach((e) => this.disposeEntry(e));
    activeVocals.clear();
  }

  private static disposeEntry(e: ActiveVocal): void {
    try { e.mainPlayer.onstop = () => {}; e.mainPlayer.stop(); e.mainPlayer.disconnect(); e.mainPlayer.dispose(); } catch (_) {}
    if (e.directPlayer && e.directPlayer !== e.mainPlayer) {
      try { e.directPlayer.onstop = () => {}; e.directPlayer.stop(); e.directPlayer.disconnect(); e.directPlayer.dispose(); } catch (_) {}
    }
    try { e.mainGain.disconnect(); e.mainGain.dispose(); } catch (_) {}
    disposeHaasNodes(e.haasNodes);
    e.chorusPlayers.forEach(p => { try { p.onstop = () => {}; p.stop(); p.disconnect(); p.dispose(); } catch (_) {} });
    e.chorusGains.forEach(g => { try { g.disconnect(); g.dispose(); } catch (_) {} });
    e.panners.forEach(pan => { try { pan.disconnect(); pan.dispose(); } catch (_) {} });
  }

  public static stopPattern(patternId: number | string, trackId?: string | number): void {
    const filter = trackId !== undefined ? `${trackId}_${patternId}` : null;
    activeVocals.forEach((entry, k) => {
      if (filter ? k === filter : (k.endsWith(`_${patternId}`) || k === String(patternId))) {
        try { entry.mainPlayer.stop(); } catch (_) {}
        try { entry.directPlayer?.stop(); } catch (_) {}
        entry.chorusPlayers.forEach(p => { try { p.stop(); } catch (_) {} });
      }
    });
  }

  public static stopAll(): void {
    activeVocals.forEach((entry) => {
      try { entry.mainPlayer.onstop = () => {}; entry.mainPlayer.stop(); } catch (_) {}
      try { entry.directPlayer?.stop(); } catch (_) {}
      entry.chorusPlayers.forEach(p => { try { p.onstop = () => {}; p.stop(); } catch (_) {} });
    });
  }
}
