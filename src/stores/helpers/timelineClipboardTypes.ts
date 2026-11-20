import { Pattern } from '../../types';

export interface TimelineClipboardEntry {
  trackId: number;
  relativeM: number;
  patternId: number | null;
  allowVariations?: boolean;
  overridePatternId?: number | null;
  sourceInstId?: string;
  sourcePattern?: Pattern | null;
  isToadaBusEntry?: boolean;
  puxPatternId?: number | null;
  coroPatternId?: number | null;
  puxSourcePattern?: Pattern | null;
  coroSourcePattern?: Pattern | null;
}

export interface TimelineClipboard {
  spanMeasures: number;
  entries: TimelineClipboardEntry[];
}
