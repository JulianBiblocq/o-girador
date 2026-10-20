/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { CordelConfirmDialog } from './CordelConfirmDialog';
import { useVocalAudioProcessor } from './vocal-stepper/useVocalAudioProcessor';
import { VocalWorkflowStepButtons } from './vocal-stepper/VocalWorkflowStepButtons';
import { VocalWorkflowContextHelp } from './vocal-stepper/VocalWorkflowContextHelp';

interface VocalWorkflowStepperProps {
  patternId?: number;
  trackId?: number | string;
  isCoro?: boolean;
}

export const VocalWorkflowStepper: React.FC<VocalWorkflowStepperProps> = ({
  patternId,
  trackId,
  isCoro = false,
}) => {
  const lang = useSequencerStore((state) => state.lang);
  const tempRecording = useAudioStore((state) => state.tempRecording);
  const hasVocalRecording = useAudioStore((state) =>
    Boolean(patternId && (state.vocalBlobs[patternId] || state.vocalBlobs[String(patternId)]))
  );

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const {
    errorMessage,
    setErrorMessage,
    isDragging,
    fileInputRef,
    handleFileImport,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleOpenCalibration,
  } = useVocalAudioProcessor({
    patternId,
    trackId,
    lang,
    onAdvanceToStep3: () => setCurrentStep(3),
  });

  useEffect(() => {
    setCurrentStep(hasVocalRecording ? 3 : 1);
  }, [patternId, hasVocalRecording]);

  useEffect(() => {
    if (tempRecording && patternId && Number(tempRecording.patternId) === Number(patternId)) {
      setCurrentStep(3);
    }
  }, [tempRecording, patternId]);

  const accentColor = isCoro ? '#2a9d8f' : '#c25e38';

  return (
    <>
      <button
        type="button"
        data-testid="vocal-guide-toggle-btn"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f4ecd8] hover:bg-[#fffdf9] border-2 border-[#1a1a1a] shadow-[1px_1px_0px_#1a1a1a] text-xs font-bold font-cactus text-[#1a1a1a] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 shrink-0"
        title={lang === 'fr' ? 'Guide vocal : 3 étapes pour poser sa voix' : 'Guia vocal: 3 passos para gravar sua voz'}
      >
        <span className="w-4 h-4 rounded-full bg-[#8b2a1a] text-[#f4ecd8] flex items-center justify-center text-[10px] font-bold">?</span>
        <span>{lang === 'fr' ? 'Guide' : 'Guia'}</span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100040] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#ece4d0] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_#1a1a1a] rounded-sm p-4 flex flex-col gap-3 text-[#1a1a1a] w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="vocal-workflow-stepper-modal"
          >
            <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-label="mic">🎙️</span>
                <span className="font-cactus font-black text-sm tracking-wider uppercase" style={{ color: accentColor }}>
                  {lang === 'fr' ? 'Parcours Vocal (3 étapes)' : 'Percurso Vocal (3 passos)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-xs border text-white font-mono text-[10px] font-bold uppercase" style={{ backgroundColor: accentColor, borderColor: '#1a1a1a' }}>
                  {isCoro ? (lang === 'fr' ? 'Coro (Chœur)' : 'Coro (Coletivo)') : (lang === 'fr' ? 'Puxador (Solo)' : 'Puxador (Solo)')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded bg-[#1a1a1a]/10 hover:bg-[#8b2a1a] hover:text-[#f4ecd8] border border-[#1a1a1a] text-xs font-bold transition-colors cursor-pointer"
                  title={lang === 'fr' ? 'Fermer le guide' : 'Fechar o guia'}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <VocalWorkflowStepButtons
              currentStep={currentStep}
              onSelectStep={setCurrentStep}
              hasVocalRecording={hasVocalRecording}
              accentColor={accentColor}
              lang={lang}
            />

            <VocalWorkflowContextHelp
              currentStep={currentStep}
              onSetStep={setCurrentStep}
              hasVocalRecording={hasVocalRecording}
              tempRecording={tempRecording}
              isDragging={isDragging}
              fileInputRef={fileInputRef}
              handleFileImport={handleFileImport}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleOpenCalibration={handleOpenCalibration}
              lang={lang}
            />

            <CordelConfirmDialog
              isOpen={Boolean(errorMessage)}
              title={lang === 'fr' ? 'Attention (Import Audio)' : 'Atenção (Importação)'}
              subtitle="Literatura de Cordel"
              message={<p>{errorMessage}</p>}
              confirmText={lang === 'fr' ? 'Compris' : 'Entendido'}
              confirmVariant="warning"
              onConfirm={() => setErrorMessage(null)}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
