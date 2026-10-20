/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '../data';
import { useSequencer } from '../contexts/SequencerContext';
import { useMixerTrackList } from './mixer/useMixerTrackList';
import { MixerHeader } from './mixer/MixerHeader';
import { MixerTrackList } from './mixer/MixerTrackList';

interface MixerProps {
  onStepTouchStart?: (
    e: React.MouseEvent | React.TouchEvent,
    patternId: number,
    stepIdx: number,
    instId: string,
    currentVal: string | number | [string, string],
    onSelect: (val: string | number | [string, string], merge?: boolean) => void,
    trackId?: number,
    isSplit?: boolean
  ) => void;
  isActive?: boolean;
  setEditingTrackId: (id: number | null) => void;
  isMobile?: boolean;
}

const MixerComponent: React.FC<MixerProps> = ({
  onStepTouchStart,
  isActive = true,
  setEditingTrackId,
  isMobile = false,
}) => {
  const { lang = 'pt' } = useSequencer();
  const t = (key: string) => (i18n[lang] as any)[key] || key;
  const { trackIds, trackIdsNumbers } = useMixerTrackList();

  const onOpenDetailEditor = React.useCallback(
    (id: number) => {
      setEditingTrackId(id);
    },
    [setEditingTrackId]
  );

  return (
    <div
      id="left-panel"
      className="relative w-[400px] min-w-[400px] h-full bg-gradient-to-b from-[#1c1815] to-[#120e0c] border-r-2 border-[#eaddcf] flex flex-col p-5 box-border z-10 transition-all duration-300 overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg wallpaper-surface-dark"
        style={{ transform: 'translateZ(0)' }}
      />

      <MixerHeader t={t} />

      <MixerTrackList
        trackIds={trackIds}
        trackIdsNumbers={trackIdsNumbers}
        isActive={isActive}
        isMobile={isMobile}
        onOpenDetailEditor={onOpenDetailEditor}
        onStepTouchStart={onStepTouchStart}
      />
    </div>
  );
};

export const Mixer = React.memo(MixerComponent);
export default Mixer;
