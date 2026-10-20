import { Pattern, SongSection } from '../../types';

export interface InstrumentPatternsClipboard {
  sourceTrackId: number;
  sourceType: string;
  sourceName: string;
  patterns: Pattern[];
  timelineAssignments?: Record<string, boolean[]>;
  sourceInstrumentIdx?: number;
  sourceInstId?: string;
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
}

export interface SelectedStepRange {
  start: { isPreRoll: boolean; step: number };
  end: { isPreRoll: boolean; step: number };
  patternId?: number;
  trackId?: number;
}

export interface ClipboardSlice {
  copiedPattern: Pattern | null;
  copiedSection: any | null;
  instrumentPatternsClipboard: InstrumentPatternsClipboard | null;
  vocalNotesClipboard: string[] | null;
  voiceStepsClipboard: VoiceStepsClipboard | null;

  setCopiedPattern: (pattern: Pattern | null) => void;
  setCopiedSection: (section: any | null) => void;
  handleCopyPattern: (pattern: Pattern) => void;
  handleCopySongSection: (section: SongSection) => void;
  handlePasteSongSection: (destStartMeasure: number) => void;
  copyAllTrackPatterns: (trackId: number) => void;
  pasteAllTrackPatterns: (targetTrackId: number, modeOrApplyTimeline?: boolean | 'libraryOnly' | 'libraryAndTimeline') => void;
  copySelectedNotesRange: (rangeOverride?: SelectedStepRange | null) => void;
  pasteNotesOnlyStartingAt: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number) => void;
  copyVoiceStepsRange: (rangeOverride?: SelectedStepRange | null, trackIdOverride?: number, patternIdOverride?: number) => void;
  cutVoiceStepsRange: (rangeOverride?: SelectedStepRange | null, trackIdOverride?: number, patternIdOverride?: number) => void;
  pasteVoiceSteps: (targetTrackId: number, targetPatternId: number, startIsPreRoll: boolean, startStepIdx: number, notesOnly?: boolean) => void;
}
