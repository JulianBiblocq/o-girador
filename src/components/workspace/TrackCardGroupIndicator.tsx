import React from 'react';
import { TrackGroupVisualInfo } from './trackGroupVisual';

export const TrackCardGroupIndicator: React.FC<{ visual: TrackGroupVisualInfo | null }> = ({ visual }) => {
  if (!visual || !visual.isGroupMember) return null;
  return (
    <>
      {/* Bande verticale bord gauche 5px */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px] pointer-events-none z-20"
        style={{ backgroundColor: visual.groupColor }}
      />
      {/* Marqueur Maître : bande horizontale supérieure 4px (forme en « L » / « Γ ») */}
      {visual.isMaster && (
        <div
          className="absolute left-0 top-0 right-0 h-[4px] pointer-events-none z-20"
          style={{ backgroundColor: visual.groupColor }}
        />
      )}
    </>
  );
};
