/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VoicePianoDockProps } from './voice-piano/voicePianoTypes';
import { useVoicePianoLogic } from './voice-piano/useVoicePianoLogic';
import { VoicePianoControls } from './voice-piano/VoicePianoControls';
import { VoicePianoKeys } from './voice-piano/VoicePianoKeys';

export type { VoicePianoDockProps };

export const VoicePianoDock: React.FC<VoicePianoDockProps> = React.memo((props) => {
  const { lang, selectedStepIdx, selectedStepIsPreRoll } = props;
  const [isPianoExpanded, setIsPianoExpanded] = useState<boolean>(true);

  const {
    activeNotes, voiceInputMode, setVoiceInputMode,
    handleNoteDown, handleNoteUp, handleClearCurrentStep, handleActivateStepMode,
  } = useVoicePianoLogic(props);

  const isFr = lang === 'fr';

  return (
    <div
      data-voice-piano-dock="true"
      className={`w-full bg-[#f4ede2] border-t-[3px] border-[#1a1a1a] px-3 shrink-0 flex items-center justify-between gap-3 shadow-[0_-2px_6px_rgba(0,0,0,0.06)] z-30 select-none ${
        isPianoExpanded ? 'py-2 flex-col md:flex-row' : 'py-1 flex-row'
      }`}
    >
      <VoicePianoControls
        voiceInputMode={voiceInputMode} setVoiceInputMode={setVoiceInputMode}
        selectedStepIdx={selectedStepIdx} selectedStepIsPreRoll={selectedStepIsPreRoll}
        isPianoExpanded={isPianoExpanded} setIsPianoExpanded={setIsPianoExpanded}
        isFr={isFr} onActivateStepMode={handleActivateStepMode} onClearCurrentStep={handleClearCurrentStep}
      />

      {!isPianoExpanded ? (
        <div className="flex-1 text-center text-[11px] font-mono text-[#1a1a1a]/60 py-1 hidden md:block">
          {isFr ? '⌨Clavier replié — Contrôleur MIDI & frappes clavier actifs' : '⌨Teclado recolhido — Controlador MIDI ativo'}
        </div>
      ) : (
        <VoicePianoKeys activeNotes={activeNotes} onNoteDown={handleNoteDown} onNoteUp={handleNoteUp} />
      )}
    </div>
  );
});

VoicePianoDock.displayName = 'VoicePianoDock';
