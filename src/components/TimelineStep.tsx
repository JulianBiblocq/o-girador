import React, { useContext } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { instrumentsConfig, isDarkText, NEWTON_NOTE_COLORS } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';

interface TimelineStepProps {
  trackId: number;
  patternId: number;
  measureIdx: number;
  stepIdx: number;
  stepsCount: number;
  // Index pré-calculés pour accès O(1)
  trackIdx: number;
  patternIdx: number;
  instrumentIdx: number;
  beatResolutions?: number[];
}

function getDisplayVal(val: string | number) {
  if (val === 0 || val === '0' || !val) return '';
  return String(val);
}

const TimelineStepComponent: React.FC<TimelineStepProps> = ({
  trackId,
  patternId,
  measureIdx,
  stepIdx,
  stepsCount,
  trackIdx,
  patternIdx,
  instrumentIdx,
  beatResolutions,
}) => {
  const uiContext = useContext(TimelineUIContext);

  // 1. Accès O(1) direct par index (évite toute boucle .find sur le thread principal)
  const val = useSequencerStore(
    (state) => state.tracks[trackIdx]?.patterns[patternIdx]?.activeSteps?.[stepIdx] ?? 0
  );

  const inst = instrumentsConfig[instrumentIdx];
  const isVoice = inst?.type === 'voice';

  // S'abonner aux notes uniquement pour les pistes de chant
  const note = useSequencerStore(
    (state) => isVoice ? (state.tracks[trackIdx]?.patterns[patternIdx]?.notes?.[stepIdx] ?? '') : ''
  );
  const noteLetter = note ? note.charAt(0).toUpperCase() : '';
  const noteColor = noteLetter ? (NEWTON_NOTE_COLORS[noteLetter] || '#1a1a1a') : '#1a1a1a';

  const timeSigStr = useSequencerStore(
    (state) => state.measureTimeSigs[measureIdx] || '4/4'
  );

  if (!uiContext || !inst) return null;
  const { MEASURE_W } = uiContext;

  const display = getDisplayVal(val);
  const isActive = val !== 0 && val !== '';

  // Calcul de la largeur
  const defaultBeats = parseInt(timeSigStr.split('/')[0], 10) || 4;
  const beatRes = beatResolutions || Array(defaultBeats).fill(Math.floor(stepsCount / defaultBeats) || 4);

  let stepWidth = MEASURE_W / stepsCount;
  let accumulated = 0;

  for (let b = 0; b < beatRes.length; b++) {
    if (stepIdx >= accumulated && stepIdx < accumulated + beatRes[b]) {
      stepWidth = (MEASURE_W / defaultBeats) / beatRes[b];
      break;
    }
    accumulated += beatRes[b];
  }

  const style: React.CSSProperties = {
    width: `${stepWidth}px`,
  };

  const bg = isActive ? (isVoice ? inst.color : (inst.colors?.[val as string] || '#111')) : '#111';
  let fg = isVoice ? noteColor : (inst.colors?.text || '#f4ecd8');
  if (!isVoice && isDarkText(inst.id, String(val))) {
    fg = '#1a1a1a';
  }

  return (
    <div
      className="timeline-step relative h-full border-r border-[var(--cordel-border)]/10 flex flex-col items-center justify-center text-center cursor-pointer select-none overflow-hidden"
      style={style}
      data-measure={measureIdx}
      data-step={stepIdx}
      data-steps={stepsCount}
      data-track-id={trackId}
      data-pattern-id={patternId}
      data-val={val}
    >
      {/* Background layer (GPU accelerated) */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-75 ease-out"
        style={{
          backgroundColor: bg,
          opacity: isActive ? 1 : 0,
          willChange: 'opacity',
          zIndex: 1
        }}
      />

      {/* Content layer */}
      <div 
        className="relative z-10 w-full h-full flex flex-col items-center justify-center"
        style={{ color: fg }}
      >
        {isVoice ? (
          <span 
            className="text-[13px] font-extrabold tracking-wide" 
            style={{ color: noteColor, textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)' }}
          >
            {noteLetter || ''}
          </span>
        ) : (
          <span className="text-[13px] font-extrabold tracking-wide">
            {display}
          </span>
        )}
      </div>
    </div>
  );
};

export const TimelineStep = React.memo(TimelineStepComponent, (prevProps, nextProps) => {
  return (
    prevProps.trackId === nextProps.trackId &&
    prevProps.patternId === nextProps.patternId &&
    prevProps.measureIdx === nextProps.measureIdx &&
    prevProps.stepIdx === nextProps.stepIdx &&
    prevProps.stepsCount === nextProps.stepsCount &&
    prevProps.trackIdx === nextProps.trackIdx &&
    prevProps.patternIdx === nextProps.patternIdx &&
    prevProps.instrumentIdx === nextProps.instrumentIdx
  );
});
