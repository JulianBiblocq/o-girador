
import React from 'react';
import { AutomationTrack } from '../AutomationTrack';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { isAutomationBypassed, GlobalAutomationBypass } from '../../utils/automationBypassHelper';

export interface TimelineTrackAutomationLaneProps {
  automationParam: 'volume' | 'pan' | 'reverb';
  setAutomationParam: (param: 'volume' | 'pan' | 'reverb') => void;
  trackId: number;
  displayName: string;
  totalMeasures: number;
  currentMeasureW: number;
  autoData: any;
  onToggleAutomation: () => void;
  trackInst: any;
  lang: string;
  HEADER_W: number;
  globalBypass?: GlobalAutomationBypass | null;
}

export const TimelineTrackAutomationLane: React.FC<TimelineTrackAutomationLaneProps> = ({
  automationParam,
  setAutomationParam,
  trackId,
  displayName,
  totalMeasures,
  currentMeasureW,
  autoData,
  onToggleAutomation,
  trackInst,
  lang,
  HEADER_W,
  globalBypass,
}) => {
  const label = automationParam === 'volume'
    ? `Vol : ${displayName}`
    : automationParam === 'pan'
    ? `Pan : ${displayName}`
    : `Rév : ${displayName}`;

  const values = automationParam === 'volume'
    ? (autoData?.measureVols || Array(totalMeasures).fill(autoData?.volumeVal ?? 75))
    : automationParam === 'pan'
    ? (autoData?.measurePans || Array(totalMeasures).fill(autoData?.panVal ?? 0))
    : (autoData?.measureReverbSends || Array(totalMeasures).fill(autoData?.reverbVal ?? 0));

  const transitions = automationParam === 'volume'
    ? (autoData?.measureVolTransitions || Array(totalMeasures).fill('immediate'))
    : automationParam === 'pan'
    ? (autoData?.measurePanTransitions || Array(totalMeasures).fill('immediate'))
    : (autoData?.measureReverbTransitions || Array(totalMeasures).fill('immediate'));

  const color = automationParam === 'volume'
    ? (trackInst.colors?.text || '#f19066')
    : automationParam === 'pan'
    ? '#38bdf8'
    : '#c084fc';

  const handleChangeValue = (mIdx: number, val: number) => {
    const store = useSequencerStore.getState();
    if (automationParam === 'volume') store.handleTrackMeasureVolChange(trackId, mIdx, val);
    else if (automationParam === 'pan') store.handleTrackMeasurePanChange(trackId, mIdx, val);
    else store.handleTrackMeasureReverbChange(trackId, mIdx, val);
  };

  const handleChangeTransition = (mIdx: number, val: any) => {
    const store = useSequencerStore.getState();
    if (automationParam === 'volume') store.handleTrackMeasureVolTransitionChange(trackId, mIdx, val);
    else if (automationParam === 'pan') store.handleTrackMeasurePanTransitionChange(trackId, mIdx, val);
    else store.handleTrackMeasureReverbTransitionChange(trackId, mIdx, val);
  };

  return (
    <AutomationTrack
      type={automationParam}
      trackId={trackId}
      label={label}
      totalMeasures={totalMeasures}
      measureWidth={currentMeasureW}
      values={values}
      transitions={transitions}
      onChangeValue={handleChangeValue}
      onChangeTransition={handleChangeTransition}
      onClose={onToggleAutomation}
      min={automationParam === 'pan' ? -100 : 0}
      max={100}
      color={color}
      lang={lang}
      headerWidth={HEADER_W}
      isBypassed={isAutomationBypassed(autoData, automationParam, globalBypass)}
      onToggleBypass={() => useSequencerStore.getState().toggleTrackAutomationBypass(trackId, automationParam)}
      paramSelector={{ current: automationParam, onChange: setAutomationParam }}
    />
  );
};
