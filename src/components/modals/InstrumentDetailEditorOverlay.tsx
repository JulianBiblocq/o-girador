import React, { Suspense } from 'react';
import { useDesktopWorkspaceStore } from '../../stores/useDesktopWorkspaceStore';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

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
  handleStepTouchStart,
  setEditingTrackId,
}) => {
  const isSatelliteOpen = useDesktopWorkspaceStore((state) => state.isSatelliteOpen);
  const satelliteMode = useDesktopWorkspaceStore((state) => state.satelliteMode);

  if (editingTrackId === null) return null;
  if (!isMobile && isSatelliteOpen && satelliteMode === 'editor') return null;

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
