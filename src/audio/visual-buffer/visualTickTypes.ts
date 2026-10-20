export type TickCallback = (detail: any) => void;

export interface SyncEngineTarget {
  currentStep: number;
  currentMeasure: number;
  [key: string]: any;
}

export interface VisualTickEvent {
  drawTime: number;
  step: number;
  measure: number;
  maxTicks: number;
  ratio: number;
  visualStep16: number;
  visualStep12: number;
  time: number;
  iteration: number;
  measureStartTime?: number;
  measureDuration?: number;
  targetStartTime?: number;
  isPreRoll?: boolean;
  preRollMeasureIndex?: number;
  preRollTotalMeasures?: number;
  preRollBeat?: number;
}

export interface VisualHitTriggerEvent {
  triggerTime: number;
  trackId: number;
  stepIdx: number;
  strokeCode: number;
}
