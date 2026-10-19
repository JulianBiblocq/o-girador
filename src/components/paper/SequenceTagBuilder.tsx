/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Palette d'étiquettes dissociables et séquenceur conducteur (< 140 lignes).
 */
import React from 'react';
import { PaperSequenceItem } from '../../types/paperWorkshop.types';
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  availableSections: string[];
  sequenceItems: PaperSequenceItem[];
  onChangeSequence: (items: PaperSequenceItem[]) => void;
  lang: 'fr' | 'pt';
}

export function factorizeSequence(seq: string[]): PaperSequenceItem[] {
  const res: PaperSequenceItem[] = [];
  let cur = '';
  let count = 0;
  seq.forEach((s) => {
    if (s === cur) count++;
    else {
      if (cur) res.push({ id: `seq-${res.length}-${Date.now()}-${Math.random()}`, sectionName: cur, repeatCount: count });
      cur = s;
      count = 1;
    }
  });
  if (cur) res.push({ id: `seq-${res.length}-${Date.now()}-${Math.random()}`, sectionName: cur, repeatCount: count });
  return res;
}

export const SequenceTagBuilder: React.FC<Props> = ({
  availableSections, sequenceItems, onChangeSequence, lang,
}) => {
  const addTag = (name: string) => {
    onChangeSequence([...sequenceItems, { id: `tag-${Date.now()}-${Math.random()}`, sectionName: name, repeatCount: 1 }]);
  };

  const updateRepeat = (id: string, delta: number) => {
    onChangeSequence(sequenceItems.map((it) => (it.id === id ? { ...it, repeatCount: Math.max(1, Math.min(32, it.repeatCount + delta)) } : it)));
  };

  const removeItem = (id: string) => onChangeSequence(sequenceItems.filter((it) => it.id !== id));

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= sequenceItems.length) return;
    const next = [...sequenceItems];
    const [moved] = next.splice(idx, 1);
    next.splice(nextIdx, 0, moved);
    onChangeSequence(next);
  };

  const totalMeasures = sequenceItems.reduce((acc, it) => acc + it.repeatCount, 0);

  return (
    <div className="flex flex-col gap-2 font-sans text-xs">
      {/* ZONE 1 : PALETTE DES ÉTIQUETTES DISPONIBLES (UNIFORMES SANS MULTIPLICATEUR) */}
      <div className="p-2 bg-black/5 border border-black/30">
        <span className="font-cactus font-bold uppercase text-[10px] text-[#8b2a1a] block mb-1">
          {lang === 'fr' ? '1. Palette d\'étiquettes (cliquez pour ajouter à la séquence) :' : '1. Paleta de etiquetas (clique para adicionar) :'}
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-[75px] overflow-y-auto">
          {availableSections.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => addTag(sec)}
              className="px-2 py-1 bg-white hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-black text-[11px] font-cactus font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-[1px_1px_0px_#1a1a1a]"
            >
              <Plus size={11} /> <span>{sec}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ZONE 2 : SÉQUENCE DU MORCEAU (CONDUCTEUR FACTORISÉ) */}
      <div className="p-2.5 bg-white border-2 border-black min-h-[95px] flex flex-col justify-between">
        <div className="flex justify-between items-center border-b border-black/20 pb-1 mb-1.5">
          <span className="font-cactus font-bold uppercase text-[11px] text-[#1a1a1a]">
            {lang === 'fr' ? '2. Séquence assemblée' : '2. Sequência montada'} ({totalMeasures} {lang === 'fr' ? 'mesures' : 'compassos'})
          </span>
          {sequenceItems.length > 0 && (
            <button type="button" onClick={() => onChangeSequence([])} className="text-[10px] text-[#8b2a1a] hover:underline font-bold cursor-pointer">
              {lang === 'fr' ? 'Tout effacer' : 'Limpar tudo'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-[125px] overflow-y-auto">
          {sequenceItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-1 px-1.5 py-1 bg-[#faf8f2] border border-black shadow-[2px_2px_0px_#1a1a1a] select-none">
              <span className="font-cactus font-bold text-xs text-[#1a1a1a]">{item.sectionName}</span>
              <div className="flex items-center bg-black/10 border border-black/30 px-1 py-0.5 ml-1 gap-1">
                <button type="button" onClick={() => updateRepeat(item.id, -1)} className="px-1 text-[10px] font-bold cursor-pointer hover:bg-black hover:text-white">-</button>
                <span className="font-bold text-[10px] min-w-[18px] text-center">×{item.repeatCount}</span>
                <button type="button" onClick={() => updateRepeat(item.id, 1)} className="px-1 text-[10px] font-bold cursor-pointer hover:bg-black hover:text-white">+</button>
              </div>
              <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer"><ArrowLeft size={11} /></button>
              <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === sequenceItems.length - 1} className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer"><ArrowRight size={11} /></button>
              <button type="button" onClick={() => removeItem(item.id)} className="ml-0.5 text-[#8b2a1a] hover:scale-110 cursor-pointer"><Trash2 size={12} /></button>
            </div>
          ))}
          {sequenceItems.length === 0 && (
            <div className="text-gray-400 italic text-center w-full py-2 text-[11px]">
              {lang === 'fr' ? 'Cliquez sur une étiquette ci-dessus pour bâtir la séquence du morceau' : 'Clique em uma etiqueta acima'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
