
import { Pattern, VocalClipMeta } from '../../types/store.types';

export interface AudioAlignmentEditorProps {
  audioBuffer: AudioBuffer;
  pattern: Pattern;
  bpm: number;
  measureBpms: number[];
  measureTimeSigs: string[];
  preRollDurationSec: number;
  initialTrimStartSec?: number;
  initialTrimEndSec?: number;
  initialNudgeMs?: number;
  isImported?: boolean;
  targetMeasureIdx?: number | null;
  initialSampleBpm?: number;
  onSave: (cleanBuffer: AudioBuffer, wavBlob: Blob, meta: VocalClipMeta) => void;
  onCancel: () => void;
}

export interface AlignmentMetrics {
  effectiveMeasure: number;
  anchorBpm: number;
  targetSig: string;
  beatsCount: number;
  isCompound: boolean;
  beatDurationSec: number;
  patternMeasures: number;
  mPrev: number;
  prevBpm: number;
  prevSig: string;
  prevBeats: number;
  isCompoundPrev: boolean;
  prevBeatDuration: number;
  t_temps1: number;
  measureCycleDurationSec: number;
}
