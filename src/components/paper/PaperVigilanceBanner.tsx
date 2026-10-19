/**
 * PaperVigilanceBanner.tsx
 * Bandeau des points de vigilance de la partition papier pour l'Éditeur d'Instrument (< 110 lignes).
 */
import React from 'react';
import { usePaperVigilanceStore, VigilancePoint } from '../../stores/usePaperVigilanceStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { AlertTriangle, Check, X } from 'lucide-react';

export const PaperVigilanceBanner: React.FC<{ lang?: 'fr' | 'pt' }> = ({ lang = 'fr' }) => {
  const points = usePaperVigilanceStore((state) => state.points);
  const activeFocusPoint = usePaperVigilanceStore((state) => state.activeFocusPoint);
  const removePoint = usePaperVigilanceStore((state) => state.removePoint);
  const clearAll = usePaperVigilanceStore((state) => state.clearAll);
  const setActiveFocusPoint = usePaperVigilanceStore((state) => state.setActiveFocusPoint);

  if (points.length === 0) return null;

  const handlePointClick = (pt: VigilancePoint) => {
    if (pt.trackId) {
      const store = useSequencerStore.getState();
      store.setEditingTrackId(pt.trackId);
      if (pt.patternId) store.setSelectedPatternId(pt.patternId);
    }
    setActiveFocusPoint(pt);
  };

  return (
    <div className="w-full bg-[#fef3c7] border-b-2 border-[#d97706] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
      <div className="flex items-center gap-1.5 font-bold text-[#b45309]">
        <AlertTriangle size={15} className="shrink-0 animate-bounce" />
        <span className="font-cactus uppercase tracking-wide">
          {lang === 'fr' ? `Vigilance Partition Papier (${points.length}) :` : `Vigilância da Partitura (${points.length}) :`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {points.map((pt) => {
          const abbr = resolvePupitreAbbr(pt.roleKey);
          const beatNum = Math.floor(pt.stepIndex / 4) + 1;
          const stepInBeat = (pt.stepIndex % 4) + 1;
          const isSelected = activeFocusPoint?.id === pt.id;

          return (
            <div
              key={pt.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#d97706] text-white border-black font-bold shadow-xs'
                  : 'bg-white text-[#92400e] border-[#d97706]/40 hover:bg-[#fde68a]'
              }`}
              onClick={() => handlePointClick(pt)}
              title={lang === 'fr' ? 'Aller sur ce pas dans l\'éditeur' : 'Ir para este passo'}
            >
              <span>{abbr} • {pt.sectionName} (T{beatNum}.{stepInBeat})</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePoint(pt.id); }}
                className="hover:text-red-700 ml-0.5 cursor-pointer"
                title={lang === 'fr' ? 'Acquitter ce point' : 'Confirmar ponto'}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={clearAll}
        className="px-2 py-0.5 bg-white hover:bg-stone-100 text-[#b45309] border border-[#d97706]/50 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
      >
        <Check size={11} />
        <span>{lang === 'fr' ? 'Tout acquitter' : 'Limpar todos'}</span>
      </button>
    </div>
  );
};
