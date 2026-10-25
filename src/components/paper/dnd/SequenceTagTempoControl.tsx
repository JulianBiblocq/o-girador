/**
 * Contrôle du tempo et rampe par section dans la séquence Cordel (< 120 lignes).
 */
import React, { useState } from 'react';
import { PaperSequenceItem } from '../../../types/paperWorkshop.types';
import { TrendingUp, TrendingDown, ArrowRight, RotateCcw, X } from 'lucide-react';

interface Props {
  item: PaperSequenceItem;
  isLast: boolean;
  globalBpm: number;
  nextSectionBpm: number;
  usedBpms: number[];
  onUpdateTempo: (id: string, updates: Partial<PaperSequenceItem>) => void;
  lang?: 'fr' | 'pt';
}

export const SequenceTagTempoControl: React.FC<Props> = ({
  item, isLast, globalBpm, nextSectionBpm, usedBpms, onUpdateTempo, lang = 'fr',
}) => {
  const isFr = lang === 'fr';
  const [isOpen, setIsOpen] = useState(false);
  const isCustom = typeof item.customBpm === 'number' && item.customBpm > 0;
  const startBpm = isCustom ? item.customBpm! : globalBpm;
  const targetBpm = isLast || nextSectionBpm === startBpm
    ? (item.targetBpmOverride && item.targetBpmOverride > 0 ? item.targetBpmOverride : startBpm)
    : nextSectionBpm;

  const toggleRamp = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTempo(item.id, { tempoRamp: !item.tempoRamp });
  };

  return (
    <div className="relative flex items-center gap-0.5 text-[9px] font-mono select-none">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        title={isFr ? 'Tempo de la section' : 'Tempo da seção'}
        className={`px-1 py-0.5 border cursor-pointer font-bold transition-colors ${
          isCustom ? 'bg-[#8b2a1a] text-[#f4ecd8] border-black shadow-[1px_1px_0px_#000]' : 'bg-[#e6dec8] text-[#1a1a1a]/80 border-black/30 hover:bg-[#d8ceb4]'
        }`}
      >
        {startBpm} BPM
      </button>

      <button
        type="button"
        onClick={toggleRamp}
        title={isFr ? 'Basculer la transition progressive (rampe)' : 'Alternar rampa'}
        className={`px-1 py-0.5 border cursor-pointer flex items-center gap-0.5 transition-colors ${
          item.tempoRamp ? 'bg-[#f4ecd8] text-[#1a1a1a] border-black font-extrabold shadow-[1px_1px_0px_#000]' : 'bg-transparent text-[#1a1a1a]/40 border-transparent hover:border-black/30'
        }`}
      >
        {item.tempoRamp ? (targetBpm >= startBpm ? <TrendingUp size={11} className="text-[#15803d]" /> : <TrendingDown size={11} className="text-[#b91c1c]" />) : <TrendingUp size={11} className="opacity-40" />}
        {item.tempoRamp && (
          <span className="flex items-center text-[8px] font-mono">
            <span>{startBpm}</span><ArrowRight size={8} className="mx-0.5 text-[#1a1a1a]" /><span>{targetBpm}</span>
          </span>
        )}
      </button>

      {item.tempoRamp && (isLast || nextSectionBpm === startBpm) && (
        <input
          type="number" min={40} max={240} value={item.targetBpmOverride || ''} placeholder="Cible"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateTempo(item.id, { targetBpmOverride: Number(e.target.value) || null })}
          className="w-10 px-0.5 py-0.5 bg-[#fdfbf7] text-[#1a1a1a] border border-black font-mono text-[9px] font-bold"
        />
      )}

      {isOpen && (
        <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-full mt-1 z-50 p-2 bg-[#fdfbf7] border-2 border-[#1a1a1a] shadow-[3px_3px_0px_#000] flex flex-col gap-1.5 w-44 font-sans text-xs text-[#1a1a1a]">
          <div className="flex items-center justify-between border-b border-black/20 pb-1">
            <span className="font-cactus font-bold uppercase text-[10px] text-[#8b2a1a]">{isFr ? 'Tempo Section' : 'Tempo Seção'}</span>
            <button type="button" onClick={() => setIsOpen(false)} className="p-0.5 cursor-pointer"><X size={12} /></button>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number" min={40} max={240} value={item.customBpm || ''} placeholder={`Global (${globalBpm})`}
              onChange={(e) => onUpdateTempo(item.id, { customBpm: Number(e.target.value) || null })}
              className="p-1 bg-[#f4ecd8] border border-black font-mono text-xs font-bold w-full"
            />
            <button
              type="button" onClick={() => onUpdateTempo(item.id, { customBpm: null })} title={isFr ? 'Rétablir global' : 'Restaurar'}
              className="p-1 bg-[#e6dec8] border border-black cursor-pointer hover:bg-black/10"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          {usedBpms.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-[#1a1a1a]/60 uppercase">{isFr ? 'Tempos utilisés :' : 'Tempos usados :'}</span>
              <div className="flex flex-wrap gap-1">
                {usedBpms.map((b) => (
                  <button
                    key={b} type="button" onClick={() => onUpdateTempo(item.id, { customBpm: b })}
                    className="px-1.5 py-0.5 bg-[#f4ecd8] border border-black font-mono text-[9px] font-bold hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cursor-pointer"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
