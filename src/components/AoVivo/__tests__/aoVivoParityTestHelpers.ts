import { instrumentsConfig } from '../../../data';
import { MeasureVariationSnapshot } from '../../../hooks/audio-sync/rollMeasureVariations';
import { Track } from '../../../types';
import { resolveTrackFromPackedData } from '../../../workers/compiler/compiledTrackIdResolver';
import { normalizeStrokeKey } from '../../../workers/compiler/stepNotePacker';

export function createAoVivo10BarEnsemble(): { tracks: Track[]; measureTimeSigs: string[]; measureBpms: number[] } {
  const base16: any[] = ['D', 0, ['e', 'D'], 0, 'E', 0, 'A', 0, 'D', 0, 0, 0, 'E', 0, 'D', 0];
  const first16: any[] = ['C', 0, 'D', 0, 'C', 0, 'E', 0, 'D', 'e', 'D', 'e', 'A', 0, 'D', 0];
  const stoch16: any[] = [0, ['e', 'D'], 0, 'D', 'A', 0, 'E', 0, 'D', 0, ['d', 'E'], 0, 'D', 'e', 'D', 0];
  const p32Base: any[] = [...Array(16).fill(0).map((_, i) => (i % 4 === 0 ? 'D' : 0)), ...Array(16).fill(0).map((_, i) => (i % 4 === 2 ? 'E' : 0))];
  const p32Var: any[] = [...Array(16).fill(0).map((_, i) => (i % 2 === 0 ? 'D' : 0)), ...Array(16).fill(0).map((_, i) => (i % 2 === 1 ? 'A' : 0))];

  const assignMain = [true, true, true, true, false, false, false, true, true, true];
  const allowMain = [true, true, true, false, false, false, false, true, true, true];
  const assign32 = [false, false, false, false, true, true, false, false, false, false];

  const marcante: any = {
    id: 10, instrumentIdx: 0, isMute: false, isSolo: false, isLinkMaster: true, linkedToTrackId: 10,
    patterns: [
      {
        id: 101, name: 'Marcante 16', steps: 16, timeSignature: '4/4',
        measureAssignments: assignMain, measureAllowVariations: allowMain, activeSteps: base16,
        variations: [
          { id: 'm-1vez', name: 'Appel', steps: first16, probability: 100, playFirstTimeOnly: true },
          { id: 'm-stoch', name: 'Dobra', steps: stoch16, probability: 55, playFirstTimeOnly: false },
        ],
      },
      {
        id: 102, name: 'Phrase 32', steps: 32, timeSignature: '4/4',
        measureAssignments: assign32, measureAllowVariations: Array(10).fill(true), activeSteps: p32Base,
        variations: [{ id: 'm-32v', name: 'Phrase 32 Var', steps: p32Var, probability: 65, playFirstTimeOnly: false }],
      },
    ],
  };

  const meiao: any = {
    id: 11, instrumentIdx: 1, isMute: false, isSolo: false, isLinkMaster: false, linkedToTrackId: 10,
    patternOverrides: { 1: 901, 2: null },
    patterns: [
      {
        id: 901, name: 'Override Meião', steps: 16, timeSignature: '4/4',
        measureAssignments: Array(10).fill(false),
        activeSteps: ['A', 0, 'D', 0, 'A', 0, 'D', 0, 'E', 0, 'D', 0, 'A', 0, 0, 'D'],
      },
    ],
  };

  const caixa: any = {
    id: 12, instrumentIdx: 3, isMute: false, isSolo: false,
    patterns: [{
      id: 301, name: 'Caixa Rimshot', steps: 16, timeSignature: '4/4',
      measureAssignments: [true, true, true, true, true, true, false, true, true, true],
      measureAllowVariations: Array(10).fill(true),
      activeSteps: ['A', 'e', 'd', 'e', 'a', 'd', 'e', 'd', 'R', 0, 'D', 'e', 'A', 'e', 'd', 'R'],
      variations: [{ id: 'cx-v', name: 'Caixa Var', steps: ['R', 0, 'A', 'e', 'd', 'a', 'D', 'e', 'R', 0, 'a', 'd', 'A', 0, 'R', 0], probability: 50 }],
    }],
  };

  const agbe: any = {
    id: 13, instrumentIdx: 6, isMute: false, isSolo: false,
    patterns: [{
      id: 401, name: 'Agbê Xequerê', steps: 16, timeSignature: '4/4',
      measureAssignments: [true, true, true, true, true, true, false, true, true, true],
      activeSteps: ['D', 0, 'e', 'd', 'S', 0, 'V', 0, 'D', 'e', 'B', 0, 'D', 0, 'E', 0],
    }],
  };

  return { tracks: [marcante, meiao, caixa, agbe], measureTimeSigs: Array(10).fill('4/4'), measureBpms: Array(10).fill(108) };
}

export function extractAudioMeasureStrokes(
  track: Track, tracks: Track[], measureStartTick: number, maxTicks: number, flat: Float32Array, snap: MeasureVariationSnapshot
): string[] {
  const out: string[] = [];
  const src: ArrayLike<number> = snap.variedTrackIds.has(track.id) ? snap.variationNotes : flat;
  const srcObj: object = snap.variedTrackIds.has(track.id) ? (snap.variationNotes as any) : flat;
  for (let i = 0; i < src.length; i += 4) {
    const absTick = src[i];
    if (absTick < measureStartTick || absTick >= measureStartTick + maxTicks) continue;
    const packed = src[i + 1];
    const resolved = resolveTrackFromPackedData(packed, tracks, srcObj);
    if (!resolved || resolved.id !== track.id) continue;
    const step = (packed >> 16) & 0x3f;
    const sym = String.fromCharCode((packed >> 9) & 0x7f);
    const sub = packed & 1;
    out.push(`${step}:${sub}:${sym}`);
  }
  return out.sort();
}

export function extractAoVivoSliceStrokes(track: Track, slice: any[]): string[] {
  const inst = instrumentsConfig[track.instrumentIdx];
  const out: string[] = [];
  slice.forEach((raw, step) => {
    if (!raw || raw === 0 || raw === '0') return;
    const arr = Array.isArray(raw) ? raw : [raw];
    arr.forEach((tok, idx) => {
      const key = normalizeStrokeKey(inst, tok);
      if (key) out.push(`${step}:${idx > 0 ? 1 : 0}:${key}`);
    });
  });
  return out.sort();
}
