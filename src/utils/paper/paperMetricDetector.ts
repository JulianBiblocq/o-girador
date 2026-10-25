/**
 * Détecteur mathématique de métrique et subdivisions par comptage des barres et cellules (< 130 lignes).
 */
import { DetectedMetric } from '../../types/paperWorkshop.types';

export function detectMetricFromResolutions(resolutions: number[], fallbackTimeSig = '4/4'): DetectedMetric {
  if (!resolutions || resolutions.length === 0) {
    return buildFallbackMetric(fallbackTimeSig);
  }

  const totalSteps = resolutions.reduce((a, b) => a + b, 0);
  const beatsCount = resolutions.length;
  const isUniform = resolutions.every((r) => r === resolutions[0]);
  const res0 = resolutions[0];

  // 4 temps de 4 cellules = 16 pas (4/4 classique)
  if (beatsCount === 4 && isUniform && res0 === 4) {
    return { timeSignature: '4/4', steps: 16, beatResolutions: [4, 4, 4, 4], isMixed: false, measuresCount: 1, description: '4/4 (16 pas)' };
  }
  // 2 temps de 4 cellules = 8 pas (2/4 binaire)
  if (beatsCount === 2 && isUniform && res0 === 4) {
    return { timeSignature: '2/4', steps: 8, beatResolutions: [4, 4], isMixed: false, measuresCount: 1, description: '2/4 (8 pas)' };
  }
  // 3 temps de 4 cellules = 12 pas (3/4 binaire)
  if (beatsCount === 3 && isUniform && res0 === 4) {
    return { timeSignature: '3/4', steps: 12, beatResolutions: [4, 4, 4], isMixed: false, measuresCount: 1, description: '3/4 (12 pas)' };
  }
  // 4 temps de 3 cellules = 12 pas (12/8 ternaire)
  if (beatsCount === 4 && isUniform && res0 === 3) {
    return { timeSignature: '12/8', steps: 12, beatResolutions: [3, 3, 3, 3], isMixed: false, measuresCount: 1, description: '12/8 (12 pas)' };
  }
  // 2 temps de 3 cellules = 6 pas (6/8 ternaire)
  if (beatsCount === 2 && isUniform && res0 === 3) {
    return { timeSignature: '6/8', steps: 6, beatResolutions: [3, 3], isMixed: false, measuresCount: 1, description: '6/8 (6 pas)' };
  }
  // 4 temps de 6 cellules = 24 pas (4/4 sextolets)
  if (beatsCount === 4 && isUniform && res0 === 6) {
    return { timeSignature: '4/4', steps: 24, beatResolutions: [6, 6, 6, 6], isMixed: false, measuresCount: 1, description: '4/4 Sextolets (24 pas)' };
  }
  // 8 temps de 4 cellules = 32 pas (4/4 sur 2 mesures)
  if (beatsCount === 8 && isUniform && res0 === 4) {
    return { timeSignature: '4/4', steps: 32, beatResolutions: Array(8).fill(4), isMixed: false, measuresCount: 2, description: '4/4 (2 mesures / 32 pas)' };
  }
  // Subdivisions mixtes (ex: [6, 6, 4, 4] = 20 pas)
  if (!isUniform) {
    return {
      timeSignature: '4/4',
      steps: totalSteps,
      beatResolutions: [...resolutions],
      isMixed: true,
      measuresCount: 1,
      description: `4/4 Mixte [${resolutions.join(',')}] (${totalSteps} pas)`,
    };
  }

  return {
    timeSignature: fallbackTimeSig,
    steps: totalSteps,
    beatResolutions: [...resolutions],
    isMixed: false,
    measuresCount: 1,
    description: `${fallbackTimeSig} (${totalSteps} pas)`,
  };
}

export function detectSignatureFromBeatBars(beatsCells: string[][], fallbackTimeSig = '4/4'): DetectedMetric {
  if (!beatsCells || beatsCells.length === 0) {
    return buildFallbackMetric(fallbackTimeSig);
  }
  const resolutions = beatsCells.map((cells) => cells.length).filter((len) => len > 0);
  return detectMetricFromResolutions(resolutions, fallbackTimeSig);
}

export function detectMetricFromTotalSteps(totalSteps: number, fallbackTimeSig = '4/4'): DetectedMetric {
  if (totalSteps === 8) return { timeSignature: '2/4', steps: 8, beatResolutions: [4, 4], isMixed: false, measuresCount: 1, description: '2/4 (8 pas)' };
  if (totalSteps === 12) {
    if (fallbackTimeSig === '12/8') return { timeSignature: '12/8', steps: 12, beatResolutions: [3, 3, 3, 3], isMixed: false, measuresCount: 1, description: '12/8 (12 pas)' };
    return { timeSignature: '3/4', steps: 12, beatResolutions: [4, 4, 4], isMixed: false, measuresCount: 1, description: '3/4 (12 pas)' };
  }
  if (totalSteps === 6) return { timeSignature: '6/8', steps: 6, beatResolutions: [3, 3], isMixed: false, measuresCount: 1, description: '6/8 (6 pas)' };
  if (totalSteps === 20) return { timeSignature: '4/4', steps: 20, beatResolutions: [6, 6, 4, 4], isMixed: true, measuresCount: 1, description: '4/4 Mixte [6,6,4,4] (20 pas)' };
  if (totalSteps === 24) return { timeSignature: '4/4', steps: 24, beatResolutions: [6, 6, 6, 6], isMixed: false, measuresCount: 1, description: '4/4 Sextolets (24 pas)' };
  if (totalSteps === 32) return { timeSignature: '4/4', steps: 32, beatResolutions: Array(8).fill(4), isMixed: false, measuresCount: 2, description: '4/4 (2 mesures / 32 pas)' };
  return { timeSignature: fallbackTimeSig, steps: totalSteps, beatResolutions: [4, 4, 4, 4], isMixed: false, measuresCount: 1, description: `${fallbackTimeSig} (${totalSteps} pas)` };
}

function buildFallbackMetric(sig: string): DetectedMetric {
  switch (sig) {
    case '2/4': return { timeSignature: '2/4', steps: 8, beatResolutions: [4, 4], isMixed: false, measuresCount: 1, description: '2/4 (8 pas)' };
    case '3/4': return { timeSignature: '3/4', steps: 12, beatResolutions: [4, 4, 4], isMixed: false, measuresCount: 1, description: '3/4 (12 pas)' };
    case '12/8': return { timeSignature: '12/8', steps: 12, beatResolutions: [3, 3, 3, 3], isMixed: false, measuresCount: 1, description: '12/8 (12 pas)' };
    case '6/8': return { timeSignature: '6/8', steps: 6, beatResolutions: [3, 3], isMixed: false, measuresCount: 1, description: '6/8 (6 pas)' };
    case '4/4':
    default:
      return { timeSignature: '4/4', steps: 16, beatResolutions: [4, 4, 4, 4], isMixed: false, measuresCount: 1, description: '4/4 (16 pas)' };
  }
}

export function checkLineLengthDiscrepancy(
  rawLengths: number[],
  expectedSteps = 16
): { hasDiscrepancy: boolean; discordantIndices: number[] } {
  const discordantIndices: number[] = [];
  rawLengths.forEach((len, idx) => {
    if (len !== expectedSteps) discordantIndices.push(idx);
  });
  return { hasDiscrepancy: discordantIndices.length > 0, discordantIndices };
}
