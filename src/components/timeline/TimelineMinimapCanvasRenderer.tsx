import React from 'react';
import { instrumentsConfig } from '../../data';

interface TimelineMinimapCanvasRendererProps {
  tracks: any[];
  totalMeasures: number;
}

export const TimelineMinimapCanvasRenderer: React.FC<TimelineMinimapCanvasRendererProps> = ({
  tracks,
  totalMeasures,
}) => {
  return (
    <>
      {/* Miniature Grid Lines */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: totalMeasures }).map((_, mIdx) => {
          if (mIdx === 0 || mIdx === totalMeasures) return null;
          return (
            <div
              key={mIdx}
              className={`absolute top-0 bottom-0 w-[1px] ${
                mIdx % 4 === 0 ? 'bg-blue-500/25' : 'bg-[var(--cordel-border)]/5'
              }`}
              style={{ left: `${(mIdx / totalMeasures) * 100}%` }}
            />
          );
        })}
      </div>

      {/* Miniature Track Preview */}
      <div className="absolute inset-0 flex flex-col justify-around py-0.5 pointer-events-none">
        {tracks.map((track) => {
          const inst = instrumentsConfig[track.instrumentIdx];
          if (!inst) return null;
          return (
            <div key={track.id} className="h-1 w-full relative">
              {totalMeasures > 0 &&
                Array.from({ length: totalMeasures }).map((_, mIdx) => {
                  const activePattern = track.patterns?.find((p: any) => Boolean(p.measureAssignments?.[mIdx]));
                  if (!activePattern) return null;
                  return (
                    <div
                      key={mIdx}
                      className="absolute top-0 bottom-0 rounded-xs opacity-50"
                      style={{
                        left: `${(mIdx / totalMeasures) * 100}%`,
                        width: `${(1 / totalMeasures) * 100}%`,
                        backgroundColor: inst.colors?.['D'] || inst.colors?.['E'] || '#3b82f6',
                      }}
                    />
                  );
                })}
            </div>
          );
        })}
      </div>
    </>
  );
};
