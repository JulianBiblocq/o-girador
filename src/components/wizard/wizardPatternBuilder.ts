import { instrumentsConfig } from '../../data';
import { Language, Pattern, SavedSectionData, SongSection, TimeSignature } from '../../types';
import { WizardStructurePreset } from '../../stores/useWizardStore';
import {
  getWizardPatternForInstrument,
  resolveStepsPerMeasure,
  WizardPatternRole,
} from './wizardRhythmPatterns';

export interface WizardStructurePlan {
  totalMeasures: number;
  measureTimeSigs: TimeSignature[];
  songSections: SongSection[];
  stepsPerMeasure: number;
}

let wizardPatternSeq = 100;
export function allocWizardId(): number {
  wizardPatternSeq += 1;
  return Date.now() + wizardPatternSeq;
}

export function buildWizardStructurePlan(
  preset: WizardStructurePreset,
  timeSig: string,
  cloudData: SavedSectionData | null,
  cloudName: string | null,
  lang: Language
): WizardStructurePlan {
  const safeSig = (timeSig || '4/4') as TimeSignature;
  const isPt = lang === 'pt';

  if (preset === 'cloud_section' && cloudData) {
    const n = Math.max(1, cloudData.numMeasures || 1);
    const sigs = Array.from({ length: n }, (_, i) => cloudData.timeSigs?.[i] || safeSig);
    return {
      totalMeasures: n,
      measureTimeSigs: sigs,
      songSections: [{ id: 'sec_cloud', name: cloudName || 'Section', startMeasure: 0, endMeasure: n - 1, repeatCount: 1 }],
      stepsPerMeasure: resolveStepsPerMeasure(sigs[0]),
    };
  }

  if (preset === 'trad6') {
    return {
      totalMeasures: 6,
      measureTimeSigs: Array(6).fill(safeSig),
      songSections: [
        { id: 'sec_intro', name: isPt ? 'Chamada' : 'Appel', startMeasure: 0, endMeasure: 0, repeatCount: 1 },
        { id: 'sec_base', name: isPt ? 'Baque Base' : 'Base', startMeasure: 1, endMeasure: 4, repeatCount: 1 },
        { id: 'sec_virada', name: 'Virada', startMeasure: 5, endMeasure: 5, repeatCount: 1 },
      ],
      stepsPerMeasure: resolveStepsPerMeasure(safeSig),
    };
  }

  if (preset === 'bars4') {
    return {
      totalMeasures: 4,
      measureTimeSigs: Array(4).fill(safeSig),
      songSections: [{ id: 'sec_base4', name: isPt ? 'Baque Base' : 'Base', startMeasure: 0, endMeasure: 3, repeatCount: 1 }],
      stepsPerMeasure: resolveStepsPerMeasure(safeSig),
    };
  }

  return {
    totalMeasures: 1,
    measureTimeSigs: [safeSig],
    songSections: [],
    stepsPerMeasure: resolveStepsPerMeasure(safeSig),
  };
}

function makeDrumPattern(name: string, activeSteps: (string | number)[], assignments: boolean[]): Pattern {
  const n = activeSteps.length;
  return {
    id: allocWizardId(),
    name,
    steps: n,
    activeSteps: [...activeSteps],
    lyrics: Array(n).fill(''),
    notes: Array(n).fill(''),
    measureAssignments: [...assignments],
    volumes: Array(n).fill(80),
    decays: Array(n).fill(100),
    microtimings: Array(n).fill(0),
  };
}

export function buildWizardInstrumentPatterns(
  instType: string,
  plan: WizardStructurePlan,
  preset: WizardStructurePreset,
  rhythmId: string | null,
  alfaiaMode: 'bloc' | 'distinct',
  cloudData: SavedSectionData | null,
  lang: Language
): Pattern[] {
  const sig = plan.measureTimeSigs[0] || '4/4';

  if (preset === 'cloud_section' && cloudData) {
    const instIdx = instrumentsConfig.findIndex((c) => c.id === instType);
    const savedTrack = instIdx !== -1 ? cloudData.tracks.find((tr) => tr.instrumentIdx === instIdx) : undefined;
    if (savedTrack?.patterns?.length) {
      return savedTrack.patterns.map((p, idx) => ({
        ...JSON.parse(JSON.stringify(p)),
        id: allocWizardId(),
        name: p.name || `Motif ${idx + 1}`,
        measureAssignments: Array.from({ length: plan.totalMeasures }, (_, m) => Boolean(p.measureAssignments?.[m])),
      }));
    }
    return [makeDrumPattern('Base', Array(plan.stepsPerMeasure).fill(0), Array(plan.totalMeasures).fill(true))];
  }

  const getSteps = (role: WizardPatternRole) =>
    getWizardPatternForInstrument(rhythmId, instType, alfaiaMode, role, sig);

  if (preset === 'trad6') {
    return [
      makeDrumPattern(lang === 'pt' ? 'Chamada' : 'Appel', getSteps('intro'), [true, false, false, false, false, false]),
      makeDrumPattern('Base', getSteps('base'), [false, true, true, true, true, false]),
      makeDrumPattern('Virada', getSteps('virada'), [false, false, false, false, false, true]),
    ];
  }

  return [makeDrumPattern('Base', getSteps('base'), Array(plan.totalMeasures).fill(true))];
}

export function clonePatternsForLinkFolder(masterPatterns: Pattern[]): Pattern[] {
  return masterPatterns.map((p) => ({
    ...JSON.parse(JSON.stringify(p)),
    id: allocWizardId(),
  }));
}
