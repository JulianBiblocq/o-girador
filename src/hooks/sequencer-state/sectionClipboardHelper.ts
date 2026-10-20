import { TrackGroup, Pattern, SongSection } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface SectionClipboardContext {
  pushUndoState: () => void;
  totalMeasuresRef: { current: number };
  setTotalMeasures: (updater: (prev: number) => number) => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
  setCopiedSection: (s: any) => void;
  handleCreateSongSection: (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => void;
}

export function handleCopySongSectionHelper(section: SongSection, ctx: SectionClipboardContext): void {
  const length = section.endMeasure - section.startMeasure + 1;
  const assignments: { [trackId: number]: (number | null)[] } = {};
  useSequencerStore.getState().tracks.forEach((t: TrackGroup) => {
    const arr: (number | null)[] = [];
    for (let m = section.startMeasure; m <= section.endMeasure; m++) {
      const assignedPattern = t.patterns.find((p: Pattern) => p.measureAssignments[m]);
      arr.push(assignedPattern ? assignedPattern.id : null);
    }
    assignments[t.id] = arr;
  });
  const songSections = useSequencerStore.getState().songSections;
  const subSections = songSections.filter((s: SongSection) => s.id !== section.id && (s.level || 0) < (section.level || 0) && s.startMeasure >= section.startMeasure && s.endMeasure <= section.endMeasure).map((s: SongSection) => ({ ...s, startMeasure: s.startMeasure - section.startMeasure, endMeasure: s.endMeasure - section.startMeasure }));
  ctx.setCopiedSection({ length, name: section.name, color: section.color || '#27ae60', repeatCount: section.repeatCount || 1, level: section.level || 0, assignments, subSections });
}

export function handlePasteSongSectionHelper(destStartMeasure: number, ctx: SectionClipboardContext): void {
  const storeCopiedSection = useSequencerStore.getState().copiedSection;
  if (!storeCopiedSection) return;
  ctx.pushUndoState();
  const len = storeCopiedSection.length;
  const end = destStartMeasure + len - 1;
  if (end >= ctx.totalMeasuresRef.current) ctx.setTotalMeasures((prev: number) => Math.max(prev, end + 1));

  ctx.setTracks((prev: TrackGroup[]) => prev.map((t: TrackGroup) => {
    const copiedArr = storeCopiedSection.assignments[t.id];
    if (!copiedArr) return t;
    return {
      ...t, patterns: t.patterns.map((p: Pattern) => {
        const assign = [...p.measureAssignments];
        while (assign.length <= end) assign.push(false);
        for (let i = 0; i < len; i++) assign[destStartMeasure + i] = p.id === copiedArr[i];
        return { ...p, measureAssignments: assign };
      })
    };
  }));
  ctx.handleCreateSongSection(storeCopiedSection.name, destStartMeasure, end, storeCopiedSection.color, storeCopiedSection.repeatCount, storeCopiedSection.level);
}
