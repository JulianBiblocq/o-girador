import React from 'react';

interface TimelineMeasureToadaDualWaveProps {
  patternId: number;
  isSelectedCell: boolean;
  isToadaComposite?: boolean;
  toadaVocalBadges?: { pPtnName?: string; cPtnName?: string };
}

export function getToadaDualWaveStyle(
  isToadaComposite?: boolean,
  toadaVocalBadges?: { pPtnName?: string; cPtnName?: string }
): React.CSSProperties {
  if (isToadaComposite) {
    return {
      background: 'linear-gradient(135deg, rgba(139, 42, 26, 0.45) 0%, rgba(139, 42, 26, 0.45) 50%, rgba(0, 131, 143, 0.45) 50%, rgba(0, 131, 143, 0.45) 100%)',
      borderColor: '#8b2a1a60',
      borderLeftWidth: '3px',
      borderLeftColor: '#8b2a1a',
      borderRightWidth: '3px',
      borderRightColor: '#00838f',
    };
  }
  if (toadaVocalBadges?.pPtnName) {
    return {
      backgroundColor: 'rgba(139, 42, 26, 0.35)',
      borderColor: 'rgba(139, 42, 26, 0.5)',
      borderLeftWidth: '3px',
      borderLeftColor: '#8b2a1a',
    };
  }
  return {
    backgroundColor: 'rgba(0, 131, 143, 0.35)',
    borderColor: 'rgba(0, 131, 143, 0.5)',
    borderLeftWidth: '3px',
    borderLeftColor: '#00838f',
  };
}

export const TimelineMeasureToadaDualWave: React.FC<TimelineMeasureToadaDualWaveProps> = ({
  patternId,
  isSelectedCell,
  isToadaComposite,
  toadaVocalBadges,
}) => {
  if (patternId === -1) {
    return (
      <div
        className="w-full h-full opacity-15"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, var(--cordel-text) 0, var(--cordel-text) 1px, transparent 0, transparent 50%)',
          backgroundSize: '10px 10px',
        }}
      />
    );
  }

  return (
    <div
      className={`w-full h-full rounded-sm relative border ${
        isSelectedCell ? 'ring-2 ring-inset ring-[#8b2a1a] !border-[#8b2a1a]' : ''
      }`}
      style={getToadaDualWaveStyle(isToadaComposite, toadaVocalBadges)}
    />
  );
};
