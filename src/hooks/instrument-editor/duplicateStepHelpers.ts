
import * as Tone from 'tone';
import { audioEngine } from '../useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getSculptNumber } from '../../components/instrument-editor/grid/gridConstants';
import { Pattern } from '../../types';

export function duplicateVocalStep(
  trackId: number,
  pattern: Pattern,
  srcIdx: number,
  targetIdx: number,
  instrumentId: string
) {
  const srcNote = pattern.notes?.[srcIdx] || '';
  const srcStep = pattern.activeSteps?.[srcIdx];
  const isSrcActive = srcStep !== 0 && srcStep !== '0' && srcStep !== undefined;
  const vocalSym = isSrcActive ? srcStep : (instrumentId === 'puxador' || String(trackId) === 'puxador' ? 'P' : 'C');

  useSequencerStore.getState().setTracks(prev => prev.map(t => {
    if (t.id === trackId || String(t.id) === String(trackId)) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === pattern.id || String(p.id) === String(pattern.id)) {
            const nextActiveSteps = [...p.activeSteps];
            const nextNotes = [...(p.notes || Array(p.steps).fill(''))];
            const nextLyrics = [...(p.lyrics || Array(p.steps).fill(''))];
            if (!srcNote && !isSrcActive) {
              nextActiveSteps[targetIdx] = 0; nextNotes[targetIdx] = ''; nextLyrics[targetIdx] = '';
            } else {
              nextActiveSteps[targetIdx] = vocalSym; nextNotes[targetIdx] = srcNote; nextLyrics[targetIdx] = '';
            }
            const cloneSculpt = (val: any) => Array.isArray(val) ? [...val] : val;
            const nextVols = p.volumes ? [...p.volumes] : undefined;
            if (nextVols && p.volumes?.[srcIdx] !== undefined) nextVols[targetIdx] = cloneSculpt(p.volumes[srcIdx]);
            const nextDecs = p.decays ? [...p.decays] : undefined;
            if (nextDecs && p.decays?.[srcIdx] !== undefined) nextDecs[targetIdx] = cloneSculpt(p.decays[srcIdx]);
            const nextMicros = p.microtimings ? [...p.microtimings] : undefined;
            if (nextMicros && p.microtimings?.[srcIdx] !== undefined) nextMicros[targetIdx] = cloneSculpt(p.microtimings[srcIdx]);
            return { ...p, activeSteps: nextActiveSteps, notes: nextNotes, lyrics: nextLyrics, ...(nextVols ? { volumes: nextVols } : {}), ...(nextDecs ? { decays: nextDecs } : {}), ...(nextMicros ? { microtimings: nextMicros } : {}) };
          }
          return p;
        })
      };
    }
    return t;
  }));

  if (audioEngine && srcNote && srcNote.trim() !== '') {
    try {
      const engine = audioEngine;
      if (typeof engine.triggerVoiceAttackRelease === 'function') engine.triggerVoiceAttackRelease(srcNote, 0.18);
      else if (typeof engine.triggerVoicePitch === 'function') engine.triggerVoicePitch(srcNote, 0.8);
      setTimeout(() => { try { if (typeof engine.releaseVoicePitch === 'function') engine.releaseVoicePitch(srcNote); } catch (_) {} }, 180);
    } catch (_) {}
  }
}

export function duplicatePercussionStep(
  trackId: number,
  pattern: Pattern,
  selectedVariationId: string | null,
  srcIdx: number,
  targetIdx: number
) {
  const srcVal = pattern.activeSteps?.[srcIdx] ?? 0;
  const targetVal = Array.isArray(srcVal) ? ([...srcVal] as [string, string]) : srcVal;
  const cloneSculpt = (val: any) => Array.isArray(val) ? [...val] : val;

  useSequencerStore.getState().setTracks(prev => prev.map(t => {
    if (t.id === trackId || String(t.id) === String(trackId)) {
      return {
        ...t,
        patterns: t.patterns.map(p => {
          if (p.id === pattern.id || String(p.id) === String(pattern.id)) {
            if (selectedVariationId) {
              const nextVars = (p.variations || []).map(v => {
                if (v.id === selectedVariationId) {
                  const nextSteps = [...(v.steps || p.activeSteps)]; nextSteps[targetIdx] = targetVal;
                  const nextVols = (v.volumes || p.volumes) ? [...(v.volumes || p.volumes)!] : undefined;
                  if (nextVols && (v.volumes || p.volumes)?.[srcIdx] !== undefined) nextVols[targetIdx] = cloneSculpt((v.volumes || p.volumes)![srcIdx]);
                  return { ...v, steps: nextSteps, ...(nextVols ? { volumes: nextVols } : {}) };
                }
                return v;
              });
              return { ...p, variations: nextVars };
            }
            const nextActiveSteps = [...p.activeSteps]; nextActiveSteps[targetIdx] = targetVal;
            const nextVols = p.volumes ? [...p.volumes] : undefined;
            if (nextVols && p.volumes?.[srcIdx] !== undefined) nextVols[targetIdx] = cloneSculpt(p.volumes[srcIdx]);
            return { ...p, activeSteps: nextActiveSteps, ...(nextVols ? { volumes: nextVols } : {}) };
          }
          return p;
        })
      };
    }
    return t;
  }));

  if (audioEngine && targetVal && targetVal !== 0 && targetVal !== '0') {
    try {
      const vol = getSculptNumber(pattern?.volumes?.[srcIdx], 80) / 100;
      const dec = getSculptNumber(pattern?.decays?.[srcIdx], 100) / 100;
      const stroke = Array.isArray(targetVal) ? targetVal[0] : targetVal;
      if (stroke && stroke !== '0') audioEngine.playNote(trackId, String(stroke), Tone.now(), vol, dec);
    } catch (_) {}
  }
}
