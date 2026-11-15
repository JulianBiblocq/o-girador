import { instrumentAudioConfigs } from '../../data/audioConfig';
import { instrumentsConfig } from '../../data';
import type { SavedSectionData } from '../../types';
import {
  STUDIO_BASE_GRIDS,
  STUDIO_INTRO_GRID,
  STUDIO_VIRADA_GRID,
  WizardPatternRole,
  WizardRhythmId,
} from './patterns/wizardStudioGrids';

export type { WizardPatternRole, WizardRhythmId };

export const WIZARD_RHYTHM_LABELS: Record<WizardRhythmId, string> = {
  luanda: 'Baque Luanda',
  trovao: 'Baque Trovão',
  martelo: 'Baque Martelo',
  arrasto: 'Baque Arrasto',
};

export function resolveStepsPerMeasure(timeSig: string): number {
  const beats = parseInt(String(timeSig || '4/4').split('/')[0], 10);
  return Number.isFinite(beats) && beats > 0 ? beats * 4 : 16;
}

function resizeStepArray(raw: (string | number)[], targetSteps: number): (string | number)[] {
  if (raw.length === targetSteps) return [...raw];
  const out: (string | number)[] = Array(targetSteps).fill(0);
  for (let i = 0; i < targetSteps; i++) {
    out[i] = raw[i % raw.length] ?? 0;
  }
  return out;
}

export function getWizardPatternForInstrument(
  rhythmId: string | null,
  instType: string,
  alfaiaMode: 'bloc' | 'distinct' = 'bloc',
  role: WizardPatternRole = 'base',
  timeSig = '4/4'
): (string | number)[] {
  const stepCount = resolveStepsPerMeasure(timeSig);
  if (!rhythmId || !(rhythmId in STUDIO_BASE_GRIDS)) {
    return Array(stepCount).fill(0);
  }

  const isAlfaia = instType === 'marcante' || instType === 'meiao' || instType === 'repique';
  const lookupRole = isAlfaia && alfaiaMode === 'bloc' ? 'marcante' : instType;

  const gridMap =
    role === 'intro'
      ? STUDIO_INTRO_GRID
      : role === 'virada'
        ? STUDIO_VIRADA_GRID
        : STUDIO_BASE_GRIDS[rhythmId as WizardRhythmId];

  const base16 = gridMap[lookupRole] || Array(16).fill(0);
  const adapted = resizeStepArray(base16, stepCount);

  const instConfig = instrumentAudioConfigs.find((c) => c.id === instType);
  if (!instConfig) return Array(stepCount).fill(0);
  const validStrokes = new Set(instConfig.strokes.map((s) => s.symbol));

  return adapted.map((step) => {
    if (step === 0 || step === '0' || step === '') return 0;
    return validStrokes.has(String(step)) ? step : 0;
  });
}

export const getBasePatternForInstrument = (rhythmId: string, instType: string): (string | number)[] =>
  getWizardPatternForInstrument(rhythmId, instType, 'distinct', 'base', '4/4');

export function resolveCloudSectionMeasureSteps(
  cloudData: SavedSectionData,
  instType: string,
  measureIdx: number,
  targetSteps: number
): (string | number)[] {
  const instIdx = instrumentsConfig.findIndex((c) => c.id === instType);
  if (instIdx === -1) return Array(targetSteps).fill(0);
  const savedTrack = cloudData.tracks.find((t) => t.instrumentIdx === instIdx);
  if (!savedTrack?.patterns?.length) return Array(targetSteps).fill(0);

  const safeM = measureIdx % Math.max(1, cloudData.numMeasures || 1);
  const ptn = savedTrack.patterns.find((p) => p.measureAssignments?.[safeM]) || savedTrack.patterns[0];
  if (!ptn?.activeSteps?.length) return Array(targetSteps).fill(0);

  const out: (string | number)[] = Array(targetSteps).fill(0);
  for (let i = 0; i < targetSteps; i++) {
    const cell = ptn.activeSteps[i];
    const sym = Array.isArray(cell) ? cell[0] : cell;
    out[i] = sym && sym !== '0' ? sym : 0;
  }
  return out;
}
