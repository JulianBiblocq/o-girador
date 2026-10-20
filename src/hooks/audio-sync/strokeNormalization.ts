import { instrumentsConfig } from '../../data';
import { isStrokeActiveByDefault } from '../../utils/instrumentStrokes';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';

export function getNormalizedStroke(instId: string, rawStroke: string): string {
  const targetKey = rawStroke.trim();
  if (['marcante', 'meiao', 'repique', 'caixa', 'tarol'].includes(instId)) {
    if (targetKey === 't' || targetKey === 'T') return 'B';
    if (targetKey === 'C') return 'c';
    if (targetKey === 'f') return 'F';
  } else if (instId === 'timbal') {
    if (targetKey === 'f') return 'F';
    if (targetKey === 'v') return 'V';
  } else if (instId === 'agbe' || instId === 'gongue') {
    if (targetKey === 't') return 'B';
  }
  return targetKey;
}

export function getActiveStrokesForTrack(t: any, allTracks?: any[]): string[] {
  const inst = instrumentsConfig[t.instrumentIdx];
  if (!inst) return [];
  
  const strokes = new Set<string>();
  
  let patternsToScan = t.patterns;
  if (t.linkedToTrackId && !t.isLinkFolder && allTracks) {
    const parentBus = allTracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
    if (parentBus) {
      patternsToScan = parentBus.patterns;
    }
  }

  if (patternsToScan) {
    patternsToScan.forEach((ptn: any) => {
      const isAssigned = ptn.measureAssignments && ptn.measureAssignments.includes(true);
      if (isAssigned) {
        if (inst.type !== 'voice') {
          if (ptn.activeSteps) {
            ptn.activeSteps.forEach((stepVal: any) => {
              if (stepVal !== undefined && stepVal !== null && stepVal !== 0 && stepVal !== '0') {
                const str = String(stepVal).trim();
                if (str !== '') {
                  strokes.add(getNormalizedStroke(inst.id, str));
                }
              }
            });
          }
          if (ptn.variations) {
            ptn.variations.forEach((varPtn: any) => {
              if (varPtn.steps) {
                varPtn.steps.forEach((stepVal: any) => {
                  if (stepVal !== undefined && stepVal !== null && stepVal !== 0 && stepVal !== '0') {
                    const str = String(stepVal).trim();
                    if (str !== '') {
                      strokes.add(getNormalizedStroke(inst.id, str));
                    }
                  }
                });
              }
            });
          }
        } else {
          if (ptn.notes) {
            ptn.notes.forEach((note: any) => {
              if (note && note.trim() !== '') {
                strokes.add(note.trim());
              }
            });
          }
        }
      }
    });
  }

  const isSlave = t.linkedToTrackId && !t.isLinkFolder && !t.isLinkMaster;
  if (isSlave && allTracks) {
    const parentBus = allTracks.find(p => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
    if (parentBus) {
      const overrides = t.patternOverrides || {};
      Object.keys(overrides).forEach((mIdxKey) => {
        const patternId = overrides[mIdxKey];
        if (patternId !== null && patternId !== undefined) {
          const childPattern = parentBus.patterns?.find((p: any) => p.id === patternId);
          if (childPattern && childPattern.activeSteps) {
            childPattern.activeSteps.forEach((stepVal: any) => {
              if (stepVal !== undefined && stepVal !== null && stepVal !== 0 && stepVal !== '0') {
                const str = String(stepVal).trim();
                if (str !== '') {
                  strokes.add(getNormalizedStroke(inst.id, str));
                }
              }
            });
          }
        }
      });
    }
  }

  const forcedStrokes = useSequencerSettingsStore.getState().forcedStrokes || {};
  if (inst && inst.colors) {
    Object.keys(inst.colors).forEach((stroke) => {
      if (stroke !== 'text') {
        const forced = forcedStrokes[`${t.id}:${stroke}`];
        if (forced === true || (forced === undefined && isStrokeActiveByDefault(inst.id, stroke))) {
          strokes.add(getNormalizedStroke(inst.id, stroke));
        }
      }
    });
  }

  return Array.from(strokes).sort();
}
