/**
 * webAudioPlayerPanner.ts — Routage stéréo à puissance constante par joueur (`gainL`, `gainR`)
 * pour Web Audio temps réel (`EngineStrokePlayback`) et `OfflineAudioContext` (`BaqueBounce`) (< 65 lignes).
 * Parité bit-à-bit avec `renderWorkletVoiceInBlock` + nettoyage explicite `.disconnect()` à l'extinction.
 */
import type { SectionPlayerAcousticSpec } from './sectionSpatialAcoustics';

export interface SpatialPlayerRoutingNodes {
  entryNode: AudioNode;
  gainCompensation: number;
  cleanup: () => void;
}

export function createSpatialPlayerRouting(
  ctx: BaseAudioContext,
  destination: AudioNode,
  playerSpec: SectionPlayerAcousticSpec | undefined,
  sourceChannels: number
): SpatialPlayerRoutingNodes {
  if (!playerSpec) {
    return { entryNode: destination, gainCompensation: 1.0, cleanup: () => {} };
  }

  // Cas source mono + StereoPannerNode natif : cos/sin natif * sqrt(2) === pSpec.gainL / pSpec.gainR exact !
  if (sourceChannels <= 1 && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, playerSpec.pan));
    panner.connect(destination);
    return {
      entryNode: panner,
      gainCompensation: playerSpec.gainScalar * Math.SQRT2,
      cleanup: () => { try { panner.disconnect(); } catch (_) {} },
    };
  }

  // Cas source stéréo (ou fallback sans StereoPannerNode) : séparation L/R explicite Zéro-Perte
  if (typeof ctx.createChannelSplitter === 'function' && typeof ctx.createChannelMerger === 'function') {
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    const gL = ctx.createGain();
    const gR = ctx.createGain();
    gL.gain.value = playerSpec.gainL;
    gR.gain.value = playerSpec.gainR;
    splitter.connect(gL, 0);
    splitter.connect(gR, sourceChannels > 1 ? 1 : 0);
    gL.connect(merger, 0, 0);
    gR.connect(merger, 0, 1);
    merger.connect(destination);
    return {
      entryNode: splitter,
      gainCompensation: 1.0,
      cleanup: () => {
        try { splitter.disconnect(); gL.disconnect(); gR.disconnect(); merger.disconnect(); } catch (_) {}
      },
    };
  }

  return { entryNode: destination, gainCompensation: playerSpec.gainScalar, cleanup: () => {} };
}
