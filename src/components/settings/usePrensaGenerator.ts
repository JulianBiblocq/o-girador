import { useState, useMemo, useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { generateTablatureCore, generateAnnexTablature } from '../../utils/exportTablature';

export function usePrensaGenerator(lang: string, letras: string, measureBpms?: number[]) {
  const tracks = useSequencerStore((state) => state.tracks);
  const totalMeasures = useSequencerStore((state) => state.totalMeasures);
  const songSections = useSequencerStore((state) => state.songSections);
  const measureTimeSigs = useSequencerStore((state) => state.measureTimeSigs);

  const validExportTracks = useMemo(() => {
    return tracks.filter((t) => {
      const conf = instrumentsConfig[t.instrumentIdx];
      return conf && conf.id !== 'apito' && conf.type !== 'voice' && !t.isBusFolder && !t.isLinkFolder;
    });
  }, [tracks]);

  const [selectedExportTracks, setSelectedExportTracks] = useState<Set<number>>(new Set());
  const [selectedAnnexTracks, setSelectedAnnexTracks] = useState<Set<number>>(new Set());
  const [liveText, setLiveText] = useState<string>('');

  useEffect(() => {
    if (validExportTracks.length > 0 && selectedExportTracks.size === 0) {
      setSelectedExportTracks(new Set(validExportTracks.map((t) => t.id)));
    }
  }, [validExportTracks]);

  const handleToggleAll = () => {
    if (validExportTracks.length === selectedExportTracks.size) {
      setSelectedExportTracks(new Set());
      setSelectedAnnexTracks(new Set());
    } else {
      setSelectedExportTracks(new Set(validExportTracks.map((t) => t.id)));
    }
  };

  const refreshPreviewText = () => {
    const tracksToExport = tracks.filter((t) => selectedExportTracks.has(t.id));
    const outputTxt = generateTablatureCore(
      tracksToExport,
      totalMeasures,
      songSections,
      measureTimeSigs,
      measureBpms || Array(totalMeasures).fill(83),
      false
    );
    const annexTxt = generateAnnexTablature(tracks, selectedAnnexTracks, false);
    let finalTxt = outputTxt;
    if (annexTxt) finalTxt += annexTxt;
    if (letras && letras.trim() !== '') {
      finalTxt += lang === 'fr' ? `\n--- VOIX / PAROLES ---\n${letras}\n` : `\n--- VOZES / LETRAS ---\n${letras}\n`;
    }
    finalTxt += lang === 'fr' ? `\n(Généré avec O Girador)\n` : `\n(Gerado com O Girador)\n`;
    setLiveText(finalTxt);
  };

  useEffect(() => {
    if (selectedExportTracks.size > 0 && !liveText) refreshPreviewText();
  }, [selectedExportTracks.size, liveText]);

  const handleToggleTrackExport = (trackId: number, checked: boolean) => {
    const newSet = new Set(selectedExportTracks);
    if (checked) {
      newSet.add(trackId);
    } else {
      newSet.delete(trackId);
      const newAnnex = new Set(selectedAnnexTracks);
      newAnnex.delete(trackId);
      setSelectedAnnexTracks(newAnnex);
    }
    setSelectedExportTracks(newSet);
  };

  const handleToggleTrackAnnex = (trackId: number, checked: boolean) => {
    const newSet = new Set(selectedAnnexTracks);
    if (checked) newSet.add(trackId);
    else newSet.delete(trackId);
    setSelectedAnnexTracks(newSet);
  };

  return {
    validExportTracks,
    selectedExportTracks,
    selectedAnnexTracks,
    liveText,
    setLiveText,
    handleToggleAll,
    refreshPreviewText,
    handleToggleTrackExport,
    handleToggleTrackAnnex,
  };
}
