import React from 'react';
import { Language } from '../../types';

export interface TimelineQuickSectionPopoverProps {
  quickSectionRange: { start: number; end: number } | null;
  quickSectionName: string; quickSectionColor: string; quickSectionLevel: number;
  totalMeasures: number; measureLeftPositions: number[]; measureWidth: number; lang: Language;
  onClose: () => void; onNameChange: (val: string) => void; onColorChange: (val: string) => void; onLevelChange: (val: number) => void;
  onRangeChange: React.Dispatch<React.SetStateAction<{ start: number; end: number } | null>>;
  onCreate: () => void; onLoadCloudSection?: (insertAtMeasure: number) => void;
}

const CORDEL_COLORS = ['#e08283', '#f19066', '#f5cd79', '#55efc4', '#74b9ff', '#a29bfe', '#eaddcf'];

export const TimelineQuickSectionPopover = React.memo<TimelineQuickSectionPopoverProps>(({
  quickSectionRange, quickSectionName, quickSectionColor, quickSectionLevel,
  totalMeasures, measureLeftPositions, measureWidth, lang, onClose, onNameChange,
  onColorChange, onLevelChange, onRangeChange, onCreate, onLoadCloudSection,
}) => {
  if (!quickSectionRange) return null;
  const maxLimit = Math.max(64, totalMeasures);
  const duration = quickSectionRange.end - quickSectionRange.start + 1;
  const posX = (measureLeftPositions[quickSectionRange.start] ?? (quickSectionRange.start * measureWidth)) + 4;

  return (
    <div
      className="absolute z-[85] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col gap-2 rounded-sm"
      style={{ left: `${posX}px`, top: '100%', marginTop: '4px', width: '260px' }}
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-[var(--cordel-border)]/20 pb-1">
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
          {lang === 'fr' ? `NOUVELLE SECTION (M. ${quickSectionRange.start + 1} - ${quickSectionRange.end + 1})` : `NOVA SEÇÃO (C. ${quickSectionRange.start + 1} - ${quickSectionRange.end + 1})`}
        </span>
        <button type="button" className="text-xs hover:text-red-500 font-bold cursor-pointer" onClick={onClose}></button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Nom' : 'Nome'}</label>
        <input
          type="text" value={quickSectionName} onChange={(e) => onNameChange(e.target.value)}
          placeholder={lang === 'fr' ? 'ex: Couplet' : 'ex: Verso'} autoFocus
          className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1 text-xs font-bold outline-none text-[var(--cordel-text)] focus:bg-[var(--cordel-border)]/10"
          onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); if (e.key === 'Escape') onClose(); }}
        />
      </div>

      <div className="flex flex-col gap-1.5 p-2 bg-[var(--cordel-border)]/10 rounded cordel-border-sm">
        <div className="flex gap-2">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[8px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Début' : 'Início'}</label>
            <input
              type="number" min={1} max={quickSectionRange.end + 1} value={quickSectionRange.start + 1}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) { const s = Math.max(0, Math.min(maxLimit - 1, val - 1)); onRangeChange(p => p ? ({ ...p, start: s, end: Math.max(s, p.end) }) : null); }
              }}
              className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-1 py-0.5 text-xs font-bold outline-none text-[var(--cordel-text)] text-center"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[8px] font-bold uppercase opacity-75">{lang === 'fr' ? 'Fin' : 'Fim'}</label>
            <input
              type="number" min={quickSectionRange.start + 1} max={maxLimit} value={quickSectionRange.end + 1}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) { const ed = Math.max(0, Math.min(maxLimit - 1, val - 1)); onRangeChange(p => p ? ({ ...p, end: ed, start: Math.min(ed, p.start) }) : null); }
              }}
              className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-1 py-0.5 text-xs font-bold outline-none text-[var(--cordel-text)] text-center"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[var(--cordel-border)]/20">
          <span className="text-[8px] font-bold text-[var(--cordel-text)] opacity-90">{lang === 'fr' ? `Durée : ${duration} mes.` : `Duração: ${duration} comp.`}</span>
          <div className="flex gap-1">
            {[2, 4, 8].map(m => (
              <button
                key={m} type="button" onClick={() => onRangeChange(prev => prev ? ({ ...prev, end: Math.min(maxLimit - 1, prev.start + m - 1) }) : null)}
                className="px-1.5 py-0.5 text-[8px] font-bold bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] border border-[var(--cordel-border)] rounded-sm transition-colors cursor-pointer"
              >[ {m} m. ]</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-bold uppercase opacity-75">{lang === 'fr' ? "Niveau d'imbrication" : 'Nível de aninhamento'}</label>
        <select
          value={quickSectionLevel} onChange={(e) => onLevelChange(parseInt(e.target.value, 10))}
          className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] p-1 text-[10px] font-bold text-[var(--cordel-text)] outline-none cursor-pointer"
        >
          {([[0, '0'], [1, '1'], [2, '2']] as const).map(([lvl, n]) => (
            <option key={lvl} value={lvl}>{lang === 'fr' ? `Niveau ${n}` : `Nível ${n}`}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1.5 justify-center py-1">
        {CORDEL_COLORS.map(color => (
          <button
            key={color} type="button" onClick={() => onColorChange(color)}
            className={`w-4.5 h-4.5 rounded-full cursor-pointer border border-black/35 transition-transform ${quickSectionColor === color ? 'scale-120 ring-1 ring-[var(--cordel-text)]' : 'hover:scale-110'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1 mt-1">
        <button type="button" onClick={onCreate} className="w-full bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold text-[10px] py-1.5 rounded cordel-border-sm hover:opacity-95 cursor-pointer text-center">{lang === 'fr' ? 'Créer la section' : 'Criar seção'}</button>
        {onLoadCloudSection && (
          <button type="button" onClick={() => { onLoadCloudSection(quickSectionRange.start); onClose(); }} className="w-full bg-emerald-600 text-white font-bold text-[10px] py-1.5 rounded cordel-border-sm hover:bg-emerald-700 cursor-pointer text-center">{lang === 'fr' ? 'Insérer section enregistrée' : 'Inserir seção gravada'}</button>
        )}
      </div>
    </div>
  );
});
