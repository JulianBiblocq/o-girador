/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Hash, Timer, Lightbulb } from 'lucide-react';
import { SignalMiniThumb } from './SignalMiniThumb';

interface AvailableSignal {
  id: string;
  name: string;
  image: string;
  frames?: string[];
  beatsCount?: number;
  isCloud?: boolean;
}

interface TransportPreRollPopupProps {
  lang: string;
  preRollSettings: any;
  setPreRollSettings: (settings: any) => void;
  availableSignals: AvailableSignal[];
  onClose: () => void;
}

export const TransportPreRollPopup: React.FC<TransportPreRollPopupProps> = ({
  lang,
  preRollSettings,
  setPreRollSettings,
  availableSignals,
  onClose,
}) => {
  const renderSignalSelector = (label: string, value: string | null | undefined, onChange: (id: string | null) => void) => {
    const isNeutral = !value || value === 'none' || value === 'neutre';
    return (
      <div className="mb-2.5">
        <div className="flex justify-between items-center mb-0.5">
          <label className="text-[10px] font-bold text-black/70 uppercase">{label}</label>
          <span className="text-[9px] font-mono text-black/50">{availableSignals.length} {lang === 'fr' ? 'signes' : 'sinais'}</span>
        </div>
        <select
          value={isNeutral ? '' : value}
          onChange={(e) => { const val = e.target.value; onChange((!val || val === 'none' || val === 'neutre') ? null : val); }}
          className="w-full bg-white border border-[#1a1a1a] px-1.5 py-1 text-xs font-sans rounded-none cursor-pointer text-[#1a1a1a]"
        >
          <option value="">{lang === 'fr' ? '# Neutre (Chiffres uniquement)' : '# Neutro (Apenas números)'}</option>
          {availableSignals.map((sig) => <option key={sig.id} value={sig.id}>{sig.name}</option>)}
        </select>
        <div className="flex gap-1.5 overflow-x-auto pt-1.5 pb-0.5 max-w-full">
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-1 border text-[10px] cursor-pointer transition-all ${isNeutral ? 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)] text-white shadow-sm font-bold' : 'border-black/30 bg-white/70 hover:bg-white text-black/70'}`}
          >
            <Hash size={12} className="shrink-0" />
            <span>{lang === 'fr' ? 'Neutre' : 'Neutro'}</span>
          </button>
          {availableSignals.map((sig) => {
            const isSelected = value === sig.id;
            return (
              <button
                key={sig.id}
                type="button"
                onClick={() => onChange(sig.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-1.5 py-1 border text-[10px] cursor-pointer transition-all ${isSelected ? 'border-[var(--cordel-wood)] bg-[var(--cordel-wood)] text-white shadow-sm font-bold' : 'border-black/30 bg-white/70 hover:bg-white text-black/80'}`}
                title={sig.name}
              >
                <SignalMiniThumb name={sig.name} image={sig.image} />
                <span className="truncate max-w-[80px]">{sig.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-0 z-50 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] p-3 w-72 sm:w-80 select-none text-xs font-cactus animate-in fade-in zoom-in-95 duration-75"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#1a1a1a]/20 mb-2.5">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sm">
          <Timer size={14} className="shrink-0" />
          <span>{lang === 'fr' ? 'Précompte (Pre-roll)' : 'Contagem (Pré-roll)'}</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded cursor-pointer" title={lang === 'fr' ? 'Fermer' : 'Fechar'}>
          <X size={13} />
        </button>
      </div>

      <label className="flex items-center justify-between gap-2 p-1.5 bg-black/5 rounded cursor-pointer mb-2.5">
        <span className="font-bold text-xs">{lang === 'fr' ? 'Activer le précompte au Play' : 'Ativar contagem ao iniciar'}</span>
        <input type="checkbox" checked={preRollSettings.enabled} onChange={(e) => setPreRollSettings({ enabled: e.target.checked })} className="w-4 h-4 accent-[var(--cordel-wood)] cursor-pointer" />
      </label>

      {preRollSettings.enabled && (
        <div className="flex flex-col gap-2.5 animate-in fade-in duration-100">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1 text-black/70">{lang === 'fr' ? 'Durée du précompte :' : 'Duração da contagem :'}</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setPreRollSettings({ measuresCount: 1 })} className={`py-1 px-2 border border-[#1a1a1a] font-bold text-xs cursor-pointer transition-all ${preRollSettings.measuresCount === 1 ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a]' : 'bg-white/60 hover:bg-white text-[#1a1a1a]'}`}>
                1 {lang === 'fr' ? 'mesure' : 'compasso'}
              </button>
              <button type="button" onClick={() => setPreRollSettings({ measuresCount: 2 })} className={`py-1 px-2 border border-[#1a1a1a] font-bold text-xs cursor-pointer transition-all ${preRollSettings.measuresCount === 2 ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] shadow-[2px_2px_0px_#1a1a1a]' : 'bg-white/60 hover:bg-white text-[#1a1a1a]'}`}>
                2 {lang === 'fr' ? 'mesures' : 'compassos'}
              </button>
            </div>
          </div>

          <div className="border-t border-black/15 pt-2">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1 text-black/70">{lang === 'fr' ? 'Signaux d’amorce au départ (M = 0) :' : 'Sinais de partida (M = 0) :'}</div>
            {preRollSettings.measuresCount === 2 && renderSignalSelector(lang === 'fr' ? 'Mesure -2 (1ère mesure) :' : 'Compasso -2 (1º compasso) :', preRollSettings.startSignalMeasure1Id, (id) => setPreRollSettings({ startSignalMeasure1Id: id }))}
            {renderSignalSelector(preRollSettings.measuresCount === 2 ? (lang === 'fr' ? 'Mesure -1 (Appel immédiat) :' : 'Compasso -1 (Chamada imediata) :') : (lang === 'fr' ? 'Mesure -1 (Signal d’amorce) :' : 'Compasso -1 (Sinal de chamada) :'), preRollSettings.startSignalMeasure2Id, (id) => setPreRollSettings({ startSignalMeasure2Id: id }))}
          </div>

          <div className="text-[10px] text-black/60 italic leading-snug pt-1 border-t border-black/10 flex items-center gap-1.5">
            <Lightbulb size={12} className="shrink-0" />
            <span>{lang === 'fr' ? 'En cours de morceau (M > 0), le signal de la mesure précédente M-1 est automatiquement animé en amorce s’il existe.' : 'Durante a música (M > 0), o sinal do compasso anterior M-1 é automaticamente animado se existir.'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
