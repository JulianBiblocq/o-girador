
import { useState, useCallback } from 'react';
import { instrumentsConfig } from '../data';
import { useSequencerStore } from '../stores/useSequencerStore';
import { exportTablatureFile, printTablature, printLegendOnly } from '../utils/exportTablature';

interface UseAppExportTablatureParams {
  sequencer: any;
}

export function useAppExportTablature({ sequencer }: UseAppExportTablatureParams) {
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [selectedExportTracks, setSelectedExportTracks] = useState<Set<number>>(new Set());
  const [selectedAnnexTracks, setSelectedAnnexTracks] = useState<Set<number>>(new Set());

  const handleExportTablature = useCallback(() => {
    const tracks = useSequencerStore.getState().tracks;
    const validTrackIds = tracks
      .filter(t => instrumentsConfig[t.instrumentIdx]?.id !== 'apito' && instrumentsConfig[t.instrumentIdx]?.type !== 'voice')
      .map(t => t.id);

    setSelectedExportTracks(new Set(validTrackIds));
    setSelectedAnnexTracks(new Set());
    setShowExportMenu(true);
  }, []);

  const executeExport = useCallback((wantsPrint: boolean) => {
    setShowExportMenu(false);
    const state = useSequencerStore.getState();
    const tracksToExport = state.tracks.filter(t => selectedExportTracks.has(t.id));

    if (wantsPrint) {
      printTablature(
        tracksToExport,
        selectedAnnexTracks,
        state.totalMeasures,
        state.songSections,
        sequencer.metadata,
        state.measureTimeSigs,
        sequencer.measureBpms,
        sequencer.letras
      );
    } else {
      exportTablatureFile(
        tracksToExport,
        selectedAnnexTracks,
        state.totalMeasures,
        state.songSections,
        sequencer.metadata,
        state.measureTimeSigs,
        sequencer.measureBpms,
        sequencer.letras
      );
    }
  }, [selectedExportTracks, selectedAnnexTracks, sequencer]);

  return {
    showExportMenu,
    setShowExportMenu,
    selectedExportTracks,
    setSelectedExportTracks,
    selectedAnnexTracks,
    setSelectedAnnexTracks,
    handleExportTablature,
    executeExport,
    printLegendOnly,
  };
}
