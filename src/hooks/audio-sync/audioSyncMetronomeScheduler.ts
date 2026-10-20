import { playNativeMetroClick } from './audioEngineNodes';
import { getCachedMarkers } from './audioParamsCache';

interface ScheduleMetronomeProps {
  time: number;
  stepIdx: number;
  currentMeasureSig: string;
  currentTicks: number;
  isMetroOn: boolean;
  metroVolume: number;
  metroSound: string;
}

export function scheduleMetronomeClick({
  time,
  stepIdx,
  currentMeasureSig,
  currentTicks,
  isMetroOn,
  metroVolume,
  metroSound,
}: ScheduleMetronomeProps): void {
  const markers = getCachedMarkers(currentMeasureSig, currentTicks);
  if (isMetroOn && markers.includes(stepIdx)) {
    if (metroVolume > 0) {
      const isAccent = stepIdx === 0;
      playNativeMetroClick(time, isAccent, metroSound, 1.8);
    }
  }
}
