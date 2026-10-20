/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useInstrumentDetailEditorCore } from './useInstrumentDetailEditorCore';
import { useInstrumentDetailEditorPropsBundle } from './useInstrumentDetailEditorPropsBundle';

export function useInstrumentDetailEditorModel(props: {
  trackId: number;
  onClose: () => void;
  isMobile: boolean;
  isDetached?: boolean;
  onStepTouchStart?: (e: any, pId: number, sIdx: number, instId: string, val: any, onSel: any) => void;
  setEditingTrackId: (id: number | null) => void;
}) {
  const core = useInstrumentDetailEditorCore(props);
  const bundle = useInstrumentDetailEditorPropsBundle(core, props);

  return {
    track: core.track,
    lang: core.lang,
    isClosing: core.ctrl.isClosing,
    isDetached: core.isDetached,
    isMobile: core.isMobile,
    isVocalContext: core.isVocalContext,
    handleMouseDown: core.ctrl.handleMouseDown,
    handleMouseUp: core.ctrl.handleMouseUp,
    ...bundle,
  };
}
