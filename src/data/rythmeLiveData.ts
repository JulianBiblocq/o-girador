export interface RhythmLivePattern {
  name: {
    fr: string;
    pt: string;
  };
  bpm: number;
  stepsPerMeasure: number;
  totalMeasures: number; // Duration of the playing phase in measures
  targetSteps: number[]; // Step indices of expected hits relative to play phase start (0-based)
}

export const rhythmLivePattern: RhythmLivePattern = {
  name: {
    fr: 'Battement de Caixa (8e de note)',
    pt: 'Batida de Caixa (Colcheias)'
  },
  bpm: 90, // Standard steady tempo
  stepsPerMeasure: 16, // Sixteenth notes
  totalMeasures: 2, // 2 measures of play
  // Expected hit steps (eighth notes: every 2 steps in 16-step measures over 2 measures)
  targetSteps: [
    0, 2, 4, 6, 8, 10, 12, 14, // Measure 1
    16, 18, 20, 22, 24, 26, 28, 30 // Measure 2
  ]
};
