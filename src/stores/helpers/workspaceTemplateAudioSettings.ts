import { WorkspaceTemplate, WorkspaceTemplateOptions, WorkspaceTemplateMasterSettings, MasterFX } from '../../types';
import {
  DEFAULT_STUDIO_MASTER_BUS_CONFIG, ReverbSpaceType, TubeSaturationCharacter, ToadaSlapbackMode,
} from '../../audio/effects/studioFxPresets';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const isReverbSpace = (v: unknown): v is ReverbSpaceType => v === 'street' || v === 'wood_studio' || v === 'great_hall';
const isTubeChar = (v: unknown): v is TubeSaturationCharacter => v === 'soft_tube' || v === 'biting_filament';
const isSlapbackMode = (v: unknown): v is ToadaSlapbackMode => v === 'off' || v === 'short' || v === 'wide';

export function buildWorkspaceTemplateMasterSettings(
  storeState: {
    masterFX: MasterFX;
    masterEffectsActive?: { compressor: boolean; reverb: boolean; disto: boolean };
    isMasterMono?: boolean;
  },
  audioState: {
    masterVol?: number; masterEQ?: { low: number; mid: number; high: number };
    masterCompressor?: { threshold: number; ratio: number }; reverbDecay?: number; masterReverbVol?: number;
  } | undefined,
  options: WorkspaceTemplateOptions
): WorkspaceTemplateMasterSettings {
  const { reverb: rev, distortion: dist } = storeState.masterFX;
  const bus = { ...DEFAULT_STUDIO_MASTER_BUS_CONFIG, ...(storeState.masterFX?.masterBus || {}) };
  const eq = audioState?.masterEQ ?? { low: 0, mid: 0, high: 0 };
  const comp = audioState?.masterCompressor ?? { threshold: -16, ratio: 3 };
  const revTime = clamp(rev?.time ?? 30, 0, 100);
  const revDecay = Number((0.4 + (revTime / 100) * 3.6).toFixed(2));
  const revVol = clamp(rev?.returnVolume ?? audioState?.masterReverbVol ?? 70, 0, 100);
  const distVol = clamp(dist?.returnVolume ?? 0, 0, 100);
  const distDrive = clamp(dist?.drive ?? 20, 0, 100);

  return {
    masterVol: options.includeVolumePan ? (audioState?.masterVol ?? 0) : undefined,
    masterEQ: options.includeEQ ? {
      low: clamp(eq.low, -12, 12), mid: clamp(eq.mid, -12, 12), high: clamp(eq.high, -12, 12),
      midFreqHz: bus.eqMidFreqHz, midQ: bus.eqMidQMode,
    } : undefined,
    masterCompressor: {
      threshold: comp.threshold, ratio: comp.ratio, attack: bus.attackMs, release: bus.releaseMs,
      knee: bus.kneeDb, sidechainHpfHz: bus.scHpfHz, mixPct: bus.compMixPct, makeupDb: bus.makeupDb,
    },
    reverbDecay: options.includeFX ? revDecay : undefined,
    masterReverbVol: options.includeFX ? revVol : undefined,
    masterEffectsActive: storeState.masterEffectsActive ? { ...storeState.masterEffectsActive } : { compressor: true, reverb: true, disto: true },
    isMasterMono: Boolean(storeState.isMasterMono),
    masterFX: options.includeFX ? {
      reverb: { ...rev, returnVolume: revVol, time: revTime, isMuted: Boolean(rev?.isMuted), spaceType: rev?.spaceType ?? 'wood_studio' },
      distortion: { ...dist, returnVolume: distVol, drive: distDrive, isMuted: Boolean(dist?.isMuted), character: dist?.character ?? 'soft_tube' },
      masterBus: { ...bus },
    } : undefined,
  };
}

