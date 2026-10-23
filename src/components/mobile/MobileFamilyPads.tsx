/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { ASSETS_BASE_URL } from '../../data';
import { MOBILE_FAMILIES, MobileFamilyDef } from './mobileFamilyConfig';
import { MobileFamilyCard } from './MobileFamilyCard';
import { MobileSingleFaderPopover } from './MobileSingleFaderPopover';
import { getFamilyVolume, applyFamilyVolume } from '../../utils/mobileFamilyResolver';

interface Props {
  isLocked: boolean;
}

export const MobileFamilyPads: React.FC<Props> = ({ isLocked }) => {
  const [activeFaderFamily, setActiveFaderFamily] = useState<MobileFamilyDef | null>(null);

  const tracks = useSequencerStore((s) => s.tracks);
  const handleTrackVolumeChange = useSequencerStore((s) => s.handleTrackVolumeChange);

  return (
    <div className="relative w-full flex-1 min-h-0 bg-[var(--cordel-bg)] p-2.5 grid grid-cols-3 grid-rows-2 gap-2.5 select-none overflow-hidden">
      {/* Arrière-plan Dessin de Tony (Atelier Recife/Olinda) */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat select-none z-0 invert mix-blend-multiply opacity-25 dark:invert-0 dark:opacity-30 dark:mix-blend-normal"
        style={{ backgroundImage: `url(${ASSETS_BASE_URL}Pictures/atelier.png)` }}
        aria-hidden="true"
      />
      {/* Voile de contraste subtil */}
      <div className="absolute inset-0 pointer-events-none bg-black/10 dark:bg-black/40 z-0" aria-hidden="true" />
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
          volume={getFamilyVolume(tracks, activeFaderFamily.id)}
          onChangeVolume={(vol) => {
            applyFamilyVolume(tracks, activeFaderFamily.id, vol, handleTrackVolumeChange);
          }}
          onClose={() => setActiveFaderFamily(null)}
        />
      )}
    </div>
  );
};
