import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { canTransferPatterns } from '../../../utils/instrumentCompatibility';
import { getPasteDisabledReason } from '../../../utils/patternPasteNormalizer';
import { CordelContextMenu } from '../../ui/CordelContextMenu';

export interface VoiceStepContextMenuState {
  x: number;
  y: number;
  stepIdx: number;
  isPreRoll: boolean;
}

interface VoiceStepContextMenuModalProps {
  contextMenu: VoiceStepContextMenuState | null;
  onClose: () => void;
  trackId: number;
  patternId: number;
  lang: string;
  onClearStep: (trackId: number, patternId: number, stepIdx: number, isPreRoll: boolean) => void;
}

export const VoiceStepContextMenuModal: React.FC<VoiceStepContextMenuModalProps> = ({
  contextMenu,
  onClose,
  trackId,
  patternId,
  lang,
  onClearStep,
}) => {
  if (!contextMenu) return null;

  const state = useSequencerStore.getState();
  const hasClipboardSteps = Boolean(
    state.voiceStepsClipboard?.steps?.length ||
    state.vocalNotesClipboard?.length
  );
  const targetTrack = state.tracks.find((t) => t.id === trackId || String(t.id) === String(trackId));
  const sourceVoiceInst = state.voiceStepsClipboard?.sourceInstrumentType || state.voiceStepsClipboard?.sourceInstId || 'puxador';
  const isCompatible = Boolean(hasClipboardSteps && targetTrack && canTransferPatterns(sourceVoiceInst, targetTrack, state.tracks));
  const canPasteVoice = hasClipboardSteps && isCompatible;
  const pasteReason = getPasteDisabledReason(hasClipboardSteps, isCompatible, lang, sourceVoiceInst);

  const title = contextMenu.isPreRoll
    ? lang === 'fr'
      ? `Anacrouse — Pas ${contextMenu.stepIdx + 1}`
      : `Anacruse — Passo ${contextMenu.stepIdx + 1}`
    : lang === 'fr'
    ? `Mesure — Pas ${contextMenu.stepIdx + 1}`
    : `Compasso — Passo ${contextMenu.stepIdx + 1}`;

  return (
    <CordelContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      title={title}
      items={[
        {
          id: 'copy-voice-steps',
          icon: '',
          label: lang === 'fr' ? 'Copier la sélection (Ctrl+C)' : 'Copiar seleção (Ctrl+C)',
          onClick: () => {
            useSequencerStore.getState().copyVoiceStepsRange(useSequencerStore.getState().selectedStepRange, trackId, patternId);
            onClose();
          },
        },
        {
          id: 'cut-voice-steps',
          icon: '',
          label: lang === 'fr' ? 'Couper la sélection (Ctrl+X)' : 'Recortar seleção (Ctrl+X)',
          onClick: () => {
            useSequencerStore.getState().cutVoiceStepsRange(useSequencerStore.getState().selectedStepRange, trackId, patternId);
            onClose();
          },
        },
        {
          id: 'paste-voice-steps',
          icon: '',
          label: lang === 'fr' ? 'Coller (Ctrl+V)' : 'Colar (Ctrl+V)',
          disabled: !canPasteVoice,
          disabledReason: pasteReason,
          onClick: () => {
            useSequencerStore.getState().pasteVoiceSteps(trackId, patternId, contextMenu.isPreRoll, contextMenu.stepIdx, false);
            onClose();
          },
        },
        {
          id: 'paste-notes-only',
          icon: '',
          label: lang === 'fr' ? 'Coller les notes seules (Ctrl+Shift+V)' : 'Colar somente as notas (Ctrl+Shift+V)',
          disabled: !canPasteVoice,
          disabledReason: pasteReason,
          onClick: () => {
            useSequencerStore.getState().pasteVoiceSteps(trackId, patternId, contextMenu.isPreRoll, contextMenu.stepIdx, true);
            onClose();
          },
        },
        { id: 'sep-clear', isSeparator: true },
        {
          id: 'clear-step',
          icon: '',
          label: lang === 'fr' ? 'Effacer le pas' : 'Limpar o passo',
          isDestructive: true,
          onClick: () => {
            onClearStep(trackId, patternId, contextMenu.stepIdx, contextMenu.isPreRoll);
            onClose();
          },
        },
      ]}
      onClose={onClose}
    />
  );
};
