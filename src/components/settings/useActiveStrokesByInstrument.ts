import { useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { instrumentsConfig } from '../../data';
import { getStrokesForInstrument } from '../../utils/instrumentStrokes';
import { TrackGroup } from '../../types';

const EMPTY_TRACKS: TrackGroup[] = [];
const EMPTY_FORCED: Record<string, boolean> = {};

function collectStepSymbols(step: unknown, out: Set<string>): void {
  if (Array.isArray(step)) {
    step.forEach((sub) => collectStepSymbols(sub, out));
    return;
  }
  if (step !== 0 && step !== '0' && typeof step === 'string' && step.trim()) {
    out.add(step.trim());
  }
}

export function useActiveStrokesByInstrument(lang: string, isLeftHanded: boolean) {
  const tracks = useSequencerStore((state) => state.tracks ?? EMPTY_TRACKS);
  const forcedStrokes = useSequencerSettingsStore((state) => state.forcedStrokes ?? EMPTY_FORCED);

  return useMemo(() => {
    const dict: Record<string, string[]> = {};
    let hasActiveVoice = false;

    tracks.forEach((t) => {
      if (t.instrumentIdx === undefined) return;
      const conf = instrumentsConfig[t.instrumentIdx];
      if (!conf) return;

      if (conf.type === 'voice') {
        const vocalUsed = t.patterns?.some((p) =>
          p.activeSteps?.some((s) => s !== 0 && s !== '' && s !== null && s !== undefined) ||
          p.preRollActiveSteps?.some((s) => s !== 0 && s !== '' && s !== null && s !== undefined)
        );
        if (vocalUsed) hasActiveVoice = true;
        return;
      }

      if (t.isBusFolder || t.isLinkFolder) return;

      const set = new Set<string>();
      let pts = t.patterns;
      if (t.linkedToTrackId && !t.isLinkFolder) {
        const pBus = tracks.find((p) => String(p.id) === String(t.linkedToTrackId) && p.isLinkFolder);
        if (pBus) pts = pBus.patterns;
      }
      pts?.forEach((p) => {
        p.activeSteps.forEach((s) => collectStepSymbols(s, set));
        p.variations?.forEach((v) => v.steps.forEach((s) => collectStepSymbols(s, set)));
      });

      const id = conf.id;
      const allStrokes = getStrokesForInstrument(conf.id, conf.type, lang, isLeftHanded);
      if (!dict[id]) dict[id] = [];
      allStrokes.forEach((strokeDef) => {
        const stroke = strokeDef.symbol;
        const isUsed = set.has(stroke);
        const forced = forcedStrokes[`${t.id}:${stroke}`];
        const isActive = forced !== undefined ? forced : isUsed;
        if (isActive && !dict[id].includes(stroke)) {
          dict[id].push(stroke);
        }
      });
    });

    if (hasActiveVoice) {
      dict.voice = ['P', 'C', '_', '0'];
    }
    return dict;
  }, [tracks, forcedStrokes, lang, isLeftHanded]);
}
