import { useMemo } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useSequencerSettingsStore } from '../../stores/useSequencerSettingsStore';
import { instrumentsConfig } from '../../data';
import { getStrokesForInstrument } from '../../utils/instrumentStrokes';
import { TrackGroup } from '../../types';

export function useActiveStrokesByInstrument(lang: string, isLeftHanded: boolean) {
  const tracks = useSequencerStore((state) => state.tracks);
  const forcedStrokes = useSequencerSettingsStore((state) => state.forcedStrokes) || {};

  return useMemo(() => {
    const dict: Record<string, string[]> = {};
    const activeTracks = tracks.filter((t) => {
      if (t.isBusFolder || t.isLinkFolder || t.instrumentIdx === undefined) return false;
      const conf = instrumentsConfig[t.instrumentIdx];
      return conf && conf.type !== 'voice';
    });

    const getActiveStrokes = (track: TrackGroup): string[] => {
      const set = new Set<string>();
      let pts = track.patterns;
      if (track.linkedToTrackId && !track.isLinkFolder) {
        const pBus = tracks.find((p) => String(p.id) === String(track.linkedToTrackId) && p.isLinkFolder);
        if (pBus) pts = pBus.patterns;
      }
      pts?.forEach((p) => {
        p.activeSteps.forEach((s) => {
          if (s !== 0 && typeof s === 'string') set.add(s);
        });
        p.variations?.forEach((v) => {
          v.steps.forEach((s) => {
            if (s !== 0 && typeof s === 'string') set.add(s);
          });
        });
      });
      return Array.from(set);
    };

    activeTracks.forEach((t) => {
      const conf = instrumentsConfig[t.instrumentIdx];
      if (conf) {
        const id = conf.id;
        const activeForTrack = getActiveStrokes(t);
        const allStrokes = getStrokesForInstrument(conf.id, conf.type, lang, isLeftHanded);
        if (!dict[id]) dict[id] = [];
        allStrokes.forEach((strokeDef) => {
          const stroke = strokeDef.symbol;
          const isUsed = activeForTrack.includes(stroke);
          const forced = forcedStrokes[`${t.id}:${stroke}`];
          const isActive = forced !== undefined ? forced : isUsed;
          if (isActive && !dict[id].includes(stroke)) {
            dict[id].push(stroke);
          }
        });
      }
    });
    return dict;
  }, [tracks, forcedStrokes, lang, isLeftHanded]);
}
