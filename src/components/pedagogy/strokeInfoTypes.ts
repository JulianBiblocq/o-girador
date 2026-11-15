export interface StrokeInfoCardItem {
  badgeSymbol: string;
  badgeBg: string;
  badgeTxt: string;
  title: string;
  description: string;
  semanticStroke: string;
  roleTag?: string;
  vocalNote?: string;
  vocalSyllable?: string;
  previewTrackId: number;
  previewInstId: string;
  previewTuning: number;
  isVoice: boolean;
  targetTrackId: number;
  targetPatternId?: number;
  targetStepIdx: number;
  targetSubIndex?: 0 | 1;
}

export interface StrokeInfoPopoverTarget {
  anchorX: number;
  anchorY: number;
  trackId: number;
  patternId?: number;
  measureIdx: number;
  stepIdx: number;
  subIndex?: 0 | 1;
  instrumentName: string;
  instId: string;
  cards: StrokeInfoCardItem[];
}
