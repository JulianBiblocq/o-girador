import { TrackGroup, Pattern } from '../../types';
import { instrumentsConfig, getVisualStrokeSymbol, isDarkText } from '../../data';
import { getBusNoteColor, getContrastColor } from '../../utils/colorHelpers';

export function resolveLinkedStepVisual({
  track,
  tracks,
  children,
  currentMeasure,
  activePattern,
  effectiveTrack,
  stepIdx,
  isLeftHanded,
  isActiveCell,
  visualVal,
  displayVal,
  masterBg,
  masterTxt,
  emptyStepBg,
}: {
  track: TrackGroup;
  tracks: TrackGroup[];
  children: TrackGroup[];
  currentMeasure: number;
  activePattern: Pattern | null;
  effectiveTrack: TrackGroup;
  stepIdx: number;
  isLeftHanded: boolean;
  isActiveCell: boolean;
  visualVal: string | number;
  displayVal: string;
  masterBg: string;
  masterTxt: string;
  emptyStepBg: string;
}) {
  const childEvents: Array<{ bgColor: string; txtColor: string; displayVal: string; visualVal: string | number }> = [];

  children.forEach(c => {
    const overrideVal = c.patternOverrides?.[currentMeasure];
    let cPattern: Pattern | null | undefined = null;
    if (overrideVal === null) cPattern = null;
    else if (overrideVal !== undefined) cPattern = track.patterns?.find(p => p.id === overrideVal);
    else if (activePattern) {
      cPattern = c.patterns?.find(p => p.id === activePattern.id) || c.patterns?.[effectiveTrack.patterns?.indexOf(activePattern) ?? -1];
    }
    const cVal = cPattern?.activeSteps?.[stepIdx] ?? 0;
    if (cVal !== 0 && cVal !== '') {
      const cInst = instrumentsConfig[c.instrumentIdx];
      if (cInst) {
        const cVisualVal = getVisualStrokeSymbol(cVal, isLeftHanded, cInst.id);
        if (cVisualVal !== 0) {
          const pVisual = Array.isArray(cVisualVal) ? cVisualVal[0] : cVisualVal;
          childEvents.push({
            bgColor: cInst.colors?.[pVisual as string] || cInst.color || '#111',
            txtColor: isDarkText(cInst.id, pVisual as string) ? '#1a1a1a' : (cInst.colors?.text || '#f4ecd8'),
            displayVal: String(pVisual),
            visualVal: pVisual,
          });
        }
      }
    }
  });

  const masterVisualVal = isActiveCell ? visualVal : 0;
  const hasMasterEvent = masterVisualVal !== 0;
  const isUnisson = hasMasterEvent && childEvents.length > 0 && childEvents.every(evt => evt.visualVal === masterVisualVal);

  if (isUnisson) {
    const busBg = getBusNoteColor(String(track.id), String(masterVisualVal), tracks, instrumentsConfig);
    return {
      isSplit: false,
      bgColor: busBg,
      txtColor: getContrastColor(busBg),
      displayVal: String(masterVisualVal),
      leftBg: emptyStepBg,
      leftTxt: 'transparent',
      leftSym: '',
      rightBg: emptyStepBg,
      rightTxt: 'transparent',
      rightSym: '',
    };
  }

  if (hasMasterEvent || childEvents.length > 0) {
    return {
      isSplit: true,
      bgColor: emptyStepBg,
      txtColor: 'rgba(26, 26, 26, 0.4)',
      displayVal,
      leftBg: hasMasterEvent ? masterBg : emptyStepBg,
      leftTxt: hasMasterEvent ? masterTxt : 'transparent',
      leftSym: hasMasterEvent ? displayVal : '',
      rightBg: childEvents.length > 0 ? childEvents[0].bgColor : emptyStepBg,
      rightTxt: childEvents.length > 0 ? childEvents[0].txtColor : 'transparent',
      rightSym: childEvents.length > 0 ? childEvents[0].displayVal : '',
    };
  }

  return {
    isSplit: false,
    bgColor: emptyStepBg,
    txtColor: 'rgba(26, 26, 26, 0.4)',
    displayVal,
    leftBg: emptyStepBg,
    leftTxt: 'transparent',
    leftSym: '',
    rightBg: emptyStepBg,
    rightTxt: 'transparent',
    rightSym: '',
  };
}
