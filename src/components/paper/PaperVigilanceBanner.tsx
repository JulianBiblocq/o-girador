/**
 * Bandeau des points de vigilance cloisonné par partition avec redirection Maître (< 95 lignes).
 */
import React from 'react';
import { usePaperVigilanceStore, VigilancePoint } from '../../stores/usePaperVigilanceStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useActiveSequencerVigilancePoints } from '../../hooks/useActiveSequencerVigilancePoints';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { resolveMasterTrackId, resolveMatchingPatternIdOnMaster } from '../../utils/trackMasterResolver';
import { AlertTriangle, Check, X } from 'lucide-react';

export const PaperVigilanceBanner: React.FC<{ lang?: 'fr' | 'pt' }> = ({ lang = 'fr' }) => {
  const points = useActiveSequencerVigilancePoints();
  const activeFocusPoint = usePaperVigilanceStore((state) => state.activeFocusPoint);
  const removePoint = usePaperVigilanceStore((state) => state.removePoint);
  const clearActiveSequencerDoubts = usePaperVigilanceStore((state) => state.clearActiveSequencerDoubts);
  const setActiveFocusPoint = usePaperVigilanceStore((state) => state.setActiveFocusPoint);

  if (points.length === 0) return null;

  const handlePointClick = (pt: VigilancePoint) => {
    if (pt.trackId) {
      const store = useSequencerStore.getState();
      const targetTrackId = resolveMasterTrackId(pt.trackId, store.tracks);
      store.setEditingTrackId(targetTrackId);
      const masterTrack = store.tracks.find((t) => t.id === targetTrackId);
      const currentTrack = store.tracks.find((t) => t.id === pt.trackId);
      const patId = masterTrack ? resolveMatchingPatternIdOnMaster(masterTrack, currentTrack, pt.patternId) : pt.patternId;
      if (patId) store.setSelectedPatternId(patId);
    }
    setActiveFocusPoint(pt);
  };

  return (
    <div className="w-full bg-[#fef3c7] border-b-2 border-[#d97706] px-3 py-1 flex flex-wrap items-center justify-between gap-1.5 text-xs shadow-xs relative z-20">
      <div className="flex items-center gap-1.5 font-bold text-[#b45309]">
        <AlertTriangle size={14} className="shrink-0" />
        <span className="font-cactus uppercase tracking-wide text-xs">
          {lang === 'fr' ? `Vigilance Partition (${points.length}) :` : `Vigilância da Partitura (${points.length}) :`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
        {points.map((pt) => {
          const abbr = resolvePupitreAbbr(pt.roleKey);
          const beatNum = Math.floor(pt.stepIndex / 4) + 1;
          const stepInBeat = (pt.stepIndex % 4) + 1;
          const isSelected = activeFocusPoint?.id === pt.id;

          return (
            <div
              key={pt.id}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-mono cursor-pointer transition-all shadow-[1px_1px_0px_#000] ${
                isSelected
                  ? 'bg-[#d97706] text-white border-black font-bold'
                  : 'bg-white text-[#92400e] border-[#d97706]/50 hover:bg-[#fde68a]'
              }`}
              onClick={() => handlePointClick(pt)}
              title={lang === 'fr' ? 'Aller sur ce pas dans l\'éditeur Maître' : 'Ir para este passo no Mestre'}
            >
              <AlertTriangle size={9} className="text-[#d97706] shrink-0" />
              <span>{abbr} • {pt.sectionName} (T{beatNum}.{stepInBeat})</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePoint(pt.id); }}
                className="hover:text-red-700 ml-0.5 cursor-pointer"
                title={lang === 'fr' ? 'Acquitter ce point' : 'Confirmar ponto'}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={clearActiveSequencerDoubts}
        className="px-2 py-0.5 bg-white hover:bg-stone-100 text-[#b45309] border border-[#d97706]/50 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 shadow-[1px_1px_0px_#000]"
      >
        <Check size={10} />
        <span>{lang === 'fr' ? 'Tout acquitter' : 'Limpar todos'}</span>
      </button>
    </div>
  );
};
