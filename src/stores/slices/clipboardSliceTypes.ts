import { Pattern, SongSection } from '../../types';
import { StepRangeClipboard } from '../helpers/stepRangeClipboardHelper';

export type CopiedPatternClipboard = Pattern & {
  sourceTrackId?: number;
  sourceInstId?: string;
  sourceInstrumentType?: string;
  sourceType?: string;
  sourceFamily?: string;
  sourceName?: string;
};

export interface InstrumentPatternsClipboard {
  sourceTrackId: number;
  sourceType: string;
  sourceName: string;
  patterns: Pattern[];
  timelineAssignments?: Record<string, boolean[]>;
  sourceInstrumentIdx?: number;
  sourceInstId?: string;
  sourceInstrumentType?: string;
  sourceFamily?: string;
}

export interface VoiceStepData {
  note: string;
  syllable: string;
  role: 'P' | 'C' | '0';
  isProlongation?: boolean;
}

export interface VoiceStepsClipboard {
  steps: VoiceStepData[];
  sourceTrackId?: number;
  sourceInstId?: string;
  sourceInstrumentType?: string;
}

export interface SelectedStepRange {
  start: { isPreRoll: boolean; step: number };
  end: { isPreRoll: boolean; step: number };
  patternId?: number;
  trackId?: number;
}

export interface EditorStepRangeActionParams {
  trackId: number;
  patternId: number;
  variationId?: string | null;
  selectedStepIndices: number[];
  selectedStepIdx: number | null;
}

export interface PasteAllPatternsOptions {
  mode: 'replace' | 'append';
  applyTimeline?: boolean;
}

export type PasteAllPatternsModeOrOptions =
  | boolean
  | 'libraryOnly'
  | 'libraryAndTimeline'
  | PasteAllPatternsOptions;

export interface PendingPasteAllRequest {
  targetTrackId: number;
  defaultApplyTimeline: boolean;
}

export interface ClipboardSlice {
  copiedPattern: CopiedPatternClipboard | null;
  copiedSection: any | null;
  instrumentPatternsClipboard: InstrumentPatternsClipboard | null;
  pendingPasteAllRequest: PendingPasteAllRequest | null;
  vocalNotesClipboard: string[] | null;
  voiceStepsClipboard: VoiceStepsClipboard | null;
  stepRangeClipboard: StepRangeClipboard | null;

  setCopiedPattern: (pattern: CopiedPatternClipboard | null) => void;
  setCopiedSection: (section: any | null) => void;
  setPendingPasteAllRequest: (req: PendingPasteAllRequest | null) => void;
  handleCopyPattern: (pattern: Pattern, sourceTrackOrInst?: number | string) => void;
  handleCopySongSection: (section: SongSection) => void;
  handlePasteSongSection: (destStartMeasure: number) => void;
  copyAllTrackPatterns: (trackId: number) => void;
  pasteAllTrackPatterns: (targetTrackId: number, modeOrApplyTimeline?: PasteAllPatternsModeOrOptions) => void;
  copySelectedNotesRange: (rangeOverride?: SelectedStepRange | null) => void;
  pasteNotesOnlyStartingAt: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number) => void;
  copyVoiceStepsRange: (rangeOverride?: SelectedStepRange | null, trackIdOverride?: number, patternIdOverride?: number) => void;
  cutVoiceStepsRange: (rangeOverride?: SelectedStepRange | null, trackIdOverride?: number, patternIdOverride?: number) => void;
  pasteVoiceSteps: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number, notesOnly?: boolean) => void;

  copyEditorStepsSelection: (params: EditorStepRangeActionParams) => boolean;
  cutEditorStepsSelection: (params: EditorStepRangeActionParams) => number | null;
  pasteEditorStepsClipboard: (params: EditorStepRangeActionParams) => number[] | null;
  duplicateEditorStepsSelection: (params: EditorStepRangeActionParams) => number[] | null;
  clearEditorStepsSelection: (params: EditorStepRangeActionParams) => boolean;
}
