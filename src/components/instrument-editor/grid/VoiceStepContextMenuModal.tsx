/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
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

  const hasClipboardSteps = Boolean(
    useSequencerStore.getState().voiceStepsClipboard?.steps?.length ||
    useSequencerStore.getState().vocalNotesClipboard?.length
  );

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
          disabled: !hasClipboardSteps,
          disabledReason: lang === 'fr' ? 'Aucun pas dans le presse-papier' : 'Nenhum passo na área de transferência',
          onClick: () => {
            useSequencerStore.getState().pasteVoiceSteps(trackId, patternId, contextMenu.isPreRoll, contextMenu.stepIdx, false);
            onClose();
          },
        },
        {
          id: 'paste-notes-only',
          icon: '',
          label: lang === 'fr' ? 'Coller les notes seules (Ctrl+Shift+V)' : 'Colar somente as notas (Ctrl+Shift+V)',
          disabled: !hasClipboardSteps,
          disabledReason: lang === 'fr' ? 'Aucune note mélodique dans le presse-papier' : 'Nenhuma nota melódica na área de transferência',
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
