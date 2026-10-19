/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Constructeur visuel par étiquettes Cordel (< 145 lignes).
 */
import React from 'react';
import { PaperSequenceItem } from '../../types/paperWorkshop.types';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface SequenceTagBuilderProps {
  availableSections: string[];
  sequenceItems: PaperSequenceItem[];
  onChangeSequence: (items: PaperSequenceItem[]) => void;
  lang: 'fr' | 'pt';
}

export const SequenceTagBuilder: React.FC<SequenceTagBuilderProps> = ({
  availableSections,
  sequenceItems,
  onChangeSequence,
  lang,
}) => {
  const addSection = (name: string) => {
    const newItem: PaperSequenceItem = { id: `seq-${Date.now()}-${Math.random()}`, sectionName: name, repeatCount: 1 };
    onChangeSequence([...sequenceItems, newItem]);
  };

  const updateRepeat = (id: string, delta: number) => {
    onChangeSequence(
      sequenceItems.map((item) => (item.id === id ? { ...item, repeatCount: Math.max(1, Math.min(8, item.repeatCount + delta)) } : item))
    );
  };

  const removeSection = (id: string) => {
    onChangeSequence(sequenceItems.filter((item) => item.id !== id));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= sequenceItems.length) return;
    const nextList = [...sequenceItems];
    const [moved] = nextList.splice(idx, 1);
    nextList.splice(nextIdx, 0, moved);
    onChangeSequence(nextList);
  };

  const totalMeasures = sequenceItems.reduce((acc, it) => acc + it.repeatCount, 0);

  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      {/* 1. PALETTE DE SECTIONS DISPONIBLES */}
      <div className="flex flex-col gap-1.5 p-2.5 bg-black/5 border border-black/30">
        <span className="font-cactus font-bold uppercase text-[10px] text-[var(--cordel-wood,#8b2a1a)]">
          {lang === 'fr' ? 'Sections disponibles (cliquez pour ajouter) :' : 'Seções disponíveis (clique para adicionar) :'}
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
          {availableSections.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => addSection(sec)}
              className="px-2 py-1 bg-white hover:bg-[var(--cordel-wood,#8b2a1a)] hover:text-white border border-black text-[11px] font-cactus font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-[1px_1px_0px_#000]"
            >
              <Plus className="w-3 h-3" />
              <span>{sec}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. CHENILLE DE SÉQUENCE PAR ÉTIQUETTES */}
      <div className="flex flex-col gap-1.5 p-2.5 bg-white border-2 border-black min-h-[110px]">
        <div className="flex justify-between items-center border-b border-black/20 pb-1">
          <span className="font-cactus font-bold uppercase text-[11px]">
            {lang === 'fr' ? 'Séquence assemblée' : 'Sequência montada'} ({totalMeasures} {lang === 'fr' ? 'mesures' : 'compassos'})
          </span>
          {sequenceItems.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeSequence([])}
              className="text-[10px] text-red-700 hover:underline font-bold cursor-pointer"
            >
              {lang === 'fr' ? 'Tout effacer' : 'Limpar tudo'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1 max-h-[140px] overflow-y-auto">
          {sequenceItems.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-1 px-2 py-1 bg-[#faf8f2] border border-black shadow-[2px_2px_0px_#1a1a1a] rounded-none select-none"
            >
              <span className="font-cactus font-bold text-xs text-[#1a1a1a]">{item.sectionName}</span>
              <div className="flex items-center bg-black/10 border border-black/30 px-1 py-0.5 ml-1 gap-1">
                <button type="button" onClick={() => updateRepeat(item.id, -1)} className="px-1 text-[10px] font-bold cursor-pointer hover:bg-black hover:text-white">-</button>
                <span className="font-bold text-[10px] min-w-[16px] text-center">×{item.repeatCount}</span>
                <button type="button" onClick={() => updateRepeat(item.id, 1)} className="px-1 text-[10px] font-bold cursor-pointer hover:bg-black hover:text-white">+</button>
              </div>
              <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer"><ArrowUp className="w-2.5 h-2.5" /></button>
              <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === sequenceItems.length - 1} className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer"><ArrowDown className="w-2.5 h-2.5" /></button>
              <button type="button" onClick={() => removeSection(item.id)} className="ml-1 text-red-700 hover:scale-110 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          {sequenceItems.length === 0 && (
            <div className="text-gray-400 italic text-center w-full py-4 text-[11px]">
              {lang === 'fr' ? 'Cliquez sur une section ci-dessus pour bâtir votre séquence' : 'Clique em uma seção acima para montar sua sequência'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
