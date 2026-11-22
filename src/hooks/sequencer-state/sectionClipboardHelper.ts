import { SongSection, TrackGroup } from '../../types';
import { copySongSectionData, pasteSongSectionState } from '../../stores/helpers/songSectionClipboardHelper';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { notifyToast } from '../../utils/toastHelper';

export interface SectionClipboardContext {
  pushUndoState: () => void;
  totalMeasuresRef: { current: number };
  setTotalMeasures: (updater: (prev: number) => number) => void;
  setTracks: (updater: (prev: TrackGroup[]) => TrackGroup[]) => void;
  setCopiedSection: (s: any) => void;
  handleCreateSongSection: (name: string, start: number, end: number, color?: string, repeatCount?: number, level?: number) => void;
}

export function handleCopySongSectionHelper(section: SongSection, ctx: SectionClipboardContext): void {
  const state = useSequencerStore.getState();
  const data = copySongSectionData(state.tracks, state.songSections, section, state);
  ctx.setCopiedSection(data);
}

export function handlePasteSongSectionHelper(destStartMeasure: number, ctx: SectionClipboardContext): void {
  const state = useSequencerStore.getState();
  const storeCopiedSection = state.copiedSection;
  if (!storeCopiedSection) return;

  const res = pasteSongSectionState(
    state,
    state.songSections,
    state.totalMeasures,
    storeCopiedSection,
    destStartMeasure,
    state.hasFullPlaybackAccess,
    state.maxMeasuresAllowed
  );

  if (res.error) {
    state.openSubscriptionModal?.(state.isUserTrialExpired ? 'trial_expired' : 'measures_limit');
    notifyToast(res.error, 'error');
    return;
  }

  ctx.pushUndoState();
  if (res.patch) {
    useSequencerStore.setState(res.patch as any);
    ctx.totalMeasuresRef.current = res.patch.totalMeasures;
    return;
  }

  const end = destStartMeasure + storeCopiedSection.length - 1;
  if (res.totalMeasures !== undefined) ctx.setTotalMeasures(() => res.totalMeasures!);
  ctx.setTracks(() => res.tracks);
  ctx.handleCreateSongSection(
    storeCopiedSection.name,
    destStartMeasure,
    end,
    storeCopiedSection.color,
    storeCopiedSection.repeatCount,
    storeCopiedSection.level
  );
}
