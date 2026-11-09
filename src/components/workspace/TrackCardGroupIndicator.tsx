import React from 'react';
import { TrackGroupVisualInfo } from './trackGroupVisual';

export const TrackCardGroupIndicator: React.FC<{ visual: TrackGroupVisualInfo | null }> = ({ visual }) => {
  if (!visual || !visual.isGroupMember) return null;
  const barBackground = visual.groupBackground || visual.groupColor;
  const topBackground = visual.horizontalBackground || visual.groupColor;
  return (
    <>
      {/* Bande verticale bord gauche 5px (ruban multi-couleurs des membres du groupe) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5px] pointer-events-none z-20"
        style={{ background: barBackground }}
      />
      {/* Marqueur Maître : bande horizontale supérieure 4px formant le « L » / « Γ » */}
      {visual.isMaster && (
        <div
          className="absolute left-0 top-0 right-0 h-[4px] pointer-events-none z-20"
          style={{ background: topBackground }}
        />
      )}
    </>
  );
};
