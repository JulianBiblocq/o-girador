import * as Tone from 'tone';

export function scheduleSectionStrokes(
  sectionTracks: any[],
  numMeasures: number,
  trackPlayers: Map<number, Map<string, Tone.Player>>,
  measureStartTimes: number[],
  measureBeats: number[],
  measureTicks: number[],
  effectiveBpm: number
): void {
  for (let t = 0; t < sectionTracks.length; t++) {
    const track = sectionTracks[t];
    if (track.isMute) continue;

    const strokePlayers = trackPlayers.get(t);
    if (!strokePlayers) continue;

    for (let m = 0; m < numMeasures; m++) {
      const measureStartTime = measureStartTimes[m];
      const beats = measureBeats[m];
      const maxTicks = measureTicks[m];
      const ticksPerBeat = maxTicks / beats;

      for (const pattern of track.patterns) {
        if (pattern.measureAssignments?.[m]) {
          const activeStps = pattern.activeSteps || [];
          const stepCount = activeStps.length;
          if (stepCount === 0) break;

          const resArray = Array(beats).fill(stepCount / beats);
          let stepTickAccum = 0;
          const stepTickMap: number[] = [];
          for (let b = 0; b < beats; b++) {
            const res = resArray[b] || (stepCount / beats);
            const tps = ticksPerBeat / res;
            for (let r = 0; r < res; r++) stepTickMap.push(Math.round(stepTickAccum + r * tps));
            stepTickAccum += ticksPerBeat;
          }

          for (let step = 0; step < stepCount; step++) {
            const state = activeStps[step];
            if (!state || state === 0 || state === '0') continue;

            const targetKey = String(state).trim();
            const player = strokePlayers.get(targetKey);
            if (player) {
              const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
              const timeSec = measureStartTime + (tickIdx / maxTicks) * beats * (60 / effectiveBpm);

              let baseVol = pattern.volumes?.[step] ?? 80;
              const baseVolNum = Array.isArray(baseVol) ? (baseVol[0] ?? 80) : (typeof baseVol === 'number' ? baseVol : 80);
              const stepVolMultiplier = baseVolNum / 100;
              const db = 40 * Math.log10(Math.max(0.0001, stepVolMultiplier));

              player.volume.setValueAtTime(db, timeSec);
              player.start(timeSec);
            }
          }
          break;
        }
      }
    }
  }
}
