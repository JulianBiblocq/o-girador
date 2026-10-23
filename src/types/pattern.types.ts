
export type StepSculptValue = number | [number, number];

export interface PatternVariation {
  id: string;
  name: string;
  steps: (string | number | [string, string])[];
  probability: number;
  volumes?: StepSculptValue[];
  decays?: StepSculptValue[];
  microtimings?: StepSculptValue[];
  beatResolutions?: number[];
  playFirstTimeOnly?: boolean;
}

export interface VocalClipMeta {
  id?: string | number;
  name?: string;
  patternId?: number;
  sampleBpm?: number;
  baseBpm: number;
  trimStartSec: number;
  trimEndSec: number;
  nudgeMs: number;
  anacrusisBeats: number;
  anacrusisSec?: number;
  startOffsetSec?: number;
  variantKeys?: string[];
  offsetStart?: number;
  startTimeDelay?: number;
  bpmSync?: boolean;
  offsetEnd?: number;
  updatedAt?: number;
}

export interface Pattern {
  id: number;
  name: string;
  steps: number;
  activeSteps: (string | number | [string, string])[];
  lyrics: string[];
  notes: string[];
  measureAssignments: boolean[];
  measureAllowVariations?: boolean[];
  volumes?: StepSculptValue[];
  decays?: StepSculptValue[];
  microtimings?: StepSculptValue[];
  vocalMode?: 'synth' | 'micro' | 'audio' | 'recorded';
  vocalLatency?: number;
  vocalBaseBpm?: number;
  vocalBpmSync?: boolean;
  vocalAudioData?: string;
  vocalAudioUrl?: string;
  vocalNudge?: number;
  vocalTrimStart?: number;
  vocalClip?: VocalClipMeta;
  hasVocalAudio?: boolean;
  beatResolutions?: number[];
  swingIntensity?: number;
  balancoPresetId?: string;
  balancoAmount?: number;
  variations?: PatternVariation[];
  preRollActiveSteps?: (string | number | [string, string])[];
  preRollLyrics?: string[];
  preRollNotes?: string[];
  preRollVolumes?: StepSculptValue[];
  preRollDecays?: StepSculptValue[];
  preRollMicrotimings?: StepSculptValue[];
  hasAnacrusis?: boolean;
  vocalVariantKeys?: string[];
}

export interface SavedPattern {
  id: string;
  instrumentId: string;
  name: string;
  folder: string;
  steps: (string | number | [string, string])[];
  variations: PatternVariation[];
  volumes?: StepSculptValue[];
  decays?: StepSculptValue[];
  microtimings?: StepSculptValue[];
  balancoPresetId?: string;
  balancoAmount?: number;
  createdAt: number;
}

export type CatalogVisibility = 'admin_global' | 'mestre_group' | 'private' | 'specific_user' | 'public';

export interface CloudPattern extends SavedPattern {
  ownerId: string;
  visibility: CatalogVisibility;
  mestreId?: string;
  audioUrl?: string | null;
}
