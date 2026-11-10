/**
 * O Girador - Types DSP Studio, Profils d'Enceintes & Dictionnaire de 3 Presets de Base par Module (< 120 lignes)
 */

export type ReverbSpaceType = 'street' | 'wood_studio' | 'great_hall';
export type TubeSaturationCharacter = 'soft_tube' | 'biting_filament';
export type ToadaSlapbackMode = 'off' | 'short' | 'wide';
export type SpeakerProfileId = 'headphones' | 'usb_bt_speaker' | 'rehearsal_room' | 'vocal_focus';

export interface StudioReverbConfig {
  returnVolume: number; time: number; isMuted: boolean;
  spaceType?: ReverbSpaceType; preDelayMs?: number; lowCutHz?: number; dampHz?: number; stereoWidth?: number; presetId?: string;
}

export interface StudioDistortionConfig {
  returnVolume: number; drive: number; isMuted: boolean;
  character?: TubeSaturationCharacter; preHpfHz?: number; toneHz?: number; presetId?: string;
}

export interface StudioMasterBusConfig {
  bassMonoEnabled?: boolean; bassMonoCrossoverHz?: number;
  transientAttackDb?: number; transientSustainDb?: number;
  duckingDb?: number; scHpfHz?: number;
  attackMs?: number; releaseMs?: number; kneeDb?: number; makeupDb?: number; compMixPct?: number;
  softClipEnabled?: boolean; softClipDriveDb?: number; ceilingDb?: number;
  toadaSlapbackMode?: ToadaSlapbackMode; toadaSlapbackWet?: number; compPresetId?: string;
  eqMidFreqHz?: number; eqMidQMode?: 'wide' | 'narrow'; eqPresetId?: string;
}

export const DEFAULT_STUDIO_MASTER_BUS_CONFIG: Required<StudioMasterBusConfig> = {
  bassMonoEnabled: true, bassMonoCrossoverHz: 110,
  transientAttackDb: 0, transientSustainDb: 0,
  duckingDb: 1.5, scHpfHz: 95,
  attackMs: 15, releaseMs: 120, kneeDb: 6, makeupDb: 0, compMixPct: 75,
  softClipEnabled: true, softClipDriveDb: 1.2, ceilingDb: -0.3,
  toadaSlapbackMode: 'off', toadaSlapbackWet: 0, compPresetId: 'natural_glue',
  eqMidFreqHz: 1000, eqMidQMode: 'wide', eqPresetId: 'flat_studio',
};

export interface StudioModulePreset<T> {
  id: string; labelFr: string; labelPt: string; settings: T;
}

export const STUDIO_REVERB_PRESETS: StudioModulePreset<Partial<StudioReverbConfig>>[] = [
  {
    id: 'parvis_recife', labelFr: 'Parvis / Rue', labelPt: 'Pátio / Rua',
    settings: { spaceType: 'street', time: 22, preDelayMs: 18, lowCutHz: 160, dampHz: 6200, stereoWidth: 85, presetId: 'parvis_recife' },
  },
  {
    id: 'studio_bois', labelFr: 'Studio Bois', labelPt: 'Estúdio Madeira',
    settings: { spaceType: 'wood_studio', time: 35, preDelayMs: 12, lowCutHz: 140, dampHz: 7500, stereoWidth: 100, presetId: 'studio_bois' },
  },
  {
    id: 'grande_halle', labelFr: 'Grande Salle', labelPt: 'Grande Salão',
    settings: { spaceType: 'great_hall', time: 68, preDelayMs: 28, lowCutHz: 120, dampHz: 8500, stereoWidth: 100, presetId: 'grande_halle' },
  },
];

export const STUDIO_SATURATION_PRESETS: StudioModulePreset<Partial<StudioDistortionConfig>>[] = [
  {
    id: 'warm_triode', labelFr: 'Lampe Douce', labelPt: 'Válvula Suave',
    settings: { character: 'soft_tube', drive: 24, preHpfHz: 160, toneHz: 6800, presetId: 'warm_triode' },
  },
  {
    id: 'caixa_bite', labelFr: 'Filament Mordant', labelPt: 'Filamento Mordente',
    settings: { character: 'biting_filament', drive: 45, preHpfHz: 210, toneHz: 7800, presetId: 'caixa_bite' },
  },
  {
    id: 'baque_grit', labelFr: 'Grain Cortège', labelPt: 'Grão de Cortejo',
    settings: { character: 'soft_tube', drive: 62, preHpfHz: 180, toneHz: 5400, presetId: 'baque_grit' },
  },
];

export interface StudioCompressorPresetPayload extends Partial<StudioMasterBusConfig> {
  threshold: number; ratio: number;
}

export const STUDIO_COMPRESSOR_PRESETS: StudioModulePreset<StudioCompressorPresetPayload>[] = [
  {
    id: 'natural_glue', labelFr: 'Colle Naturelle', labelPt: 'Cola Natural',
    settings: { threshold: -6, ratio: 2, scHpfHz: 95, attackMs: 18, releaseMs: 160, kneeDb: 6, makeupDb: 0.5, compMixPct: 100, duckingDb: 1.5, compPresetId: 'natural_glue' },
  },
  {
    id: 'street_punch', labelFr: 'Impact Cortège', labelPt: 'Impacto de Rua',
    settings: { threshold: -10, ratio: 4, scHpfHz: 110, attackMs: 12, releaseMs: 110, kneeDb: 4, makeupDb: 1.5, compMixPct: 80, duckingDb: 2.0, compPresetId: 'street_punch' },
  },
  {
    id: 'parallel_smash', labelFr: 'Parallèle Denso', labelPt: 'Paralelo Denso',
    settings: { threshold: -16, ratio: 6, scHpfHz: 120, attackMs: 8, releaseMs: 90, kneeDb: 6, makeupDb: 2.5, compMixPct: 55, duckingDb: 2.5, compPresetId: 'parallel_smash' },
  },
];

export interface StudioEqPresetPayload extends Partial<StudioMasterBusConfig> {
  low: number; mid: number; high: number;
}

export const STUDIO_EQ_PRESETS: StudioModulePreset<StudioEqPresetPayload>[] = [
  {
    id: 'flat_studio', labelFr: 'Neutre Studio', labelPt: 'Neutro Estúdio',
    settings: { low: 0, mid: 0, high: 0, eqMidFreqHz: 1000, eqMidQMode: 'wide', bassMonoEnabled: true, bassMonoCrossoverHz: 110, ceilingDb: -0.3, eqPresetId: 'flat_studio' },
  },
  {
    id: 'cortejo_weight', labelFr: 'Assise Cortège', labelPt: 'Peso de Cortejo',
    settings: { low: 2.5, mid: -1.5, high: 1.5, eqMidFreqHz: 650, eqMidQMode: 'wide', bassMonoEnabled: true, bassMonoCrossoverHz: 120, ceilingDb: -0.3, eqPresetId: 'cortejo_weight' },
  },
  {
    id: 'air_presence', labelFr: 'Clarté & Air', labelPt: 'Clareza & Ar',
    settings: { low: 1.0, mid: 1.5, high: 3.0, eqMidFreqHz: 1800, eqMidQMode: 'narrow', bassMonoEnabled: true, bassMonoCrossoverHz: 100, ceilingDb: -0.3, eqPresetId: 'air_presence' },
  },
];
