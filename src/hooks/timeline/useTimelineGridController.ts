import { useState, useMemo, RefObject } from 'react';
import { SongSection, SongMarker, Language, TimeSignature } from '../../types';
import { computeTimelinePositions } from '../../utils/timeline/timelineMeasureWidths';
import { getExpandedMeasures } from '../../utils/measureHelpers';
import { useTimelineViewport } from './useTimelineViewport';
import { useTimelinePinchPan } from './useTimelinePinchPan';
import { useTimelineScrubbing } from './useTimelineScrubbing';
import { useTimelineSectionInteractions } from './useTimelineSectionInteractions';
import { useTimelineSectionStretch } from './useTimelineSectionStretch';
import { useTimelineMarkerInteractions } from './useTimelineMarkerInteractions';

export interface UseTimelineGridControllerParams {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;
  measureWidth: number;
  totalMeasures: number;
  onMeasureWidthChange: (w: number) => void;
  isMobile: boolean;
  isPlaying: boolean;
  isActive: boolean;
  timeSig: TimeSignature;
  measureTimeSigs: Record<number, TimeSignature>;
  songSections: SongSection[];
  copiedSection: SongSection | null;
  lang: Language;
  seekToMeasure?: (m: number, s?: number) => void;
  handleTimelineNavigate?: (m: number, s: number, max: number) => void;
  handleStop?: () => void;
  onCreateSection: (name: string, start: number, end: number, color: string, repeat: number, level: number) => void;
  onUpdateSection: (id: string, name: string, start: number, end: number, color: string, level: number) => void;
  onPasteSection: (idx: number) => void;
  onUpdateMarker: (id: string, name: string, measure: number, color?: string) => void;
  clearTimelineSelection: () => void;
  clearAutomationSelection: () => void;
  isMultiSelectMode: boolean;
}

export function useTimelineGridController(p: UseTimelineGridControllerParams) {
  const HEADER_W = p.isMobile ? 80 : 200, MEASURE_W = p.measureWidth;
  const isMacro = MEASURE_W <= 240, isMinZoom = MEASURE_W <= 120;
  const [toolMode] = useState<'cursor' | 'hand'>('cursor');
  const [snapMode, setSnapMode] = useState<'measure' | 'beat' | 'none'>('measure');

  const expanded = useMemo(() => getExpandedMeasures(p.totalMeasures, p.songSections), [p.totalMeasures, p.songSections]);
  const measureLabelsMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let m = 0; m < p.totalMeasures; m++) {
      const g: number[] = [];
      expanded.forEach((item, expIdx) => { if (item.baseMeasure === m) g.push(expIdx + 1); });
      map.set(m, `${p.lang === 'fr' ? 'M.' : 'C.'}${g.length === 0 ? m + 1 : g.join('.')}`);
    }
    return map;
  }, [expanded, p.totalMeasures, p.lang]);

  const { widths, leftPositions, totalContentW } = useMemo(
    () => computeTimelinePositions(p.totalMeasures, MEASURE_W, p.measureTimeSigs, p.timeSig),
    [p.totalMeasures, MEASURE_W, p.measureTimeSigs, p.timeSig]
  );

  const { visibleRange } = useTimelineViewport({ totalMeasures: p.totalMeasures, measureWidth: MEASURE_W, headerWidth: HEADER_W, scrollRef: p.scrollRef, isPlaying: p.isPlaying, isActive: p.isActive });
  const pinchPan = useTimelinePinchPan({
    containerRef: p.containerRef, scrollRef: p.scrollRef, gridRef: p.gridRef, measureWidth: MEASURE_W, headerWidth: HEADER_W,
    totalMeasures: p.totalMeasures, isPlaying: p.isPlaying, onMeasureWidthChange: p.onMeasureWidthChange, toolMode, isSpacePressed: false,
    isMultiSelectMode: p.isMultiSelectMode, clearTimelineSelection: p.clearTimelineSelection, clearAutomationSelection: p.clearAutomationSelection,
  });

  const scrubbing = useTimelineScrubbing({
    scrollRef: p.scrollRef, headerWidth: HEADER_W, measureWidth: MEASURE_W, measureWidths: widths, measureLeftPositions: leftPositions,
    totalMeasures: p.totalMeasures, expanded, isPlaying: p.isPlaying, seekToMeasure: p.seekToMeasure, handleTimelineNavigate: p.handleTimelineNavigate,
  });

  const sectionInteractions = useTimelineSectionInteractions({
    totalMeasures: p.totalMeasures, measureWidth: MEASURE_W, songSections: p.songSections, snapMode, headerWidth: HEADER_W,
    lang: p.lang, copiedSection: p.copiedSection, onPasteSection: p.onPasteSection, onCreateSection: p.onCreateSection, onUpdateSection: p.onUpdateSection, toolMode, isSpacePressed: false,
  });

  const sectionStretch = useTimelineSectionStretch({ measureWidth: MEASURE_W, measureWidths: widths, measureLeftPositions: leftPositions, isPlaying: p.isPlaying, handleStop: p.handleStop || (() => {}) });
  const markerInteractions = useTimelineMarkerInteractions({
    totalMeasures: p.totalMeasures, measureWidth: MEASURE_W, measureWidths: widths, measureLeftPositions: leftPositions,
    headerWidth: HEADER_W, snapMode, setSnapGuideX: sectionInteractions.setSnapGuideX, onUpdateMarker: p.onUpdateMarker, toolMode, isSpacePressed: false,
  });

  return {
    HEADER_W, MEASURE_W, isMacro, isMinZoom, snapMode, setSnapMode, expanded, measureLabelsMap,
    widths, leftPositions, totalContentW, visibleRange, pinchPan, scrubbing, sectionInteractions,
    sectionStretch, markerInteractions,
  };
}
