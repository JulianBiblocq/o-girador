import { Pattern } from '../../types';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface ResolvedMeasureData {
  activePattern: Pattern | null;
  activeTrack: any;
  currentTrackId: number;
  currentInstrumentIdx: number;
  currentInst: any;
  currentPatternsList: Pattern[];
  currentTrackIdx: number;
  isOverridden: boolean;
  isSilence: boolean;
  isToadaComposite: boolean;
  toadaCompositePatterns?: any;
  toadaVocalBadges?: { pPtnName?: string; cPtnName?: string };
  spanMeasures: number;
  relativeIdx: number;
  sliceSteps?: any[];
}

export function resolveTimelineTrackMeasureData(
  mIdx: number,
  isToada: boolean,
  trackData: any,
  inst: any,
  trackIndex: number,
  tracksMeta: any[],
  trackMeta: any,
  isLinkedChild: boolean,
  puxTrack: any,
  coroTrack: any
): ResolvedMeasureData {
  let activePattern: Pattern | null = null;
  let activeTrack: any = null;
  let currentTrackId = trackData.id;
  let currentInstrumentIdx = trackData.instrumentIdx;
  let currentInst = inst;
  let currentPatternsList = trackData.patterns;
  let currentTrackIdx = trackIndex;
  let isOverridden = false;
  let isSilence = false;
  let isToadaComposite = false;
  let toadaCompositePatterns: any = undefined;
  let toadaVocalBadges: { pPtnName?: string; cPtnName?: string } | undefined = undefined;

  if (isToada) {
    const pPtn = puxTrack?.patterns?.find((p: any) => Boolean(p.measureAssignments?.[mIdx]));
    const cPtn = coroTrack?.patterns?.find((p: any) => Boolean(p.measureAssignments?.[mIdx]));

    if (pPtn && cPtn) {
      activePattern = pPtn;
      activeTrack = puxTrack;
      currentTrackIdx = tracksMeta.findIndex((t) => t.id === puxTrack!.id);
      toadaVocalBadges = { pPtnName: pPtn.name, cPtnName: cPtn.name };
      isToadaComposite = true;
      toadaCompositePatterns = { puxPtn: pPtn, coroPtn: cPtn, puxTrackId: puxTrack?.id, coroTrackId: coroTrack?.id };
    } else if (pPtn) {
      activePattern = pPtn;
      activeTrack = puxTrack;
      currentTrackIdx = tracksMeta.findIndex((t) => t.id === puxTrack!.id);
      toadaVocalBadges = { pPtnName: pPtn.name };
    } else if (cPtn) {
      activePattern = cPtn;
      activeTrack = coroTrack;
      currentTrackIdx = tracksMeta.findIndex((t) => t.id === coroTrack!.id);
      toadaVocalBadges = { cPtnName: cPtn.name };
    }

    if (activeTrack) {
      currentTrackId = activeTrack.id;
      currentInstrumentIdx = activeTrack.instrumentIdx;
      currentInst = instrumentsConfig[currentInstrumentIdx] || inst;
    }
    const toadaList: Pattern[] = [];
    if (puxTrack?.patterns) toadaList.push(...puxTrack.patterns);
    if (coroTrack?.patterns) toadaList.push(...coroTrack.patterns);
    currentPatternsList = toadaList;
  } else if (isLinkedChild && trackMeta) {
    const parentBus = useSequencerStore.getState().tracks.find((p) => String(p.id) === String(trackMeta.linkedToTrackId) && p.isLinkFolder);
    if (parentBus) {
      const override = trackMeta.isLinkMaster ? undefined : trackMeta.patternOverrides?.[mIdx];
      if (override === null) {
        isSilence = true;
        isOverridden = true;
      } else if (override !== undefined) {
        activePattern = parentBus.patterns?.find((p: any) => p.id === override) || null;
        isOverridden = true;
      } else {
        activePattern = parentBus.patterns?.find((p: any) => Boolean(p.measureAssignments?.[mIdx])) || null;
      }
      activeTrack = parentBus;
      currentPatternsList = parentBus.patterns || [];
      currentTrackIdx = tracksMeta.findIndex((t) => t.id === parentBus.id);
    }
  } else {
    activePattern = trackData.patterns?.find((p: any) => Boolean(p.measureAssignments?.[mIdx])) || null;
    activeTrack = trackData;
  }

  const stepsPerMeasure = 16;
  const spanMeasures = activePattern ? Math.max(1, Math.round((activePattern.steps ?? stepsPerMeasure) / stepsPerMeasure)) : 1;
  let startM = mIdx;
  if (activePattern && spanMeasures > 1) {
    if (isOverridden && trackMeta?.patternOverrides) {
      while (startM > 0 && trackMeta.patternOverrides?.[startM - 1] === activePattern.id) startM--;
    } else {
      while (startM > 0 && activePattern.measureAssignments?.[startM - 1] === true) startM--;
    }
  }
  const relativeIdx = activePattern && spanMeasures > 1 ? (mIdx - startM) % spanMeasures : 0;
  const stepStart = relativeIdx * stepsPerMeasure;
  const sliceSteps = activePattern?.activeSteps ? activePattern.activeSteps.slice(stepStart, stepStart + stepsPerMeasure) : undefined;

  return {
    activePattern,
    activeTrack,
    currentTrackId,
    currentInstrumentIdx,
    currentInst,
    currentPatternsList,
    currentTrackIdx,
    isOverridden,
    isSilence,
    isToadaComposite,
    toadaCompositePatterns,
    toadaVocalBadges,
    spanMeasures,
    relativeIdx,
    sliceSteps,
  };
}
