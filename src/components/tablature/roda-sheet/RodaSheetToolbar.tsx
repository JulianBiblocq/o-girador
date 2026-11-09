import React from 'react';
import { RodaSheetDensity, RodaSheetSelectionMode, RodaSheetTrackInfo } from './rodaSheetTypes';

interface RodaSheetToolbarProps {
  lang: 'fr' | 'pt';
  eligibleTracks: RodaSheetTrackInfo[];
  selectedTrackIds: Set<number>;
  onToggleTrack: (trackId: number) => void;
  selectionMode: RodaSheetSelectionMode;
  onChangeSelectionMode: (mode: RodaSheetSelectionMode) => void;
  totalMeasures: number;
  currentMeasure: number;
  customMeasures: Set<number>;
  onToggleCustomMeasure: (mIdx: number) => void;
  onAddCurrentMeasure: () => void;
  onSelectAllMeasures: () => void;
  onClearMeasures: () => void;
  density: RodaSheetDensity;
  onChangeDensity: (d: RodaSheetDensity) => void;
  hiddenCount?: number;
  onRestoreHidden?: () => void;
}

export const RodaSheetToolbar: React.FC<RodaSheetToolbarProps> = ({
  lang, eligibleTracks, selectedTrackIds, onToggleTrack, selectionMode, onChangeSelectionMode,
  totalMeasures, currentMeasure, customMeasures, onToggleCustomMeasure,
  onAddCurrentMeasure, onSelectAllMeasures, onClearMeasures, density, onChangeDensity,
  hiddenCount = 0, onRestoreHidden,
}) => {
  const isFr = lang === 'fr';

  return (
    <div className="print:hidden flex flex-col gap-2.5 p-3 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] text-[var(--cordel-text)] text-xs select-none shrink-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-cactus font-bold uppercase text-[10px] tracking-wider opacity-80 mr-1">
          {isFr ? '1. Instruments :' : '1. Instrumentos :'}
        </span>
        {eligibleTracks.map((info) => {
          const isChecked = selectedTrackIds.has(info.track.id);
          return (
            <button
              key={info.track.id} type="button" onClick={() => onToggleTrack(info.track.id)}
              className={`px-2 py-1 border-2 font-cactus font-bold text-[10px] flex items-center gap-1.5 transition-all cursor-pointer ${
                isChecked
                  ? 'bg-white text-[#1a1a1a] border-[#1a1a1a] shadow-[1.5px_1.5px_0px_#1a1a1a]'
                  : 'bg-black/10 text-[var(--cordel-text)]/55 border-[var(--cordel-border)]/40 opacity-65'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-white shrink-0 inline-block" style={{ border: `2.5px solid ${info.color}`, boxShadow: '0 0 0 1px #1a1a1a' }} />
              <span>{isChecked ? '✓ ' : ''}{info.displayIndex}. {info.displayName}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[var(--cordel-border)]/30">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-cactus font-bold uppercase text-[10px] tracking-wider opacity-80 mr-1">
            {isFr ? '2. Mesures :' : '2. Compassos :'}
          </span>
          <button
            type="button" onClick={() => onChangeSelectionMode('auto')}
            className={`px-2.5 py-1 border-2 font-cactus font-bold text-[10px] uppercase cursor-pointer ${
              selectionMode === 'auto' ? 'bg-[#8b2a1a] !text-[#f4ecd8] border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? 'Mesures uniques (Auto)' : 'Compassos únicos (Auto)'}
          </button>
          <button
            type="button" onClick={() => onChangeSelectionMode('custom')}
            className={`px-2.5 py-1 border-2 font-cactus font-bold text-[10px] uppercase cursor-pointer ${
              selectionMode === 'custom' ? 'bg-[#8b2a1a] !text-[#f4ecd8] border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? 'Panier à la carte' : 'Cesta sob medida'} ({customMeasures.size})
          </button>
          {hiddenCount > 0 && onRestoreHidden && (
            <button
              type="button" onClick={onRestoreHidden}
              className="px-2.5 py-1 border-2 border-[#1a1a1a] bg-[#f4ecd8] hover:bg-[#1a1a1a] text-[#8b2a1a] hover:!text-[#f4ecd8] font-cactus font-bold text-[10px] uppercase cursor-pointer shadow-[1px_1px_0px_#1a1a1a] transition-colors"
            >
              {isFr ? `[ Réafficher les ${hiddenCount} roue(s) masquée(s) ]` : `[ Reexibir ${hiddenCount} roda(s) oculta(s) ]`}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-cactus font-bold uppercase text-[10px] tracking-wider opacity-80 mr-1">
            {isFr ? '3. Format A4 :' : '3. Formato A4 :'}
          </span>
          <button
            type="button" onClick={() => onChangeDensity(8)}
            className={`px-2 py-1 border-2 font-cactus font-bold text-[10px] cursor-pointer ${
              density === 8 ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? '8 roues / page (2×4)' : '8 rodas / pág. (2×4)'}
          </button>
          <button
            type="button" onClick={() => onChangeDensity(12)}
            className={`px-2 py-1 border-2 font-cactus font-bold text-[10px] cursor-pointer ${
              density === 12 ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]'
            }`}
          >
            {isFr ? '12 roues / page (3×4)' : '12 rodas / pág. (3×4)'}
          </button>
        </div>
      </div>

      {selectionMode === 'custom' && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-dashed border-[var(--cordel-border)]/40">
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={onAddCurrentMeasure} className="px-2 py-0.5 bg-[#8b2a1a] !text-[#f4ecd8] border border-[#1a1a1a] font-cactus font-bold text-[10px] cursor-pointer">
              + {isFr ? `Mesure actuelle (M.${currentMeasure + 1})` : `Compasso atual (M.${currentMeasure + 1})`}
            </button>
            <button type="button" onClick={onSelectAllMeasures} className="px-2 py-0.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] cursor-pointer">
              {isFr ? 'Tout' : 'Tudo'}
            </button>
            <button type="button" onClick={onClearMeasures} className="px-2 py-0.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-cactus font-bold text-[10px] cursor-pointer">
              {isFr ? 'Vider' : 'Limpar'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
            {Array.from({ length: totalMeasures }).map((_, mIdx) => (
              <button
                key={mIdx} type="button" onClick={() => onToggleCustomMeasure(mIdx)}
                className={`min-w-[34px] px-1.5 py-0.5 border font-mono font-bold text-[10px] cursor-pointer ${
                  customMeasures.has(mIdx) ? 'bg-[#1a1a1a] text-[#f4ecd8] border-[#1a1a1a]' : 'bg-white text-[#1a1a1a] border-[#1a1a1a]/40 hover:border-[#1a1a1a]'
                }`}
              >
                M.{mIdx + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
