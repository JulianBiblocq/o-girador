import React from 'react';
import { Sliders, Copy, Check, RotateCcw, ChevronUp, ChevronDown, Repeat, Snowflake, Smartphone, X } from 'lucide-react';
import { AoVivoMobileFamily } from '../../audio/animations/aoVivoMobileOffsets';
import { LAB_INSTRUMENT_BUTTONS } from './aoVivoLabTabsConfig';
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
  isMobileTarget: boolean;
  isForceMobileTarget: boolean;
  onToggleForceMobileTarget: () => void;
  onReset: () => void;
  onCopy: () => void;
  copied: boolean;
  activeInstFam: AoVivoMobileFamily;
  labFam: TesterFamily;
  onSelectInstFam: (fam: AoVivoMobileFamily) => void;
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
  isOpen, onToggleOpen, onCloseLab, isMobileTarget, isForceMobileTarget, onToggleForceMobileTarget,
  onReset, onCopy, copied, activeInstFam, labFam, onSelectInstFam,
  isLooping, onToggleLoop, isFrozen, onToggleFrozen, speedMultiplier, onSetSpeed,
  testStroke, activeSeqId, onSelectStroke, onSelectSequence,
}) => (
  <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: 'var(--cordel-bg)', borderColor: isOpen ? 'var(--cordel-border)' : 'transparent' }}>
    <div className="flex items-center justify-between px-2 py-1 gap-1">
      <button type="button" onClick={onToggleOpen} className="flex items-center gap-1 font-bold uppercase tracking-wider cursor-pointer text-[10.5px] shrink-0">
        <Sliders className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden min-[380px]:inline">[ Labo Ao Vivo ]</span>
        <span className="min-[380px]:hidden">[ Labo ]</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
      <div className="flex items-center gap-1 min-w-0">
        <button type="button" onClick={onToggleForceMobileTarget} className="hidden md:flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer shrink-0" style={labBtnStyle(isForceMobileTarget, true)} title="Basculer le profil cible (PC vs Mobile)">
          <Smartphone className="w-3 h-3" /><span>{isForceMobileTarget ? 'Cible : Mobile' : 'Cible : PC'}</span>
        </button>
        <button type="button" onClick={onReset} className="flex items-center px-1.5 py-0.5 border rounded text-[9.5px] font-bold cursor-pointer shrink-0" style={labBtnStyle(false)} title="Réinitialiser l'onglet actif">
          <RotateCcw className="w-3 h-3" />
        </button>
        <button type="button" onClick={onCopy} className="flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer truncate" style={labBtnStyle(isMobileTarget)} title={isMobileTarget ? 'Copier JSON Mobile Complet' : 'Copier JSON PC'}>
          {copied ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
          {isMobileTarget && <span className="truncate">{copied ? 'JSON Copié !' : 'Copier JSON Mobile Complet'}</span>}
        </button>
        <button type="button" onClick={onCloseLab} className="flex items-center justify-center px-1.5 py-0.5 border rounded text-[10px] font-bold cursor-pointer shrink-0" style={labBtnStyle(true)} title="Fermer le Labo Ao Vivo">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    {isOpen && (
      <div className="px-2 pb-1.5 pt-1 space-y-1 border-t" style={{ borderColor: 'var(--cordel-border)' }}>
        <div className="grid grid-cols-7 gap-0.5">
          {LAB_INSTRUMENT_BUTTONS.map((f) => (
            <button key={f.id} type="button" onClick={() => onSelectInstFam(f.id)} className="py-0.5 px-0.5 border rounded text-[8.5px] font-bold cursor-pointer truncate" style={labBtnStyle(activeInstFam === f.id)}>{f.label}</button>
          ))}
        </div>
        <div className="p-1 border rounded space-y-1" style={{ borderColor: 'var(--cordel-border)' }}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8.5px] font-bold uppercase truncate">Coups :</span>
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={onToggleLoop} className="flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[8.5px] font-bold cursor-pointer" style={labBtnStyle(isLooping)}><Repeat className="w-2.5 h-2.5" /><span>Boucle</span></button>
              <button type="button" onClick={onToggleFrozen} className="flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[8.5px] font-bold cursor-pointer" style={labBtnStyle(isFrozen)}><Snowflake className="w-2.5 h-2.5" /><span>Figer Impact</span></button>
              {([1, 0.5] as const).map((spd) => <button key={spd} type="button" onClick={() => onSetSpeed(spd)} className="px-1 py-0.5 border rounded text-[8.5px] font-bold cursor-pointer" style={labBtnStyle(speedMultiplier === spd)}>{spd === 1 ? '1x' : '0.5x'}</button>)}
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible">
            {TESTER_STROKES[labFam].map((s) => <button key={s.id} type="button" onClick={() => onSelectStroke(s.id)} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer shrink-0" style={labBtnStyle(!activeSeqId && testStroke === s.id)}>{s.lbl}</button>)}
            {TESTER_SEQUENCES[labFam].map((q) => <button key={q.id} type="button" onClick={() => onSelectSequence(q.id)} className="px-1.5 py-0.5 border rounded text-[9px] font-bold cursor-pointer shrink-0" style={labBtnStyle(activeSeqId === q.id, true)}>[ {q.lbl} ]</button>)}
          </div>
        </div>
      </div>
    )}
  </div>
);