export function normalizeTemplateMasterFX(
  masterSettings: WorkspaceTemplateMasterSettings | undefined, fallbackFX: MasterFX, options: WorkspaceTemplateOptions
): MasterFX {
  if (!masterSettings) return fallbackFX;
  const rawFX = masterSettings.masterFX;
  const rev = (options.includeFX && rawFX?.reverb) ? rawFX.reverb : fallbackFX.reverb;
  const dist = (options.includeFX && rawFX?.distortion) ? rawFX.distortion : fallbackFX.distortion;
  const rawBus = (options.includeFX && rawFX?.masterBus) ? rawFX.masterBus : {};
  const eq = masterSettings.masterEQ;
  const comp = masterSettings.masterCompressor;

  const revTime = typeof rev.time === 'number' ? rev.time : (fallbackFX.reverb.time ?? 30);
  const revVol = typeof rev.returnVolume === 'number' ? rev.returnVolume : (fallbackFX.reverb.returnVolume ?? 70);
  const distDrive = typeof dist.drive === 'number' ? dist.drive : (fallbackFX.distortion.drive ?? 20);
  const distVol = typeof dist.returnVolume === 'number' ? dist.returnVolume : (fallbackFX.distortion.returnVolume ?? 0);
  const slapWetRaw = rawBus.toadaSlapbackWet ?? fallbackFX.masterBus?.toadaSlapbackWet ?? 0;
  const slapWetPct = slapWetRaw > 0 && slapWetRaw <= 1 ? Math.round(slapWetRaw * 100) : Math.round(slapWetRaw);

  const resolvedSpace: ReverbSpaceType = isReverbSpace(rev.spaceType) ? rev.spaceType : (fallbackFX.reverb.spaceType ?? 'wood_studio');
  const resolvedChar: TubeSaturationCharacter = isTubeChar(dist.character) ? dist.character : (fallbackFX.distortion.character ?? 'soft_tube');
  const resolvedSlap: ToadaSlapbackMode = isSlapbackMode(rawBus.toadaSlapbackMode) ? rawBus.toadaSlapbackMode : (fallbackFX.masterBus?.toadaSlapbackMode ?? 'off');
  const resolvedQMode: 'wide' | 'narrow' = options.includeEQ
    ? ((rawBus.eqMidQMode ?? eq?.midQ) === 'narrow' ? 'narrow' : 'wide')
    : (fallbackFX.masterBus?.eqMidQMode ?? 'wide');

  return {
    reverb: { ...fallbackFX.reverb, ...rev, returnVolume: clamp(revVol, 0, 100), time: clamp(revTime, 0, 100), spaceType: resolvedSpace },
    distortion: { ...fallbackFX.distortion, ...dist, returnVolume: clamp(distVol, 0, 100), drive: clamp(distDrive, 0, 100), character: resolvedChar },
    masterBus: {
      ...DEFAULT_STUDIO_MASTER_BUS_CONFIG, ...(fallbackFX.masterBus || {}), ...rawBus,
      bassMonoEnabled: rawBus.bassMonoEnabled ?? fallbackFX.masterBus?.bassMonoEnabled ?? true,
      bassMonoCrossoverHz: rawBus.bassMonoCrossoverHz ?? fallbackFX.masterBus?.bassMonoCrossoverHz ?? 110,
      transientAttackDb: rawBus.transientAttackDb ?? fallbackFX.masterBus?.transientAttackDb ?? 0,
      transientSustainDb: rawBus.transientSustainDb ?? fallbackFX.masterBus?.transientSustainDb ?? 0,
      duckingDb: rawBus.duckingDb ?? fallbackFX.masterBus?.duckingDb ?? 1.5,
      scHpfHz: rawBus.scHpfHz ?? comp?.sidechainHpfHz ?? fallbackFX.masterBus?.scHpfHz ?? 95,
      attackMs: rawBus.attackMs ?? comp?.attack ?? fallbackFX.masterBus?.attackMs ?? 15,
      releaseMs: rawBus.releaseMs ?? comp?.release ?? fallbackFX.masterBus?.releaseMs ?? 120,
      kneeDb: rawBus.kneeDb ?? comp?.knee ?? fallbackFX.masterBus?.kneeDb ?? 6,
      makeupDb: rawBus.makeupDb ?? comp?.makeupDb ?? fallbackFX.masterBus?.makeupDb ?? 0,
      compMixPct: rawBus.compMixPct ?? comp?.mixPct ?? fallbackFX.masterBus?.compMixPct ?? 75,
      ceilingDb: rawBus.ceilingDb ?? fallbackFX.masterBus?.ceilingDb ?? -0.3,
      toadaSlapbackMode: resolvedSlap,
      toadaSlapbackWet: clamp(slapWetPct, 0, 100),
      eqMidFreqHz: options.includeEQ ? (rawBus.eqMidFreqHz ?? eq?.midFreqHz ?? 1000) : (fallbackFX.masterBus?.eqMidFreqHz ?? 1000),
      eqMidQMode: resolvedQMode,
    },
  };
}

export const applyWorkspaceTemplateAudioSettings = (
  template: WorkspaceTemplate,
  audio?: {
    setMasterEQ?: (eq: { low: number; mid: number; high: number }) => void;
    setMasterCompressor?: (comp: { threshold: number; ratio: number }) => void;
    setMasterVol?: (vol: number) => void;
    setReverbDecay?: (decay: number) => void;
    setMasterReverbVol?: (vol: number) => void;
  },
  overrideOptions?: WorkspaceTemplateOptions
) => {
  if (!template.masterSettings || !audio) return;
  const options = overrideOptions || template.options;
  const { masterSettings } = template;
  if (options.includeEQ && masterSettings.masterEQ && audio.setMasterEQ) {
    audio.setMasterEQ({
      low: clamp(masterSettings.masterEQ.low, -12, 12),
      mid: clamp(masterSettings.masterEQ.mid, -12, 12),
      high: clamp(masterSettings.masterEQ.high, -12, 12),
    });
  }
  if (masterSettings.masterCompressor && audio.setMasterCompressor) {
    audio.setMasterCompressor({ threshold: masterSettings.masterCompressor.threshold, ratio: masterSettings.masterCompressor.ratio });
  }
  if (options.includeVolumePan && typeof masterSettings.masterVol === 'number' && audio.setMasterVol) {
    audio.setMasterVol(clamp(masterSettings.masterVol, -60, 6));
  }
  if (options.includeFX) {
    if (masterSettings.reverbDecay !== undefined && audio.setReverbDecay) audio.setReverbDecay(masterSettings.reverbDecay);
    if (masterSettings.masterReverbVol !== undefined && audio.setMasterReverbVol) audio.setMasterReverbVol(masterSettings.masterReverbVol);
  }
};
