
import { Pattern, TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { isSequencerVisibleTrack, isToadaBus } from '../../stores/useSequencerStore';
import { sortTracksByRodaOrder } from './sortTracksByRodaOrder';
import { getTrackRadius } from './circleGeometry';

export function clearStepAtCanvasCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement | null,
  stateRef: React.MutableRefObject<any>,
  getLiveActivePatternId: (track: TrackGroup) => number | null,
  onStepChange: (trackId: number, patternId: number, stepIdx: number, newState: any, lyric?: string, note?: string) => void
): void {
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = (clientX - rect.left) * (1200 / rect.width);
  const mouseY = (clientY - rect.top) * (1200 / rect.height);

  const centerX = 600;
  const centerY = 600;
  const dx = mouseX - centerX;
  const dy = mouseY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 55) return;

  const currentTracks = stateRef.current.tracks;
  const currentRawTracks = stateRef.current.rawTracks;
  const currentRodaOrder = stateRef.current.rodaTrackOrder;
  const sortedCurrentTracks = sortTracksByRodaOrder(currentTracks, currentRodaOrder);

  const activeVisibleTracksToDraw = sortedCurrentTracks.filter(t => {
    if (t.isHidden) return false;
    if (!isSequencerVisibleTrack(t, currentTracks)) return false;
    return instrumentsConfig[t.instrumentIdx]?.id !== 'apito';
  });

  for (let visibleIdx = 0; visibleIdx < activeVisibleTracksToDraw.length; visibleIdx++) {
    const track = activeVisibleTracksToDraw[visibleIdx];
    const isToada = isToadaBus(track);
    let activePattern: Pattern | null | undefined = null;
    let ownerTrack = track;
    const activePatternId = getLiveActivePatternId(track);
    if (activePatternId === null) continue;

    if (isToada) {
      const pux = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      if (pux) {
        activePattern = pux.patterns.find(p => p.id === activePatternId);
        if (activePattern) ownerTrack = pux;
      }
      if (!activePattern && coro) {
        activePattern = coro.patterns.find(p => p.id === activePatternId);
        if (activePattern) ownerTrack = coro;
      }
    } else {
      activePattern = track.patterns.find(p => p.id === activePatternId);
    }

    if (!activePattern) continue;
    const tRad = getTrackRadius(visibleIdx, activeVisibleTracksToDraw.length);

    if (Math.abs(distance - tRad) < 18) {
      let clickAngle = Math.atan2(dy, dx) + Math.PI / 2;
      if (clickAngle < 0) clickAngle += Math.PI * 2;
      const stepAngleSize = (Math.PI * 2) / activePattern.steps;

      for (let i = 0; i < activePattern.steps; i++) {
        const targetAngle = i * stepAngleSize;
        let angleDiff = Math.abs(clickAngle - targetAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff < stepAngleSize / 2) {
          const currentVal = activePattern.activeSteps[i];
          if (currentVal !== 0 && currentVal !== '0') {
            onStepChange(ownerTrack.id, activePattern.id, i, 0, '', '');
          }
          return;
        }
      }
    }
  }
}
