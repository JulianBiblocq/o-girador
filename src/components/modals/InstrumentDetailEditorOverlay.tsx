/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { WindowPortal } from '../WindowPortal';

const InstrumentDetailEditor = lazyWithRetry(
  () => import('../InstrumentDetailEditor').then((m) => ({ default: m.InstrumentDetailEditor })),
  'InstrumentDetailEditor'
);

interface InstrumentDetailEditorOverlayProps {
  editingTrackId: number | null;
  onClose: () => void;
  isMobile: boolean;
  lang: 'pt' | 'fr';
  handleStepTouchStart: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | [string, string], merge?: boolean) => void,
    trackId: number,
    isSplit?: boolean
  ) => void;
  setEditingTrackId: (id: number | null) => void;
}

export const InstrumentDetailEditorOverlay: React.FC<InstrumentDetailEditorOverlayProps> = ({
  editingTrackId,
  onClose,
  isMobile,
  lang,
  handleStepTouchStart,
  setEditingTrackId,
}) => {
  const isInstrumentEditorDetached = useSequencerStore((state) => state.isInstrumentEditorDetached);

  if (editingTrackId === null) return null;

  if (isInstrumentEditorDetached) {
    return (
      <WindowPortal
        panelKey="detailEditor"
        onClose={() => {
          onClose();
          useSequencerStore.setState({ isInstrumentEditorDetached: false });
        }}
        title={lang === 'pt' ? 'Editor de Instrumento - o-girador' : "Éditeur d'Instrument - o-girador"}
        width={1280}
        height={850}
      >
        <Suspense fallback={null}>
          <div className="w-full h-full bg-[#f4ecd8] text-[#1a1a1a] overflow-hidden flex flex-col cordel-bg">
            <InstrumentDetailEditor
              key={editingTrackId}
              trackId={editingTrackId}
              onClose={() => {
                onClose();
                useSequencerStore.setState({ isInstrumentEditorDetached: false });
              }}
              isMobile={false}
              isDetached={true}
              onStepTouchStart={(e, pId, sIdx, iId, cur, onSel) =>
                handleStepTouchStart(e, pId, sIdx, iId, cur, onSel, editingTrackId)
              }
              setEditingTrackId={setEditingTrackId}
            />
          </div>
        </Suspense>
      </WindowPortal>
    );
  }

  return (
    <Suspense fallback={null}>
      <InstrumentDetailEditor
        key={editingTrackId}
        trackId={editingTrackId}
        onClose={onClose}
        isMobile={isMobile}
        isDetached={false}
        onStepTouchStart={(e, pId, sIdx, iId, cur, onSel) =>
          handleStepTouchStart(e, pId, sIdx, iId, cur, onSel, editingTrackId)
        }
        setEditingTrackId={setEditingTrackId}
      />
    </Suspense>
  );
};
