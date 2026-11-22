import React, { useState, useMemo } from 'react';
import { Plus, ArrowUpDown, Link2 } from 'lucide-react';
import { useSequencerStore, selectTracksHierarchyMeta } from '../../stores/useSequencerStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { isSlaveTrack } from '../../utils/trackMasterResolver';
import { InstrumentAddPickerPopover } from '../instrument-editor/InstrumentAddPickerPopover';
import { TrackFocusSplitButton } from './TrackFocusSplitButton';

interface MixerHeaderProps {
  t: (key: string) => string;
  noBorder?: boolean;
  isRodaColumn?: boolean;
  className?: string;
}

export const MixerHeader: React.FC<MixerHeaderProps> = ({ t, noBorder = false, isRodaColumn = false, className = '' }) => {
  const sequencer = useSequencer();
  const isPracticeMode = useSequencerStore((s) => s.isPracticeMode);
  const handleReverseRodaTracks = useSequencerStore((s) => s.handleReverseRodaTracks);
  const showLinkedTracksOnRoda = useSequencerStore((s) => s.showLinkedTracksOnRoda);
  const toggleShowLinkedTracksOnRoda = useSequencerStore((s) => s.toggleShowLinkedTracksOnRoda);
  const tracksMeta = useSequencerStore(selectTracksHierarchyMeta);
  const lang = useSequencerStore((s) => s.lang);
  const [addAnchorRect, setAddAnchorRect] = useState<DOMRect | null>(null);

  const slaveCount = useMemo(
    () => tracksMeta.filter((m) => isSlaveTrack(m as any, tracksMeta as any)).length,
    [tracksMeta]
  );

  return (
    <div className={`${noBorder ? '' : 'border-b border-[var(--cordel-border)] pb-2 mb-2'} shrink-0 w-full flex items-center gap-1.5 relative z-50 overflow-visible ${className}`}>
      {!isPracticeMode && (
        <div className="relative shrink-0">
          <button
            type="button"
            data-add-instrument-trigger="true"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setAddAnchorRect((prev) => (prev ? null : rect));
            }}
            className={`w-9 h-9 min-w-9 min-h-9 cordel-border cordel-button flex items-center justify-center transition-colors cursor-pointer ${
              addAnchorRect
                ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)]'
            }`}
            title={t('addInst')}
          >
            <Plus className="w-4 h-4" />
          </button>
          {addAnchorRect && (
            <InstrumentAddPickerPopover
              anchorRect={addAnchorRect}
              onSelectInstrument={(idx) => {
                sequencer.handleAddTrackInstrument(idx, useSequencerStore.getState().currentMeasure);
              }}
              onClose={() => setAddAnchorRect(null)}
            />
          )}
        </div>
      )}

      <TrackFocusSplitButton />

      {isRodaColumn && (
        <button
          type="button"
          data-testid="roda-toggle-linked-slaves-btn"
          onClick={toggleShowLinkedTracksOnRoda}
          className={`h-9 px-2 cordel-border cordel-button flex items-center gap-1 text-[10px] font-cactus font-bold transition-all cursor-pointer shrink-0 ${
            showLinkedTracksOnRoda
              ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
              : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:opacity-85'
          }`}
          title={
            lang === 'pt'
              ? (showLinkedTracksOnRoda ? 'Ocultar faixas ligadas na Roda' : 'Mostrar faixas ligadas na Roda')
              : (showLinkedTracksOnRoda ? 'Masquer les pistes liées sur la Roda' : 'Afficher les pistes liées sur la Roda')
          }
        >
          <Link2 size={12} className="shrink-0" />
          <span>{lang === 'pt' ? 'Ligados' : 'Liés'}{slaveCount > 0 ? ` (${slaveCount})` : ''}</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => handleReverseRodaTracks()}
        className="w-9 h-9 min-w-9 min-h-9 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border cordel-button flex items-center justify-center transition-all cursor-pointer hover:opacity-80 shrink-0"
        title={lang === 'pt' ? 'Inverter ordem das pistas (Topo ↔ Base / Exterior ↔ Centro)' : "Inverser l'ordre des pistes (Haut ↔ Bas / Extérieur ↔ Centre)"}
      >
        <ArrowUpDown size={14} />
      </button>
    </div>
  );
};
