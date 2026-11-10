import React, { useContext, useState } from 'react';
import { useSequencerStore, isToadaBus, isToadaChild, getEffectiveMuteState, selectTracksMeta } from '../stores/useSequencerStore';
import { useShallow } from 'zustand/react/shallow';
import { instrumentsConfig } from '../data';
import { TimelineUIContext } from '../contexts/TimelineUIContext';
import { getTrackDisplayName, getBusColor, getTopParentBusId, getInstrumentPrimaryStrongColor } from '../utils/colorHelpers';
import { getTrackGroupVisual } from './workspace/trackGroupVisual';
import { TimelineTrackAutomationLane } from './timeline/TimelineTrackAutomationLane';
import { TimelineTrackHeader } from './timeline/TimelineTrackHeader';
import { isSlaveTrack } from '../utils/trackMasterResolver';

interface TimelineTrackRowProps {
  trackId: number;
  currentMeasureW: number;
  totalContentW?: number;
  isAutomationOpen?: boolean;
  onToggleAutomation?: () => void;
  onAutomationExpandedChange?: (expanded: boolean) => void;
}

const TimelineTrackRowComponent: React.FC<TimelineTrackRowProps> = ({
  trackId, currentMeasureW, totalContentW: propTotalW,
  isAutomationOpen = false, onToggleAutomation, onAutomationExpandedChange,
}) => {
  const uiContext = useContext(TimelineUIContext);
  if (!uiContext) return null;
  const { HEADER_W, isMobile, lang } = uiContext;
  const totalContentW = propTotalW ?? uiContext.totalContentW ?? 0;

  const tracksMeta = useSequencerStore(selectTracksMeta);
  const trackMeta = tracksMeta.find((t) => t.id === trackId);
  const trackInst = trackMeta ? instrumentsConfig[trackMeta.instrumentIdx] : null;
  const isToada = Boolean(trackMeta && isToadaBus(trackMeta as any));

  const autoData = useSequencerStore(
    useShallow((s) => {
      if (!isAutomationOpen) return null;
      const t = s.tracks.find((c) => c.id === trackId);
      return t
        ? {
            measureVols: t.measureVols, volumeVal: t.volumeVal, measurePans: t.measurePans, panVal: t.panVal,
            measureReverbSends: t.measureReverbSends, reverbVal: t.reverbVal, measureVolTransitions: t.measureVolTransitions,
            measurePanTransitions: t.measurePanTransitions, measureReverbTransitions: t.measureReverbTransitions, automationBypass: t.automationBypass,
          }
        : null;
    })
  );
  const globalBypass = useSequencerStore((s) => s.globalAutomationBypass);
  const totalMeasures = useSequencerStore((s) => s.totalMeasures);
  const onToggleFoldBus = useSequencerStore((s) => s.handleToggleSequencerFoldBus);
  const [automationParam, setAutomationParam] = useState<'volume' | 'pan' | 'reverb'>('volume');

  if (!trackMeta || !trackInst) return null;
  const trackIndex = tracksMeta.findIndex((t) => t.id === trackId);
  const isToadaChildTrack = Boolean(isToadaChild(trackMeta as any, tracksMeta as any));
  const isLinkedSlave = Boolean(isSlaveTrack(trackMeta as any, tracksMeta as any) && !isToadaChildTrack);
  const isChild = isLinkedSlave || isToadaChildTrack;
  const displayName = isToada ? 'Toada' : isChild ? `↳ ${getTrackDisplayName(trackMeta as any, tracksMeta as any)}` : getTrackDisplayName(trackMeta as any, tracksMeta as any);

  const parentBus = trackMeta.isLinkMaster && trackMeta.linkedToTrackId ? tracksMeta.find((p) => String(p.id) === String(trackMeta.linkedToTrackId) && p.isLinkFolder) : null;
  const topBusId = getTopParentBusId(trackMeta as any, tracksMeta as any);
  const busColor = topBusId ? getBusColor(topBusId, tracksMeta as any, instrumentsConfig) : null;
  const groupVisual = getTrackGroupVisual(trackMeta as any, tracksMeta as any);
  const badgeColor = getInstrumentPrimaryStrongColor(trackInst, trackMeta);
  const isCollapsed = isToada ? Boolean(trackMeta.isSequencerFolded) : trackMeta.isLinkMaster ? Boolean(parentBus ? parentBus.isSequencerFolded : trackMeta.isSequencerFolded) : false;

  const safeBaseW = currentMeasureW > 0 ? currentMeasureW : 120;
  const totalContentRatio = totalContentW > 0 ? totalContentW / safeBaseW : totalMeasures;
  const isMuted = Boolean(getEffectiveMuteState(tracksMeta, trackId));

  return (
    <div className="flex flex-col pointer-events-none">
      <div
        className="flex border-b border-[var(--cordel-border)]/20 h-10 rounded-none relative box-border pointer-events-none"
        style={{ width: `calc(${HEADER_W}px + var(--measure-width, 120px) * ${totalContentRatio})`, minWidth: `calc(${HEADER_W}px + var(--measure-width, 120px) * ${totalContentRatio})` }}
      >
        <TimelineTrackHeader
          trackId={trackId} trackIndex={trackIndex} HEADER_W={HEADER_W} isMobile={isMobile} isChild={isChild}
          busColor={busColor} badgeColor={badgeColor} groupVisual={groupVisual}
          canFold={Boolean(trackMeta.isLinkMaster || isToada)} isCollapsed={isCollapsed}
          onToggleFold={() => onToggleFoldBus(String(isToada ? trackId : (parentBus?.id ?? trackId)))}
          instIconImg={trackInst.iconImg} instName={trackInst.name} displayName={displayName}
          customName={trackMeta.customName} lang={lang} isAutomationOpen={isAutomationOpen}
          onToggleAutomation={onToggleAutomation} isMute={isMuted}
        />
      </div>
      {isAutomationOpen && (
        <TimelineTrackAutomationLane
          automationParam={automationParam} setAutomationParam={setAutomationParam} trackId={trackId}
          displayName={displayName} totalMeasures={totalMeasures} currentMeasureW={currentMeasureW}
          autoData={autoData} onToggleAutomation={onToggleAutomation || (() => {})}
          onExpandedChange={onAutomationExpandedChange} trackInst={trackInst} lang={lang}
          HEADER_W={HEADER_W} globalBypass={globalBypass}
        />
      )}
    </div>
  );
};

export const TimelineTrackRow = React.memo(TimelineTrackRowComponent, (prev, next) => (
  prev.trackId === next.trackId && prev.isAutomationOpen === next.isAutomationOpen &&
  (!next.isAutomationOpen || (prev.currentMeasureW === next.currentMeasureW && prev.totalContentW === next.totalContentW))
));
