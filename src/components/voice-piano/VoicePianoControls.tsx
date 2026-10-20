/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Ear, Edit3, Eraser, ChevronDown } from 'lucide-react';

interface VoicePianoControlsProps {
  voiceInputMode: 'free' | 'step';
  setVoiceInputMode: (mode: 'free' | 'step') => void;
  selectedStepIdx: number | null;
  selectedStepIsPreRoll: boolean;
  isPianoExpanded: boolean;
  setIsPianoExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isFr: boolean;
  onActivateStepMode: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClearCurrentStep: () => void;
}

export const VoicePianoControls: React.FC<VoicePianoControlsProps> = React.memo(({
  voiceInputMode, setVoiceInputMode, selectedStepIdx, selectedStepIsPreRoll,
  isPianoExpanded, setIsPianoExpanded, isFr, onActivateStepMode, onClearCurrentStep,
}) => {
  return (
    <div className={`flex flex-row items-center justify-between w-full md:w-auto shrink-0 gap-2 ${
      isPianoExpanded ? 'md:flex-col md:items-start border-b md:border-b-0 md:border-r border-[#1a1a1a]/15 pb-2 md:pb-0 md:pr-3' : ''
    }`}>
      {/* Toggle Mode Segmenté Cordel */}
      <div className="flex items-center gap-1 bg-[#ece4d0] p-1 rounded-md border border-[#1a1a1a]/20 shadow-xs">
        <button
          type="button"
          onClick={() => setVoiceInputMode('free')}
          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            voiceInputMode === 'free' ? 'bg-[#2e7d32] text-[#fcf8ef] shadow-xs' : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/5'
          }`}
          title={isFr ? 'Écoute libre : tester les notes sans modifier la partition' : 'Escuta livre: testar notas sem alterar a partitura'}
        >
          <Ear className="w-3.5 h-3.5" />
          <span>{isFr ? 'Écoute libre' : 'Escuta livre'}</span>
        </button>

        <button
          type="button"
          data-testid="voice-step-mode-btn"
          onClick={onActivateStepMode}
          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            voiceInputMode === 'step' ? 'bg-[#8b2a1a] text-[#fcf8ef] shadow-xs' : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-black/5'
          }`}
          title={isFr ? 'Saisie pas-à-pas : inscrire la note et avancer au pas suivant' : 'Entrada passo a passo: inserir a nota e avançar'}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isFr ? 'Saisie pas-à-pas' : 'Entrada passo'}</span>
        </button>
      </div>

      {/* Indicateur Pas actif, Bouton Gomme & Bouton Clavier Repliable */}
      <div className="flex items-center gap-2 text-[10px] font-medium text-[#1a1a1a]/80">
        <span className="font-mono bg-[#ece4d0] px-1.5 py-0.5 rounded border border-[#1a1a1a]/15">
          {selectedStepIsPreRoll ? (isFr ? '🎙️ Anacrouse' : '🎙️ Anacruse') : (isFr ? '🎼 Mesure' : '🎼 Compasso')} :{' '}
          <strong className="text-[#8b2a1a]">
            {selectedStepIdx !== null ? `Pas ${selectedStepIdx + 1}` : (isFr ? 'Aucun' : 'Nenhum')}
          </strong>
        </span>

        <button
          type="button"
          onClick={onClearCurrentStep}
          disabled={selectedStepIdx === null}
          className="p-1 rounded bg-[#ece4d0] hover:bg-[#e2d5bd] text-[#8b2a1a] border border-[#1a1a1a]/20 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
          title={isFr ? 'Effacer la note du pas sélectionné (Silence)' : 'Limpar nota do passo selecionado (Pausa)'}
        >
          <Eraser className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => setIsPianoExpanded((prev) => !prev)}
          className="px-2 py-1 rounded bg-[#ece4d0] hover:bg-[#e2d5bd] text-[#1a1a1a] text-[11px] font-bold border border-[#1a1a1a]/20 shadow-xs flex items-center gap-1 cursor-pointer transition-colors ml-1"
          title={isFr ? (isPianoExpanded ? 'Replier le clavier piano' : 'Déplier le clavier piano') : (isPianoExpanded ? 'Recolher teclado' : 'Expandir teclado')}
        >
          <span>🎹</span>
          <span className="hidden sm:inline">{isFr ? 'Clavier' : 'Teclado'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isPianoExpanded ? 'rotate-0' : '-rotate-90'}`} />
        </button>
      </div>
    </div>
  );
});

VoicePianoControls.displayName = 'VoicePianoControls';
