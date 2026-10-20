import { useState } from 'react';
import type { InstrumentConfig } from '../../types';
import { useSequencer } from '../../contexts/SequencerContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { getActiveStrokesForTrack, audioEngine } from '../../hooks/useAudioSync';

interface UseStepEditorActionProps {
  trackId: number | null;
  patternId: number | null;
  stepIdx: number | null;
  isSplitMode: boolean;
  liveCurrentVal: string | number | (string | number)[];
  editingHalf: 0 | 1;
  setEditingHalf: (half: 0 | 1) => void;
  closeEditor: () => void;
  inst: InstrumentConfig | null;
  setIsExpanded: (exp: boolean) => void;
}

export function useStepEditorAction({
  trackId,
  patternId,
  stepIdx,
  isSplitMode,
  liveCurrentVal,
  editingHalf,
  setEditingHalf,
  closeEditor,
  inst,
  setIsExpanded,
}: UseStepEditorActionProps) {
  const sequencer = useSequencer();
  const tracks = useSequencerStore(state => state.tracks);
  const track = tracks.find(t => t.id === trackId);
  const forcedStrokes = useSequencerSettingsStore(state => state.forcedStrokes) || {};
  const setStrokeForcedState = useSequencerSettingsStore(state => state.setStrokeForcedState);
  const activeStrokesForTrack = track ? getActiveStrokesForTrack(track, tracks) : [];
  const [loadingStroke, setLoadingStroke] = useState<string | null>(null);

  const handleSelectStroke = async (stroke: string | number) => {
    if (trackId === null || patternId === null || stepIdx === null) return;
    if (stroke === 0 || stroke === '0') {
      if (isSplitMode) {
        const newVal = [...(Array.isArray(liveCurrentVal) ? liveCurrentVal : [liveCurrentVal, liveCurrentVal])];
        newVal[editingHalf] = '0';
        if (newVal[0] === '0' && newVal[1] === '0') {
          sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, '0');
          closeEditor();
        } else {
          sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, newVal as any);
        }
      } else {
        sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, '0');
        closeEditor();
      }
      return;
    }

    const strokeStr = String(stroke);
    const isLoaded = inst && audioEngine ? audioEngine.isStrokeLoaded(inst.id, strokeStr) : true;
    const forced = forcedStrokes[`${trackId}:${strokeStr}`];
    const isActive = forced !== undefined ? forced : activeStrokesForTrack.some(s => s.toLowerCase() === strokeStr.toLowerCase());

    if (!isLoaded && inst && audioEngine) {
      setLoadingStroke(strokeStr);
      try {
        await audioEngine.loadStrokeSamples(inst.id, strokeStr);
        setStrokeForcedState(`${trackId}:${strokeStr}`, true);
      } catch (err) {
        console.error("Failed to load stroke sample:", err);
      } finally {
        setLoadingStroke(null);
      }
    } else if (!isActive) {
      setStrokeForcedState(`${trackId}:${strokeStr}`, true);
    }

    if (isSplitMode) {
      const newVal = Array.isArray(liveCurrentVal) ? [...liveCurrentVal] : [liveCurrentVal || strokeStr, strokeStr];
      newVal[editingHalf] = strokeStr;
      sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, newVal as any);
      if (editingHalf === 0) setEditingHalf(1);
      else closeEditor();
    } else {
      sequencer.handleTrackStepValueChange(trackId, patternId, stepIdx, strokeStr);
      if (!isActive) setIsExpanded(false);
      else closeEditor();
    }
  };

  return { loadingStroke, setLoadingStroke, handleSelectStroke, forcedStrokes, activeStrokesForTrack };
}
