import React from 'react';
import { Megaphone, X } from 'lucide-react';
import { Language } from '../../types';

export interface TimelineMeasureRhythmSignalProps {
  mIdx: number;
  sigId: string | null;
  rhythmSignals: any[];
  enabledSignalIds: string[] | null;
  isOpen: boolean;
  lang: Language;
  onToggleOpen: () => void;
  onClose: () => void;
  onSelectSignal: (sigId: string | null) => void;
}

export const TimelineMeasureRhythmSignal = React.memo<TimelineMeasureRhythmSignalProps>(({
  mIdx, sigId, rhythmSignals, enabledSignalIds, isOpen, lang, onToggleOpen, onClose, onSelectSignal,
}) => {
  const activeSig = rhythmSignals.find(s => s.id === sigId);

  return (
    <div className="flex items-center w-full mt-1 mb-0.5 relative px-1">
      <button
        onClick={(e) => { e.stopPropagation(); onToggleOpen(); }}
        className={activeSig ? 'flex items-center gap-1 px-1 py-0.5 bg-[var(--cordel-border)]/10 hover:bg-[var(--cordel-border)]/20 transition-colors rounded text-[9px] font-bold text-[var(--cordel-text)] w-full justify-center shadow-sm border border-[var(--cordel-border)]/20' : 'w-full h-5 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)]/40 border border-dashed border-[var(--cordel-border)]/30 rounded text-[9px] font-bold hover:bg-[var(--cordel-border)]/30 hover:text-[var(--cordel-text)] transition-colors cursor-pointer'}
      >
        {activeSig ? (activeSig.image ? <img src={activeSig.image} alt={activeSig.name} className="w-4 h-4 object-contain shrink-0" /> : <Megaphone size={12} className="shrink-0" />) : `+ ${lang === 'fr' ? 'Signal' : 'Sinal'}`}
        {activeSig && <span className="ruler-detailed truncate">{activeSig.name}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-[100] bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] cordel-shadow min-w-[140px] flex flex-col py-1" style={{ marginTop: 2 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { onSelectSignal(null); onClose(); }} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left">
            <X size={12} className="opacity-50 shrink-0" /><span className="opacity-70">{lang === 'fr' ? 'Aucun' : 'Nenhum'}</span>
          </button>
          <div className="border-t border-[var(--cordel-border)]/20 my-0.5" />
          {rhythmSignals.filter(sig => enabledSignalIds === null || enabledSignalIds.includes(sig.id)).map(sig => (
            <button key={sig.id} onClick={() => { onSelectSignal(sig.id); onClose(); }} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-[var(--cordel-text)] hover:bg-[var(--cordel-border)]/20 cursor-pointer text-left ${sig.id === sigId ? 'bg-[var(--cordel-border)]/30' : ''}`}>
              {sig.image ? <img src={sig.image} alt={sig.name} className="w-6 h-6 object-contain shrink-0" /> : <span className="w-6 h-6 flex items-center justify-center bg-black/10 rounded shrink-0 leading-none"><Megaphone size={12} /></span>}
              <span className="truncate">{sig.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
