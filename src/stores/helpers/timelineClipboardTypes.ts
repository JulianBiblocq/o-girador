export interface TimelineClipboardEntry {
  trackId: number;
  relativeM: number;
  patternId: number | null;
  allowVariations?: boolean;
  overridePatternId?: number | null;
}

export interface TimelineClipboard {
  spanMeasures: number;
  entries: TimelineClipboardEntry[];
}
