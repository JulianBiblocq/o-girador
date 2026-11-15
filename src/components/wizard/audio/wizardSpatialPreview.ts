import { getTone } from '../../../ToneLoader';
import { getAudioEngine } from '../../../hooks/audio-sync/audioEngineNodes';
import { ensureReverbConnected } from '../../../audio/effects/reverbEcoHandler';
import { EngineTuning } from '../../../audio/engine/engineTuning';
import { EngineVirtualStrokes } from '../../../audio/engine/engineVirtualStrokes';
import { computeEnginePeakGain } from '../../../audio/engine/strokeEnvelopeHelper';
import { COMPOSITE_RIM_LAYER_VELOCITY_SCALE } from '../../../audio/worklet/horizon/workletCompositeStrokeHelper';
import { useAudioStore } from '../../../stores/useAudioStore';
import { useWizardStore, PlacedInstrument } from '../../../stores/useWizardStore';
import { getDefaultSignatureTuning } from '../../../utils/audio/lutherieFactoryPresets';
import { WIZard_DEFAULT_PREVIEW_STROKE } from '../wizardSpatialMixMath';
import { stopAllWizardSpatialNodes, triggerSpatialBufferLayer } from './wizardSpatialVoiceNode';

export { stopAllWizardSpatialNodes };

export function unlockAndWarmWizardAudio(): void {
  const engine = getAudioEngine();
  const Tone = getTone();
  const ctx = engine?.getAudioContext();
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  if (Tone?.context?.state !== 'running') {
    if (typeof (Tone?.context as any)?.resume === 'function') (Tone.context as any).resume().catch(() => {});
    Tone?.start?.().catch(() => {});
  }
  if (!useAudioStore.getState().isAudioUnlocked) useAudioStore.getState().unlockAudio();
  ensureReverbConnected();
}

export async function preloadWizardInstruments(instrumentTypes: string[]): Promise<void> {
  const engine = getAudioEngine();
  if (!engine) return;
  unlockAndWarmWizardAudio();
  const unique = Array.from(new Set(instrumentTypes.filter(Boolean)));
  await Promise.all(unique.map((id) => engine.loadInstrumentSamples(id).catch(() => {})));
}

export function playWizardSpatialScheduledHit(
  instType: string, strokeSymbol: string, x: number, y: number, velocity = 0.92,
  targetTime?: number, voiceSeed = 0
): void {
  const engine = getAudioEngine();
  if (!engine) return;
  const ctx = engine.getAudioContext();
  const config = engine.configMap.get(instType);
  const stroke = config ? EngineVirtualStrokes.resolveStroke(engine.strokesMaps, instType, strokeSymbol) : null;
  if (!config || !stroke) return;

  const fire = (when: number) => {
    const file = engine.roundRobin.selectFile(instType, stroke, when, voiceSeed);
    const entry = engine.bufferPool.get(file);
    if (!entry?.loaded) return;
    const st = useWizardStore.getState();
    const tuning = st.instrumentTunings[instType] ?? getDefaultSignatureTuning(instType);
    const decayMult = Math.max(0.15, Math.min(1.0, (st.instrumentDecays[instType] ?? 100) / 100));
    const baseRate = stroke.isBarulho ? 1.0 : EngineTuning.calculatePitch(instType, config, null, tuning);
    const peak = computeEnginePeakGain(strokeSymbol === 'r' ? velocity * 0.88 : velocity, stroke.baseGain ?? 1.0, Boolean(config.calibratedStudioBank), false);
    const safeWhen = Math.max(ctx.currentTime, when);
    triggerSpatialBufferLayer(ctx, entry.get() as AudioBuffer, strokeSymbol === 'r' ? baseRate * 0.985 : baseRate, peak, decayMult, x, y, instType, safeWhen);
    if (stroke.compositeRimSymbol) {
      const rim = config.strokes.find((s) => s.symbol === stroke.compositeRimSymbol);
      const rimEntry = rim ? engine.bufferPool.get(engine.roundRobin.selectFile(instType, rim, when, voiceSeed)) : undefined;
      if (rim && rimEntry?.loaded) {
        const rimPeak = computeEnginePeakGain(velocity * COMPOSITE_RIM_LAYER_VELOCITY_SCALE, rim.baseGain ?? 1.0, Boolean(config.calibratedStudioBank), false);
        triggerSpatialBufferLayer(ctx, rimEntry.get() as AudioBuffer, baseRate, rimPeak, decayMult, x, y, instType, safeWhen);
      }
    }
  };

  if (engine.isStrokeLoaded(instType, strokeSymbol)) {
    fire(targetTime ?? ctx.currentTime);
    void engine.loadInstrumentSamples(instType).catch(() => {});
  } else {
    void engine.loadStrokeSamples(instType, strokeSymbol).then(() => {
      fire(ctx.currentTime);
      void engine.loadInstrumentSamples(instType).catch(() => {});
    }).catch(() => {});
  }
}

export function playWizardSpatialHit(instType: string, x: number, y: number, velocity = 0.92): void {
  unlockAndWarmWizardAudio();
  const sym = WIZard_DEFAULT_PREVIEW_STROKE[instType] || 'D';
  playWizardSpatialScheduledHit(instType, sym, x, y, velocity);
}

export function playWizardFormationArpeggio(instruments: PlacedInstrument[]): void {
  if (!instruments.length) return;
  stopAllWizardSpatialNodes();
  void preloadWizardInstruments(instruments.map((i) => i.instrumentType));
}
