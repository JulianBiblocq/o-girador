import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import {
  buildRodaSheetMeasureItems,
  getDefaultSelectedRodaTrackIds,
  getEligibleRodaSheetTracks,
} from './rodaSheetDataBuilder';
import { printRodaSheetA4 } from './printRodaSheetA4';
import { RodaSheetPrintView } from './RodaSheetPrintView';
import { RodaSheetToolbar } from './RodaSheetToolbar';
import { RodaSheetDensity, RodaSheetSelectionMode } from './rodaSheetTypes';

interface RodaSheetContainerProps {
  lang: 'fr' | 'pt';
  onClose?: () => void;
}

export const RodaSheetContainer: React.FC<RodaSheetContainerProps> = ({ lang, onClose }) => {
  const isFr = lang === 'fr';
  const tracks = useSequencerStore((s) => s.tracks);
  const rodaTrackOrder = useSequencerStore((s) => s.rodaTrackOrder);
  const isFocusActive = useSequencerStore((s) => s.isFocusActive);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const referenceTrackId = useSequencerStore((s) => s.referenceTrackId);
  const totalMeasures = useSequencerStore((s) => s.totalMeasures);
  const currentMeasure = useSequencerStore((s) => s.currentMeasure);
  const timeSig = useSequencerStore((s) => s.timeSig);
  const measureTimeSigs = useSequencerStore((s) => s.measureTimeSigs);
  const songMarkers = useSequencerStore((s) => s.songMarkers);
  const songSections = useSequencerStore((s) => s.songSections);
  const metadata = useSequencerStore((s) => s.metadata);
  const bpm = useSequencerStore((s) => s.bpm);
  const isLeftHanded = useSequencerStore((s) => s.isLeftHanded);

  const eligibleTracks = useMemo(() => getEligibleRodaSheetTracks(tracks, rodaTrackOrder), [tracks, rodaTrackOrder]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(() =>
    new Set(getDefaultSelectedRodaTrackIds(eligibleTracks, isFocusActive, focusTrackId, referenceTrackId))
  );
  const [selectionMode, setSelectionMode] = useState<RodaSheetSelectionMode>('auto');
  const [customMeasures, setCustomMeasures] = useState<Set<number>>(() => new Set([currentMeasure]));
  const [hiddenCardKeys, setHiddenCardKeys] = useState<Set<string>>(() => new Set());
  const [density, setDensity] = useState<RodaSheetDensity>(8);

  const selectedTracksOrdered = useMemo(
    () => eligibleTracks.filter((e) => selectedTrackIds.has(e.track.id)),
    [eligibleTracks, selectedTrackIds]
  );

  const rawItems = useMemo(
    () =>
      buildRodaSheetMeasureItems({
        totalMeasures: totalMeasures || 1, selectedTracks: selectedTracksOrdered, allTracks: tracks,
        selectionMode, customMeasures: Array.from(customMeasures), defaultTimeSig: timeSig || '4/4',
        measureTimeSigs, songMarkers, songSections,
      }),
    [totalMeasures, selectedTracksOrdered, tracks, selectionMode, customMeasures, timeSig, measureTimeSigs, songMarkers, songSections]
  );

  const items = useMemo(
    () => rawItems.filter((it) => !hiddenCardKeys.has(it.key)),
    [rawItems, hiddenCardKeys]
  );

  const handleToggleTrack = (trackId: number) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) { if (next.size > 1) next.delete(trackId); }
      else next.add(trackId);
      return next;
    });
  };

  const handleToggleCustomMeasure = (mIdx: number) => {
    setCustomMeasures((prev) => {
      const next = new Set(prev);
      if (next.has(mIdx)) next.delete(mIdx); else next.add(mIdx);
      return next;
    });
  };

  const handleHideCard = (cardKey: string) => {
    setHiddenCardKeys((prev) => new Set(prev).add(cardKey));
  };

  const songTitle = metadata?.toada?.trim() || (isFr ? 'Partition O Girador' : 'Partitura O Girador');

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3 overflow-hidden">
      <RodaSheetToolbar
        lang={lang} eligibleTracks={eligibleTracks} selectedTrackIds={selectedTrackIds}
        onToggleTrack={handleToggleTrack} selectionMode={selectionMode} onChangeSelectionMode={setSelectionMode}
        totalMeasures={totalMeasures || 1} currentMeasure={currentMeasure} customMeasures={customMeasures}
        onToggleCustomMeasure={handleToggleCustomMeasure}
        onAddCurrentMeasure={() => setCustomMeasures((prev) => new Set(prev).add(currentMeasure))}
        onSelectAllMeasures={() => {
          setHiddenCardKeys(new Set());
          setCustomMeasures(new Set(Array.from({ length: totalMeasures || 1 }, (_, i) => i)));
        }}
        onClearMeasures={() => setCustomMeasures(new Set())}
        density={density} onChangeDensity={setDensity}
        hiddenCount={hiddenCardKeys.size}
        onRestoreHidden={() => setHiddenCardKeys(new Set())}
      />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar bg-[#262220]/30 p-2 sm:p-4 border-2 border-[var(--cordel-border)]">
        <RodaSheetPrintView
          items={items} selectedTracks={selectedTracksOrdered} density={density}
          songTitle={songTitle} ritmo={metadata?.ritmo} bpm={bpm || 90} isLeftHanded={isLeftHanded} lang={lang}
          onHideCard={handleHideCard}
        />
      </div>
      <div className="flex items-center justify-between gap-3 pt-1 shrink-0">
        {onClose ? (
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors font-bold cursor-pointer font-cactus">
            {isFr ? 'Fermer' : 'Fechar'}
          </button>
        ) : <div />}
        <button
          type="button" onClick={() => printRodaSheetA4(songTitle, density)}
          disabled={items.length === 0 || selectedTracksOrdered.length === 0}
          className="px-5 py-2 text-sm bg-[#8b2a1a] !text-[#f4ecd8] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] font-bold hover:brightness-110 transition-all cursor-pointer font-cactus flex items-center gap-2 disabled:opacity-50"
        >
          <Printer size={16} />
          <span>{isFr ? 'Imprimer / PDF la Planche de Rodas' : 'Imprimir / PDF a Prancha de Rodas'}</span>
        </button>
      </div>
    </div>
  );
};
