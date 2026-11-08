import React from 'react';
import { Sliders, Copy, Check, RotateCcw, ChevronUp, ChevronDown, Repeat, Snowflake, Smartphone, X } from 'lucide-react';
import { TESTER_SEQUENCES, TESTER_STROKES, TesterFamily } from './aoVivoStrokeTester';

export const labBtnStyle = (active: boolean, useWood = false) => ({
  borderColor: 'var(--cordel-border)',
  backgroundColor: active ? (useWood ? 'var(--cordel-wood)' : 'var(--cordel-accent)') : 'var(--cordel-surface)',
  color: active ? 'var(--cordel-parchment-bg)' : 'var(--cordel-text)',
});

interface AoVivoLabHeaderProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  onCloseLab: () => void;
  isMobilePosMode: boolean;
  onToggleMobilePosMode: () => void;
  onReset: () => void;
  onCopy: () => void;
  copied: boolean;
  labFam: TesterFamily;
  onSelectFam: (fam: TesterFamily) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  isFrozen: boolean;
  onToggleFrozen: () => void;
  speedMultiplier: 1 | 0.5;
  onSetSpeed: (spd: 1 | 0.5) => void;
  testStroke: string;
  activeSeqId: string | null;
  onSelectStroke: (s: string) => void;
  onSelectSequence: (seqId: string) => void;
}

export const AoVivoLabHeader: React.FC<AoVivoLabHeaderProps> = ({
  isOpen, onToggleOpen, onCloseLab, isMobilePosMode, onToggleMobilePosMode,
  onReset, onCopy, copied, labFam, onSelectFam,
  isLooping, onToggleLoop, isFrozen, onToggleFrozen, speedMultiplier, onSetSpeed,
  testStroke, activeSeqId, onSelectStroke, onSelectSequence,
}) => (
  <>
    <div className="flex items-center justify-between px-2.5 py-1.5 gap-1">
      <button type="button" onClick={onToggleOpen} className="flex items-center gap-1 font-bold uppercase tracking-wider cursor-pointer text-[11px]">
        <Sliders className="w-3.5 h-3.5 shrink-0" />
        <span>[ Labo Ao Vivo ]</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onToggleMobilePosMode} className="flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9.5px] font-bold cursor-pointer" style={labBtnStyle(isMobilePosMode, true)} title="Mode Position Mobile">
          <Smartphone className="w-3 h-3" /><span>Position Mobile</span>
        </button>
        <button type="button" onClick={onReset} className="flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[9.5px] font-bold cursor-pointer" style={labBtnStyle(false)} title="Réinitialiser">
          <RotateCcw className="w-3 h-3" />
        </button>
        <button type="button" onClick={onCopy} className="flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[9.5px] font-bold cursor-pointer" style={labBtnStyle(false)} title="Copier JSON">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
        <button type="button" onClick={onCloseLab} className="flex items-center justify-center px-1.5 py-0.5 border rounded text-[10px] font-bold cursor-pointer" style={labBtnStyle(true)} title="Fermer le Labo Ao Vivo">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    {isOpen && (
      <div className="px-2.5 pt-1 space-y-1 border-t" style={{ borderColor: 'var(--cordel-border)' }}>
        {!isMobilePosMode && (
          <div className="grid grid-cols-6 gap-1">
            {([['alfaia', 'Alfaia'], ['caixa', 'Caixa'], ['gongue', 'Gonguê'], ['timbal', 'Timbal'], ['agbe', 'Agbê'], ['mineiro', 'Mineiro']] as const).map(([id, lbl]) => (
              <button key={id} type="button" onClick={() => onSelectFam(id)} className="py-0.5 px-1 border rounded text-[9px] font-bold cursor-pointer truncate" style={labBtnStyle(labFam === id)}>{lbl}</button>
            ))}
          </div>
        )}
        <div className="p-1.5 border rounded space-y-1" style={{ borderColor: 'var(--cordel-border)' }}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold uppercase">Coups & Enchaînements :</span>
            <div className="flex gap-1">
              <button type="button" onClick={onToggleLoop} className="flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(isLooping)}><Repeat className="w-2.5 h-2.5" /><span>Boucle</span></button>
              <button type="button" onClick={onToggleFrozen} className="flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(isFrozen)}><Snowflake className="w-2.5 h-2.5" /><span>Figer</span></button>
              {([1, 0.5] as const).map((spd) => <button key={spd} type="button" onClick={() => onSetSpeed(spd)} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(speedMultiplier === spd)}>{spd === 1 ? '1x' : '0.5x'}</button>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {TESTER_STROKES[labFam].map((s) => <button key={s.id} type="button" onClick={() => onSelectStroke(s.id)} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(!activeSeqId && testStroke === s.id)}>{s.lbl}</button>)}
            {TESTER_SEQUENCES[labFam].map((q) => <button key={q.id} type="button" onClick={() => onSelectSequence(q.id)} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer" style={labBtnStyle(activeSeqId === q.id, true)}>[ {q.lbl} ]</button>)}
          </div>
        </div>
      </div>
    )}
  </>
);

