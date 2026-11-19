export interface FocusBrickStepModel {
  stepIdx: number;
  beatIdx: number;
  subIdx: number;
  isBeatStart: boolean;
  isActive: boolean;
  isSplit: boolean;
  isVariationStep: boolean;
  displaySymbol: string;
  fillColor: string;
  textColor: string;
  rightSymbol: string;
  rightFillColor: string;
  rightTextColor: string;
  nominalBalancoPct: number;
  manualMicroPct: number;
  baseNormPos: number;
}

export interface FocusMeasureStepsModel {
  trackId: number | null;
  trackName: string;
  primaryColor: string;
  contrastColor: string;
  socketStrokeColor: string;
  timeSig: string;
  beatsCount: number;
  stepCount: number;
  presetName: string;
  nominalIntensityPct: number;
  steps: FocusBrickStepModel[];
}
