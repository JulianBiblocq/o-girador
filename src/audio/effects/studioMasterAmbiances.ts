import { WorkspaceTemplateMasterSettings } from '../../types/workspaceTemplate.types';

export type StudioMasterAmbianceId = 'street_parade' | 'wood_studio' | 'grand_stage';

export interface StudioMasterAmbianceDef {
  id: StudioMasterAmbianceId;
  labelFr: string;
  labelPt: string;
  descFr: string;
  descPt: string;
  masterSettings: WorkspaceTemplateMasterSettings;
}

const decayToKnob = (sec: number) => Math.max(0, Math.min(100, Math.round(((sec - 0.4) / 3.6) * 100)));

export const STUDIO_MASTER_AMBIANCES: StudioMasterAmbianceDef[] = [
  {
    id: 'street_parade',
    labelFr: 'Cortège de Rue',
    labelPt: 'Cortejo de Rua',
    descFr: 'Réverbe vive de parvis, filament mordant et impact de rue',
    descPt: 'Reverb viva de pátio, filamento mordente e impacto de rua',
    masterSettings: {
      masterVol: 0,
      masterEQ: { low: 0, mid: 0.5, high: 1.0, midFreqHz: 1200, midQ: 'wide' },
      masterCompressor: { threshold: -15, ratio: 2.5, attack: 18, release: 110, knee: 6, sidechainHpfHz: 100, mixPct: 70, makeupDb: 0 },
      reverbDecay: 0.85,
      masterReverbVol: 16,
      masterEffectsActive: { compressor: true, reverb: true, disto: true },
      isMasterMono: false,
      masterFX: {
        reverb: {
          returnVolume: 16, time: decayToKnob(0.85), isMuted: false,
          spaceType: 'street', preDelayMs: 14, lowCutHz: 160, dampHz: 7800, stereoWidth: 85, presetId: 'parvis_recife',
        },
        distortion: {
          returnVolume: 22, drive: 28, isMuted: false,
          character: 'biting_filament', preHpfHz: 190, toneHz: 7200, presetId: 'caixa_bite',
        },
        masterBus: {
          bassMonoEnabled: true, bassMonoCrossoverHz: 120,
          transientAttackDb: 1.5, transientSustainDb: 0,
          duckingDb: 2.0, scHpfHz: 100,
          attackMs: 18, releaseMs: 110, kneeDb: 6, makeupDb: 0, compMixPct: 70,
          softClipEnabled: true, softClipDriveDb: 1.2, ceilingDb: -0.3,
          toadaSlapbackMode: 'off', toadaSlapbackWet: 0,
          compPresetId: 'street_punch', eqMidFreqHz: 1200, eqMidQMode: 'wide', eqPresetId: 'cortejo_weight',
        },
      },
    },
  },
  {
    id: 'wood_studio',
    labelFr: 'Studio Bois',
    labelPt: 'Estúdio de Madeira',
    descFr: 'Pièce boisée équilibrée, lampe douce et colle naturelle',
    descPt: 'Sala de madeira equilibrada, válvula suave e cola natural',
    masterSettings: {
      masterVol: 0,
      masterEQ: { low: 0.5, mid: 0, high: 0.5, midFreqHz: 1000, midQ: 'wide' },
      masterCompressor: { threshold: -16, ratio: 3.0, attack: 15, release: 120, knee: 6, sidechainHpfHz: 95, mixPct: 75, makeupDb: 0 },
      reverbDecay: 1.35,
      masterReverbVol: 22,
      masterEffectsActive: { compressor: true, reverb: true, disto: true },
      isMasterMono: false,
      masterFX: {
        reverb: {
          returnVolume: 22, time: decayToKnob(1.35), isMuted: false,
          spaceType: 'wood_studio', preDelayMs: 22, lowCutHz: 140, dampHz: 6200, stereoWidth: 95, presetId: 'studio_bois',
        },
        distortion: {
          returnVolume: 25, drive: 24, isMuted: false,
          character: 'soft_tube', preHpfHz: 180, toneHz: 6500, presetId: 'warm_triode',
        },
        masterBus: {
          bassMonoEnabled: true, bassMonoCrossoverHz: 110,
          transientAttackDb: 0.5, transientSustainDb: 0.5,
          duckingDb: 2.5, scHpfHz: 95,
          attackMs: 15, releaseMs: 120, kneeDb: 6, makeupDb: 0, compMixPct: 75,
          softClipEnabled: true, softClipDriveDb: 1.2, ceilingDb: -0.3,
          toadaSlapbackMode: 'short', toadaSlapbackWet: 12,
          compPresetId: 'natural_glue', eqMidFreqHz: 1000, eqMidQMode: 'wide', eqPresetId: 'flat_studio',
        },
      },
    },
  },
  {
    id: 'grand_stage',
    labelFr: 'Grande Scène',
    labelPt: 'Grande Palco',
    descFr: 'Grande salle ample, sustain généreux et assise profonde',
    descPt: 'Grande salão amplo, sustentação generosa e grave profundo',
    masterSettings: {
      masterVol: 0,
      masterEQ: { low: 1.0, mid: -0.5, high: 1.5, midFreqHz: 850, midQ: 'wide' },
      masterCompressor: { threshold: -18, ratio: 4.0, attack: 12, release: 140, knee: 6, sidechainHpfHz: 95, mixPct: 80, makeupDb: 0 },
      reverbDecay: 2.40,
      masterReverbVol: 26,
      masterEffectsActive: { compressor: true, reverb: true, disto: true },
      isMasterMono: false,
      masterFX: {
        reverb: {
          returnVolume: 26, time: decayToKnob(2.40), isMuted: false,
          spaceType: 'great_hall', preDelayMs: 34, lowCutHz: 150, dampHz: 5800, stereoWidth: 100, presetId: 'grande_halle',
        },
        distortion: {
          returnVolume: 28, drive: 30, isMuted: false,
          character: 'soft_tube', preHpfHz: 180, toneHz: 6000, presetId: 'baque_grit',
        },
        masterBus: {
          bassMonoEnabled: true, bassMonoCrossoverHz: 105,
          transientAttackDb: 0, transientSustainDb: 1.0,
          duckingDb: 3.0, scHpfHz: 95,
          attackMs: 12, releaseMs: 140, kneeDb: 6, makeupDb: 0, compMixPct: 80,
          softClipEnabled: true, softClipDriveDb: 1.2, ceilingDb: -0.3,
          toadaSlapbackMode: 'wide', toadaSlapbackWet: 16,
          compPresetId: 'parallel_smash', eqMidFreqHz: 850, eqMidQMode: 'wide', eqPresetId: 'air_presence',
        },
      },
    },
  },
];
