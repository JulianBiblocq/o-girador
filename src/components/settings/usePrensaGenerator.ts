import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { generateTablatureCore, generateAnnexTablature } from '../../utils/exportTablature';

const DEFAULT_A4_WIDTH_PX = 786;
const SHEET_PADDING_PX = 48;

export function usePrensaGenerator(
  lang: string,
  letras: string,
  measureBpms?: number[],
  bodyFontSize: number = 13,
  containerWidthPx: number = DEFAULT_A4_WIDTH_PX
) {
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
  const [liveText, setLiveTextState] = useState<string>('');
  const [isManuallyEdited, setIsManuallyEdited] = useState<boolean>(false);

  const maxCharsPerLine = useMemo(() => {
    const safeWidth = containerWidthPx > 250 ? containerWidthPx : DEFAULT_A4_WIDTH_PX;
    const usablePx = Math.max(240, safeWidth - SHEET_PADDING_PX);
    return Math.max(45, Math.floor(usablePx / (bodyFontSize * 0.61)));
  }, [containerWidthPx, bodyFontSize]);

  useEffect(() => {
    if (validExportTracks.length > 0 && selectedExportTracks.size === 0) {
      setSelectedExportTracks(new Set(validExportTracks.map((t) => t.id)));
    }
  }, [validExportTracks, selectedExportTracks.size]);

  const buildTablatureText = useCallback(() => {
    const tracksToExport = tracks.filter((t) => selectedExportTracks.has(t.id));
    const outputTxt = generateTablatureCore(
      tracksToExport,
      totalMeasures,
      songSections,
      measureTimeSigs,
      measureBpms || Array(totalMeasures).fill(83),
      false,
      maxCharsPerLine
    );
    const annexTxt = generateAnnexTablature(tracks, selectedAnnexTracks, false);
    let finalTxt = outputTxt;
    if (annexTxt) finalTxt += annexTxt;
    if (letras && letras.trim() !== '') {
      finalTxt += lang === 'fr' ? `\n--- VOIX / PAROLES ---\n${letras}\n` : `\n--- VOZES / LETRAS ---\n${letras}\n`;
    }
    finalTxt += lang === 'fr' ? `\n(Généré avec O Girador)\n` : `\n(Gerado com O Girador)\n`;
    return finalTxt;
  }, [tracks, selectedExportTracks, selectedAnnexTracks, totalMeasures, songSections, measureTimeSigs, measureBpms, maxCharsPerLine, letras, lang]);

  const refreshPreviewText = useCallback(() => {
    setIsManuallyEdited(false);
    setLiveTextState(buildTablatureText());
  }, [buildTablatureText]);

  useEffect(() => {
    if (selectedExportTracks.size > 0 && !isManuallyEdited) {
      setLiveTextState(buildTablatureText());
    }
  }, [selectedExportTracks.size, isManuallyEdited, buildTablatureText]);

  const setLiveText = (val: string) => {
    setIsManuallyEdited(true);
    setLiveTextState(val);
  };

  const handleToggleAll = () => {
    setIsManuallyEdited(false);
    if (validExportTracks.length === selectedExportTracks.size) {
      setSelectedExportTracks(new Set());
      setSelectedAnnexTracks(new Set());
    } else {
      setSelectedExportTracks(new Set(validExportTracks.map((t) => t.id)));
    }
  };

  const handleToggleTrackExport = (trackId: number, checked: boolean) => {
    setIsManuallyEdited(false);
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
    setIsManuallyEdited(false);
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
