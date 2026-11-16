import { dbToFaderPosition, faderPositionToGain } from '../../utils/audio-math/faderMath';

export interface WizardSpatialMix {
  panPct: number;
  panNorm: number;
  faderPos: number;
  reverbSend: number;
  linearGain: number;
}

const ROLE_NOMINAL_TRIM_DB: Record<string, number> = {
  marcante: 0.0,
  meiao: -0.8,
  repique: -1.2,
  caixa: -1.5,
  tarol: -2.0,
  gongue: -1.5,
  timbal: -1.0,
  agbe: -2.0,
  mineiro: -2.5,
};

/**
 * Calcule le panoramique stéréo (X) et l'atténuation/profondeur (Y) sur La Place.
 * Mestre au centre-bas (x=50, y=100). Fader calé sous l'unité (75 = 0.0 dB), zéro saturation.
 */
export function computeWizardSpatialMix(x: number, y: number, instrumentType: string): WizardSpatialMix {
  const safeX = Math.max(0, Math.min(100, Number.isFinite(x) ? x : 50));
  const safeY = Math.max(0, Math.min(100, Number.isFinite(y) ? y : 65));

  const panPct = Math.max(-85, Math.min(85, Math.round((safeX - 50) * 1.8)));
  const panNorm = Math.max(-0.8, Math.min(0.8, (panPct / 100) * 0.8));

  const depthRatio = Math.max(0, Math.min(1, (100 - safeY) / 88));
  const roleTrimDb = ROLE_NOMINAL_TRIM_DB[instrumentType] ?? -1.5;
  const depthDb = -depthRatio * 5.5;
  const targetDb = Math.max(-14, Math.min(0, roleTrimDb + depthDb));

  const faderPos = Math.round(dbToFaderPosition(targetDb));
  const reverbSend = Math.round(8 + depthRatio * 34);
  const linearGain = faderPositionToGain(faderPos);

  return { panPct, panNorm, faderPos, reverbSend, linearGain };
}

export const WIZard_DEFAULT_PREVIEW_STROKE: Record<string, string> = {
  marcante: 'D',
  meiao: 'D',
  repique: 'D',
  caixa: 'D',
  tarol: 'D',
  gongue: 'G',
  agbe: 'D',
  mineiro: 'P',
  timbal: 'A',
};
