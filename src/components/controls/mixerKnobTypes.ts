/**
 * Types pour les interactions avec le bouton rotatif de mixage (< 30 lignes).
 */

export interface UseMixerKnobInteractionProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  defaultValue?: number;
  onChange: (val: number) => void;
  onAudioDrag?: (val: number) => void;
  label: string;
  unit?: string;
}
