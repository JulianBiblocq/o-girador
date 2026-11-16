import { useWizardStore, SwingIntensities } from '../../../stores/useWizardStore';
import { useBalancoStore } from '../../../stores/useBalancoStore';
import {
  getWizardPatternForInstrument,
  resolveCloudSectionMeasureSteps,
  resolveStepsPerMeasure,
  WizardPatternRole,
} from '../wizardRhythmPatterns';
import { playWizardSpatialScheduledHit } from './wizardSpatialPreview';

export interface WizardPreviewClockState {
  stepIdx: number;
  measureIdx: number;
  nextStepTime: number;
}

function getFamilySwingIntensity(instType: string, intensities: SwingIntensities): number {
  if (instType === 'marcante' || instType === 'meiao' || instType === 'repique') return intensities.alfaias;
  if (instType === 'caixa' || instType === 'tarol') return intensities.caixas;
  if (instType === 'agbe' || instType === 'mineiro') return intensities.sementes;
  if (instType === 'gongue') return intensities.gongue;
  if (instType === 'timbal') return intensities.timbal;
  return 100;
}

export function scheduleWizardPreviewTicks(ctx: AudioContext, clock: WizardPreviewClockState): void {
  while (clock.nextStepTime < ctx.currentTime + 0.11) {
    const st = useWizardStore.getState();
    const stepsPerBar = resolveStepsPerMeasure(st.timeSig);
    const safeStep = clock.stepIdx % stepsPerBar;
    const stepSec = 60 / Math.max(40, Math.min(240, st.bpm || 96)) / 4;

    const totalBars = st.selectedCloudSectionData
      ? Math.max(1, st.selectedCloudSectionData.numMeasures || 1)
      : st.structurePreset === 'trad6'
        ? 6
        : st.structurePreset === 'bars4'
          ? 4
          : 1;

    const safeBar = clock.measureIdx % totalBars;
    const role: WizardPatternRole =
      !st.selectedCloudSectionData && st.structurePreset === 'trad6'
        ? safeBar === 0
          ? 'intro'
          : safeBar === 5
            ? 'virada'
            : 'base'
        : 'base';

    const balanco = useBalancoStore.getState().resolvePreset(st.selectedBalancoId);
    const offsets = balanco.offsets || [0, 0, 0, 0];

    st.placedInstruments.forEach((inst, idx) => {
      const steps = st.selectedCloudSectionData
        ? resolveCloudSectionMeasureSteps(st.selectedCloudSectionData, inst.instrumentType, safeBar, stepsPerBar)
        : getWizardPatternForInstrument(st.selectedBasePatternId, inst.instrumentType, st.alfaiaGroupingMode, role, st.timeSig);

      const sym = steps[safeStep];
      if (!sym || sym === 0 || sym === '0') return;

      const famPct = getFamilySwingIntensity(inst.instrumentType, st.swingIntensities);
      const offIdx = offsets.length > 4 ? safeStep % offsets.length : (safeStep % 4) % Math.max(1, offsets.length);
      const swingSec = ((offsets[offIdx] || 0) / 100) * stepSec * 0.5 * (famPct / 100);
      const hitTime = Math.max(ctx.currentTime, clock.nextStepTime + swingSec);
      const vel = safeStep % 4 === 0 ? 0.95 : 0.86;

      playWizardSpatialScheduledHit(inst.instrumentType, String(sym), inst.x, inst.y, vel, hitTime, idx);
    });

    clock.nextStepTime += stepSec;
    clock.stepIdx += 1;
    if (clock.stepIdx >= stepsPerBar) {
      clock.stepIdx = 0;
      clock.measureIdx = (safeBar + 1) % totalBars;
    }
  }
}
