/**
 * ToadaImportModal.tsx
 * Modale Cordel pour choisir la mesure de départ lors de l'import d'une Toada.
 * Respect strict de l'architecture anti-monolithe (< 150 lignes).
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Music, ArrowRight, Download, X } from 'lucide-react';

interface ToadaImportModalProps {
  isOpen: boolean;
  toadaTitle: string;
  patternsCount: number;
  totalMeasures: number;
  onConfirm: (startMeasureIdx: number | null) => void;
  onClose: () => void;
  lang?: 'fr' | 'pt';
}

export const ToadaImportModal: React.FC<ToadaImportModalProps> = ({
  isOpen,
  toadaTitle,
  patternsCount,
  totalMeasures,
  onConfirm,
  onClose,
  lang = 'fr',
}) => {
  const [startMeasure, setStartMeasure] = useState<number>(1);

  if (!isOpen) return null;

  const maxMeasure = Math.max(totalMeasures + 1, 1);

  const handleMeasureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setStartMeasure(Math.max(1, Math.min(val, maxMeasure)));
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[var(--cordel-bg,#f4ecd8)] text-[var(--cordel-text,#1a1a1a)] border-2 border-[var(--cordel-border,#1a1a1a)] shadow-[6px_6px_0px_var(--cordel-border,#1a1a1a)] font-cactus p-5 animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border,#1a1a1a)] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-[#9a3412]" />
            <h2 className="text-base font-black uppercase tracking-wider">
              {lang === 'fr' ? 'Importer la Toada' : 'Importar Toada'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--cordel-border,#1a1a1a)]/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Détails du Pack */}
        <div className="mb-4 text-xs space-y-1 bg-[var(--cordel-border,#1a1a1a)]/5 p-2.5 border border-[var(--cordel-border,#1a1a1a)]/20">
          <p className="font-bold text-sm text-[#9a3412] truncate">
            {toadaTitle || (lang === 'fr' ? 'Toada Vocale' : 'Toada Vocal')}
          </p>
          <p className="opacity-80">
            {lang === 'fr' ? `${patternsCount} patterns vocaux (Puxador & Coro)` : `${patternsCount} padrões vocais (Puxador & Coro)`}
          </p>
        </div>

        {/* Choix de la mesure */}
        <div className="mb-5 flex items-center justify-between gap-3 bg-[var(--cordel-bg,#f4ecd8)] border-2 border-[var(--cordel-border,#1a1a1a)] p-3 shadow-[2px_2px_0px_var(--cordel-border,#1a1a1a)]">
          <label htmlFor="start-measure-input" className="text-xs font-bold leading-tight">
            {lang === 'fr' ? 'Mesure de départ sur la Timeline :' : 'Compasso de início na Timeline :'}
          </label>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-sans font-bold text-xs opacity-60">M</span>
            <input
              id="start-measure-input"
              type="number"
              min={1}
              max={maxMeasure}
              value={startMeasure}
              onChange={handleMeasureChange}
              className="w-14 text-center font-sans font-black text-sm bg-white border border-[var(--cordel-border,#1a1a1a)] px-1 py-0.5 outline-none focus:ring-1 focus:ring-[#9a3412]"
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm(startMeasure - 1)}
            className="w-full py-2.5 px-3 bg-[#9a3412] hover:bg-[#802a0e] text-white font-bold text-xs flex items-center justify-center gap-2 border-2 border-[var(--cordel-border,#1a1a1a)] shadow-[3px_3px_0px_var(--cordel-border,#1a1a1a)] active:translate-y-[1px] active:shadow-none cursor-pointer transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span>
              {lang === 'fr'
                ? `Dérouler la Toada dès la mesure ${startMeasure}`
                : `Desenrolar Toada a partir do compasso ${startMeasure}`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onConfirm(null)}
            className="w-full py-2 px-3 bg-[var(--cordel-bg,#f4ecd8)] hover:bg-[var(--cordel-border,#1a1a1a)]/10 text-[var(--cordel-text,#1a1a1a)] font-bold text-xs flex items-center justify-center gap-2 border border-[var(--cordel-border,#1a1a1a)] cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 opacity-70" />
            <span>
              {lang === 'fr'
                ? 'Importer uniquement dans Détail Instrument (sans placer)'
                : 'Importar apenas nos Detalhes (sem posicionar)'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
