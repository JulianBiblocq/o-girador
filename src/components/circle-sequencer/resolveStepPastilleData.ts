import { InstrumentConfig, TrackGroup } from '../../types';
import { getVisualStrokeSymbol, isDarkText } from '../../data';
import { formatStrokeSymbol } from './percussionSatelliteHelpers';

export interface StepPastilleData {
  hasEvent: boolean;
  isSplit: boolean;
  isRightHalfOnly: boolean;
  leftFillColor: string;
  rightFillColor: string;
  leftText: string;
  rightText: string;
  leftTxtColor: string;
  rightTxtColor: string;
  radiusSize: number;
}

export function resolveStepPastilleData(
  masterState: any,
  _satellites: unknown[],
  currentInst: InstrumentConfig,
  _track: TrackGroup,
  _localRawTracks: TrackGroup[],
  _instrumentsConfig: any,
  localLeftHanded: boolean,
  dynamicScale: number
): StepPastilleData {
  const hasMasterEvent =
    masterState !== 0 &&
    masterState !== '0' &&
    masterState !== '' &&
    masterState !== undefined &&
    masterState !== null;

  if (!hasMasterEvent) {
    return {
      hasEvent: false,
      isSplit: false,
      isRightHalfOnly: false,
      leftFillColor: '',
      rightFillColor: '',
      leftText: '',
      rightText: '',
      leftTxtColor: '',
      rightTxtColor: '',
      radiusSize: 6 * dynamicScale,
    };
  }

  let masterText = '';
  let masterFillColor = 'rgba(255,255,255,0.2)';
  let masterTxtColor = '#f4ecd8';
  let masterRadiusSize = 12 * dynamicScale;

  const visualState = getVisualStrokeSymbol(masterState, localLeftHanded, currentInst.id);
  const visualStateStr = String(visualState);
  if (visualState !== 0 && visualState !== '0') {
    const isAccent = visualStateStr === visualStateStr.toUpperCase();
    masterRadiusSize = (isAccent ? 15 : 12) * dynamicScale;
    const primaryVisual = Array.isArray(visualState) ? visualState[0] : visualState;
    masterFillColor =
      currentInst.colors && currentInst.colors[primaryVisual as string]
        ? currentInst.colors[primaryVisual as string]
        : currentInst.color || '#fff';
    masterText = formatStrokeSymbol(currentInst.id, visualStateStr);
    masterTxtColor = isDarkText(currentInst.id, String(masterState)) ? '#1a1a1a' : '#f4ecd8';
  } else if (visualStateStr === '0' || visualStateStr === '-') {
    masterRadiusSize = 12 * dynamicScale;
    masterFillColor = '#ab5318';
    masterText = '-';
    masterTxtColor = '#1a1a1a';
  }

  return {
    hasEvent: true,
    isSplit: false,
    isRightHalfOnly: false,
    leftFillColor: masterFillColor,
    rightFillColor: '',
    leftText: masterText,
    rightText: '',
    leftTxtColor: masterTxtColor,
    rightTxtColor: '',
    radiusSize: masterRadiusSize,
  };
}
