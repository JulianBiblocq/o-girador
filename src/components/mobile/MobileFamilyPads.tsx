/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { MOBILE_FAMILIES, MobileFamilyDef } from './mobileFamilyConfig';
import { MobileFamilyCard } from './MobileFamilyCard';
import { MobileSingleFaderPopover } from './MobileSingleFaderPopover';

interface Props {
  isLocked: boolean;
}

export const MobileFamilyPads: React.FC<Props> = ({ isLocked }) => {
  const [activeFaderFamily, setActiveFaderFamily] = useState<MobileFamilyDef | null>(null);

  const tracks = useSequencerStore((s) => s.tracks);
  const handleTrackVolumeChange = useSequencerStore((s) => s.handleTrackVolumeChange);

  return (
    <div className="w-full flex-1 min-h-0 bg-[#121212] p-2 grid grid-cols-3 grid-rows-2 gap-2 select-none overflow-hidden">
      {MOBILE_FAMILIES.map((fam) => (
        <MobileFamilyCard
          key={fam.id}
          family={fam}
          isLocked={isLocked}
          onOpenFader={() => setActiveFaderFamily(fam)}
        />
      ))}

      {activeFaderFamily && (
        <MobileSingleFaderPopover
          label={activeFaderFamily.label}
          volume={
            tracks
              .filter((t) => activeFaderFamily.instrumentIds.includes(instrumentsConfig[t.instrumentIdx]?.id || ''))
              .reduce((acc, t, _, arr) => acc + (t.volumeVal ?? 75) / (arr.length || 1), 0) || 75
          }
          onChangeVolume={(vol) => {
            tracks
              .filter((t) => activeFaderFamily.instrumentIds.includes(instrumentsConfig[t.instrumentIdx]?.id || ''))
              .forEach((t) => handleTrackVolumeChange(t.id, vol));
          }}
          onClose={() => setActiveFaderFamily(null)}
        />
      )}
    </div>
  );
};
