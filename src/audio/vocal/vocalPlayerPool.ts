/**
 * O Girador - Vocal Player Instance Pooling & Lifecycle
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
    useDirectPlayer: boolean = false
  ): ActiveVocal {
    const resolvedOutput = outputNode && outputNode !== Tone.Destination && outputNode !== (Tone as any).getDestination?.()
      ? outputNode
      : resolveVocalOutputNode(trackId, isCoroTrack);

    let entry = activeVocals.get(vocalKey);
    if (entry) {
      if (entry.currentBuffer !== audioBuffer) {
        if (entry.grainPlayer) entry.grainPlayer.buffer.set(audioBuffer);
        if (entry.directPlayer) entry.directPlayer.buffer.set(audioBuffer);
        entry.currentBuffer = audioBuffer;
      }
      if (useDirectPlayer) {
        if (!entry.directPlayer) {
          const direct = new Tone.Player(audioBuffer);
          direct.volume.value = 0; direct.loop = false; direct.fadeIn = 0.01; direct.fadeOut = 0.03; direct.onstop = () => {};
          direct.connect(entry.mainGain);
          entry.directPlayer = direct;
        }
        entry.mainPlayer = entry.directPlayer;
        if (entry.grainPlayer) { try { entry.grainPlayer.playbackRate = 1.0; } catch (_) {} }
      } else {
        if (!entry.grainPlayer) {
          const grain = new Tone.GrainPlayer(audioBuffer);
          grain.grainSize = 0.09; grain.overlap = 0.04; grain.volume.value = 0; grain.loop = false;
          (grain as any).fadeIn = 0; grain.onstop = () => {};
          grain.connect(entry.mainGain);
          entry.grainPlayer = grain;
        }
        entry.mainPlayer = entry.grainPlayer;
      }
      entry.mainPlayer.loop = false;
      entry.mainPlayer.onstop = () => {};
      return entry;
    }

    const mainGain = new Tone.Gain(1);
    const isEcoMode = useSequencerStore.getState().isEcoMode;
    let haasNodes: ActiveVocal['haasNodes'];

    if (isCoroTrack && !isEcoMode) {
      haasNodes = createHaasModule(mainGain, resolvedOutput);
    } else {
      const dest = (resolvedOutput && (resolvedOutput.input || resolvedOutput)) || (masterVolumeNode && (masterVolumeNode.input || masterVolumeNode));
      mainGain.connect(dest);
    }

    let directPlayer: Tone.Player | undefined;
    let grainPlayer: Tone.GrainPlayer | undefined;
    let mainPlayer: Tone.GrainPlayer | Tone.Player;

    if (useDirectPlayer) {
      directPlayer = new Tone.Player(audioBuffer);
      directPlayer.volume.value = 0; directPlayer.loop = false; directPlayer.fadeIn = 0.01; directPlayer.fadeOut = 0.03; directPlayer.onstop = () => {};
      directPlayer.connect(mainGain); mainPlayer = directPlayer;
    } else {
      grainPlayer = new Tone.GrainPlayer(audioBuffer);
      grainPlayer.grainSize = 0.09; grainPlayer.overlap = 0.04; grainPlayer.volume.value = 0; grainPlayer.loop = false;
      (grainPlayer as any).fadeIn = 0; grainPlayer.onstop = () => {};
      grainPlayer.connect(mainGain); mainPlayer = grainPlayer;
    }

    entry = { mainPlayer, directPlayer, grainPlayer, mainGain, currentBuffer: audioBuffer, haasNodes, chorusPlayers: [], chorusGains: [], panners: [] };
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
    if (e.directPlayer && e.directPlayer !== e.mainPlayer) { try { e.directPlayer.onstop = () => {}; e.directPlayer.stop(); e.directPlayer.disconnect(); e.directPlayer.dispose(); } catch (_) {} }
    if (e.grainPlayer && e.grainPlayer !== e.mainPlayer) { try { e.grainPlayer.onstop = () => {}; e.grainPlayer.stop(); e.grainPlayer.disconnect(); e.grainPlayer.dispose(); } catch (_) {} }
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
        try { entry.grainPlayer?.stop(); } catch (_) {}
        entry.chorusPlayers.forEach(p => { try { p.stop(); } catch (_) {} });
      }
    });
  }

  public static stopAll(): void {
    activeVocals.forEach((entry) => {
      try { entry.mainPlayer.onstop = () => {}; entry.mainPlayer.stop(); } catch (_) {}
      try { entry.directPlayer?.stop(); } catch (_) {}
      try { entry.grainPlayer?.stop(); } catch (_) {}
      entry.chorusPlayers.forEach(p => { try { p.onstop = () => {}; p.stop(); } catch (_) {} });
    });
  }
}
