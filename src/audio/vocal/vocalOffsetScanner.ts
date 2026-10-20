/**
 * O Girador - Vocal Pattern Temporal Offset Scanner
 */

export class VocalOffsetScanner {
  public static getPatternFirstNoteOffset(pattern: any, bpm: number): number {
    const beatsPerMeasure = 4;
    const measureDurationSec = (beatsPerMeasure * 60) / bpm;

    if (pattern.preRollActiveSteps) {
      for (let i = 0; i < 16; i++) {
        const stepVal = pattern.preRollActiveSteps[i];
        if (stepVal && stepVal !== 0 && stepVal !== '0') {
          const stepDurationPreRoll = measureDurationSec / 16;
          return -measureDurationSec + (i * stepDurationPreRoll);
        }
      }
    }

    if (pattern.activeSteps) {
      const steps = pattern.steps || 16;
      for (let j = 0; j < steps; j++) {
        const stepVal = pattern.activeSteps[j];
        if (stepVal && stepVal !== 0 && stepVal !== '0') {
          const stepDurationMain = measureDurationSec / steps;
          return j * stepDurationMain;
        }
      }
    }

    return 0;
  }
}
