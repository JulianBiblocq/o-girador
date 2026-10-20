import React from 'react';
import { AutomationTrack } from '../AutomationTrack';

export interface TimelineGlobalAutomationsAreaProps {
  totalMeasures: number;
  measureWidth: number;
  headerWidth: number;
  lang: string;
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp' | 'bezier')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp' | 'bezier')[];
  isMasterVolumeBypassed?: boolean;
  onMeasureBpmChange: (mIdx: number, bpm: number) => void;
  onMeasureTransitionChange: (mIdx: number, trans: 'immediate' | 'ramp' | 'bezier') => void;
  onMeasureVolChange: (mIdx: number, vol: number) => void;
  onMeasureVolTransitionChange: (mIdx: number, trans: 'immediate' | 'ramp' | 'bezier') => void;
  toggleMasterVolumeBypass: () => void;
}

export const TimelineGlobalAutomationsArea: React.FC<TimelineGlobalAutomationsAreaProps> = React.memo(({
  totalMeasures, measureWidth, headerWidth, lang, measureBpms, measureBpmTransitions,
  measureVols, measureVolTransitions, isMasterVolumeBypassed, onMeasureBpmChange,
  onMeasureTransitionChange, onMeasureVolChange, onMeasureVolTransitionChange, toggleMasterVolumeBypass,
}) => {
  return (
    <>
      <AutomationTrack
        type="tempo"
        trackId={null}
        totalMeasures={totalMeasures}
        measureWidth={measureWidth}
        values={measureBpms || []}
        transitions={measureBpmTransitions || []}
        onChangeValue={onMeasureBpmChange}
        onChangeTransition={onMeasureTransitionChange}
        min={40}
        max={240}
        color="#f19066"
        lang={lang}
        headerWidth={headerWidth}
      />
      <AutomationTrack
        type="volume"
        trackId={null}
        totalMeasures={totalMeasures}
        measureWidth={measureWidth}
        values={measureVols || []}
        transitions={measureVolTransitions || []}
        onChangeValue={onMeasureVolChange}
        onChangeTransition={onMeasureVolTransitionChange}
        min={0}
        max={100}
        color="#55efc4"
        lang={lang}
        headerWidth={headerWidth}
        isBypassed={isMasterVolumeBypassed}
        onToggleBypass={toggleMasterVolumeBypass}
      />
    </>
  );
});
