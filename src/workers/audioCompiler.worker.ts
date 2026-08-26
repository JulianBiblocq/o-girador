const RANDOM_POOL_SIZE = 1000;
const randomPool = Array.from({ length: RANDOM_POOL_SIZE }, () => Math.random());
let randomPoolIdx = 0;

function nextRandom(): number {
  const val = randomPool[randomPoolIdx];
  randomPoolIdx = (randomPoolIdx + 1) % RANDOM_POOL_SIZE;
  return val;
}

const instrumentIds = ['caixa', 'tarol', 'marcante', 'meiao', 'repique', 'gongue', 'agbe', 'apito'];

function buildFlatSongSchedule(
  tracks: any[],
  totalMeasures: number,
  measureTimeSigs: string[],
  instConfig: any[],
  soloPatternPlayId: number | null,
  soloPatternVariationId: string | null
): Float32Array {
  const notesList: number[] = [];
  const hasSolo = tracks.some((t: any) => t.isSolo);
  const isSoloPlayActive = soloPatternPlayId !== null;

  let accumulatedTicks = 0;
  const patternPlayCounts = new Map<string, number>();

  for (let measureIdx = 0; measureIdx < totalMeasures; measureIdx++) {
    const timeSig = measureTimeSigs[measureIdx] || '4/4';
    const parts = timeSig.split('/');
    const beats = parseInt(parts[0], 10);
    const beatUnit = parseInt(parts[1], 10);
    const maxTicks = beats * (96 / beatUnit);

    tracks.forEach((track: any, trackIdx: number) => {
      if (track.isBusFolder) return;

      const inst = instConfig[track.instrumentIdx];
      if (!inst || inst.type === 'voice') return;

      let activePattern: any = null;
      let canPlay = false;

      const isLinkedChild = track.linkedToTrackId && !track.isLinkFolder;

      if (isLinkedChild) {
        const master = tracks.find((t: any) => String(t.id) === String(track.linkedToTrackId));
        if (master) {
          if (isSoloPlayActive) {
            const pattern = master.patterns.find((p: any) => p.id === soloPatternPlayId);
            if (pattern) {
              activePattern = pattern;
              canPlay = true;
            }
          } else {
            const override = track.isLinkMaster ? undefined : track.patternOverrides?.[measureIdx];
            if (override === null) {
              activePattern = null;
              canPlay = false;
            } else if (override !== undefined) {
              activePattern = master.patterns.find((p: any) => p.id === override);
              canPlay = true;
            } else {
              activePattern = master.patterns.find((p: any) => p.measureAssignments[measureIdx]);
              canPlay = true;
            }
          }
        }
      } else {
        let sourceTrack = track;
        if (track.linkedToTrackId) {
          const master = tracks.find((t: any) => String(t.id) === String(track.linkedToTrackId));
          if (master) {
            sourceTrack = master;
          }
        }

        if (isSoloPlayActive) {
          let patternIdx = track.patterns.findIndex((p: any) => p.id === soloPatternPlayId);
          if (patternIdx === -1 && sourceTrack !== track) {
            patternIdx = sourceTrack.patterns.findIndex((p: any) => p.id === soloPatternPlayId);
          }
          if (patternIdx !== -1) {
            activePattern = sourceTrack.patterns[patternIdx] || sourceTrack.patterns[0];
            canPlay = true;
          } else {
            const hasSoloPattern = track.patterns.some((p: any) => p.id === soloPatternPlayId) || 
                                   sourceTrack.patterns.some((p: any) => p.id === soloPatternPlayId);
            if (hasSoloPattern) {
              activePattern = sourceTrack.patterns.find((p: any) => p.id === soloPatternPlayId) || sourceTrack.patterns[0];
              canPlay = true;
            }
          }
        } else {
          activePattern = sourceTrack.patterns.find((p: any) => p.measureAssignments[measureIdx]);
          canPlay = true;
        }
      }

      if (!activePattern || !canPlay) return;

      const trackPatternKey = `${track.id}-${activePattern.id}`;
      const currentPlayCount = patternPlayCounts.get(trackPatternKey) || 0;
      patternPlayCounts.set(trackPatternKey, currentPlayCount + 1);

      let stepsToPlay = activePattern.activeSteps;
      let effectiveVolumes = activePattern.volumes;
      let effectiveDecays = activePattern.decays;
      let effectiveMicrotimings = activePattern.microtimings;

      // Resolve variations for this measure
      if (activePattern.variations && activePattern.variations.length > 0) {
        let matchedVariation = null;

        // 0. Si le mode solo vise spécifiquement une variation
        if (isSoloPlayActive && soloPatternPlayId === activePattern.id && soloPatternVariationId && soloPatternVariationId !== 'base' && soloPatternVariationId !== 'ensemble') {
          matchedVariation = activePattern.variations.find((v: any) => v.id === soloPatternVariationId);
        }
        // Si le mode solo vise la base, on ignore les variations
        else if (isSoloPlayActive && soloPatternPlayId === activePattern.id && soloPatternVariationId === 'base') {
          matchedVariation = null;
        }
        else {
          const isFirstTime = currentPlayCount === 0;

          // 1. Les variations 'playFirstTimeOnly' sont toujours lues la première fois qu'on rencontre le pattern (Levée), peu importe le mode Improvisation
          if (isFirstTime) {
            const firstTimeVariations = activePattern.variations.filter((v: any) => v.playFirstTimeOnly);
            if (firstTimeVariations.length > 0) {
              matchedVariation = firstTimeVariations[0];
            }
          }

          // 2. Si pas de Levée correspondante, on évalue les probabilités UNIQUEMENT SI l'improvisation est autorisée (ou si on lit un pattern en solo)
          if (!matchedVariation) {
            const allowImprov = isSoloPlayActive || (activePattern.measureAllowVariations && activePattern.measureAllowVariations[measureIdx]);
            if (allowImprov) {
              const validVariations = activePattern.variations.filter((v: any) => !v.playFirstTimeOnly);
              if (validVariations.length > 0) {
                const rand = nextRandom() * 100;
                let sum = 0;
                for (const variation of validVariations) {
                  if (rand >= sum && rand < sum + variation.probability) {
                    matchedVariation = variation;
                    break;
                  }
                  sum += variation.probability;
                }
              }
            }
          }
        }

        if (matchedVariation) {
          stepsToPlay = matchedVariation.steps;
          if (matchedVariation.volumes) effectiveVolumes = matchedVariation.volumes;
          if (matchedVariation.decays) effectiveDecays = matchedVariation.decays;
          if (matchedVariation.microtimings) effectiveMicrotimings = matchedVariation.microtimings;
        }
      }

      const stepCount = activePattern.steps;
      const ticksPerBeat = maxTicks / beats;
      const resArray = activePattern.beatResolutions || Array(beats).fill(stepCount / beats);

      let stepTickAccum = 0;
      const stepTickMap: number[] = [];
      const stepIsTupletMap: boolean[] = [];

      for (let b = 0; b < beats; b++) {
        const res = resArray[b] || (stepCount / beats);
        const ticksPerStep = ticksPerBeat / res;
        for (let r = 0; r < res; r++) {
          stepTickMap.push(Math.round(stepTickAccum + r * ticksPerStep));
          stepIsTupletMap.push(res === 3 || res === 6);
        }
        stepTickAccum += ticksPerBeat;
      }

      for (let step = 0; step < stepCount; step++) {
        const rawState = stepsToPlay[step];
        if (!rawState || rawState === 0 || rawState === '0') continue;

        const tickIdx = stepTickMap[step] !== undefined ? stepTickMap[step] : Math.floor((step * maxTicks) / stepCount);
        const statesToProcess = Array.isArray(rawState) ? rawState : [rawState];

        for (let strokeIndex = 0; strokeIndex < statesToProcess.length; strokeIndex++) {
          const state = statesToProcess[strokeIndex];
          if (!state || state === 0 || state === '0') continue;

          let targetKey: string | null = typeof state === 'string' ? state : String(state);
          let isStrong = false;

        if (inst.type === 'gongue') {
          if (state === 'G' || state === 'A') isStrong = true;
        } else if (inst.id === 'caixa' || inst.id === 'tarol') {
          if (['D', 'E', 'R', 'r', 'X', 'F', 'C'].includes(state)) isStrong = true;
        } else if (inst.id === 'marcante' || inst.id === 'meiao' || inst.id === 'repique') {
          if (['D', 'E', 'X', 'I', 'C'].includes(state)) isStrong = true;
        } else if (inst.id === 'agbe') {
          if (['D', 'E', 'S'].includes(state)) isStrong = true;
        } else {
          if (['D', 'E', 'P', 'T'].includes(state as string)) isStrong = true;
        }

        if (!targetKey) continue;

        // Normalization of legacy symbols
        if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(inst.id)) {
          if (targetKey === 't' || targetKey === 'T') targetKey = 'B';
          else if (targetKey === 'C') targetKey = 'c';
        } else if (inst.id === 'agbe' || inst.id === 'gongue') {
          if (targetKey === 't') targetKey = 'B';
        }

        let baseVol = effectiveVolumes?.[step] ?? 80;
        if (baseVol === null || isNaN(baseVol)) baseVol = 80;
        const volVariation = (nextRandom() * 2 - 1) * (baseVol * 0.15);
        let finalVol = Math.max(0, Math.min(100, baseVol + volVariation));
        if (isNaN(finalVol)) finalVol = 80;

        const stepVolMultiplier = finalVol / 100;

        let rawDecay = effectiveDecays?.[step] ?? 100;
        if (rawDecay === null || isNaN(rawDecay)) rawDecay = 100;
        let stepDecayMultiplier = rawDecay / 100;
        if (isNaN(stepDecayMultiplier) || stepDecayMultiplier < 0) stepDecayMultiplier = 1.0;

        let rawMicro = effectiveMicrotimings?.[step] ?? 0;
        if (rawMicro === null || isNaN(rawMicro)) rawMicro = 0;
        const microtimingPct = rawMicro;

        const isTuplet = stepIsTupletMap[step] || false;
        const absoluteTick = accumulatedTicks + tickIdx;

        // Pack data: trackIdx (10 bits), step (6 bits), strokeCharCode (7 bits), decayPct (7 bits), isTuplet (1 bit), isSecondStroke (1 bit)
        const strokeCharCode = targetKey.charCodeAt(0);
        const decayPct = Math.round(stepDecayMultiplier * 100);
        const isTupletBit = isTuplet ? 1 : 0;
        const isSecondStrokeBit = strokeIndex > 0 ? 1 : 0;
        const packedData = (trackIdx << 22) | (step << 16) | (strokeCharCode << 9) | (decayPct << 2) | (isTupletBit << 1) | isSecondStrokeBit;

        notesList.push(absoluteTick, packedData, stepVolMultiplier, microtimingPct);
        }
      }
    });

    accumulatedTicks += maxTicks;
  }

  // Sort notesList by absoluteTick (first element of each group of 4)
  const notesCount = notesList.length / 4;
  const indices = Array.from({ length: notesCount }, (_, i) => i);
  indices.sort((a, b) => notesList[a * 4] - notesList[b * 4]);

  const flatArray = new Float32Array(notesList.length);
  for (let i = 0; i < notesCount; i++) {
    const origIdx = indices[i];
    flatArray[i * 4] = notesList[origIdx * 4];
    flatArray[i * 4 + 1] = notesList[origIdx * 4 + 1];
    flatArray[i * 4 + 2] = notesList[origIdx * 4 + 2];
    flatArray[i * 4 + 3] = notesList[origIdx * 4 + 3];
  }

  return flatArray;
}

self.onmessage = (e: MessageEvent<any>) => {
  try {
    const { action, tracks, totalMeasures, measureTimeSigs, instConfig, soloPatternPlayId, soloPatternVariationId } = e.data;
    if (action === 'compileSong') {
      const flatArray = buildFlatSongSchedule(
        tracks,
        totalMeasures,
        measureTimeSigs,
        instConfig,
        soloPatternPlayId,
        soloPatternVariationId
      );
      // @ts-ignore
      self.postMessage({ success: true, action: 'compileSong', data: flatArray }, [flatArray.buffer]);
    }
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
