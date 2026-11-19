import assert from 'node:assert/strict';
import {
  angleToNormalizedRodaRatio,
  computeRodaStepAngles,
  findStepIndexAtNormalizedP,
  getRodaMeasureGeometry,
  getRodaStepDurationTicks,
  resolveActiveBeatResolutions,
} from '../rodaTimeSigGeometry';
import { getMarkers, getMaxTicks } from '../../universes/maracatu/presets/timingMarkers';
import { buildMeasureStepGrid } from '../../workers/compiler/measureStepGridHelper';
import { resolveBeatsFromTimeSig } from '../../components/circle-sequencer/circleGeometry';
import { resolveStepSweepBlend } from '../../components/circle-sequencer/rodaSweepMath';
import { computePercussionNoteSwing } from '../../hooks/audio-sync/percussionSwingHelper';
import { computeStepBalancoPercent } from '../balancoUtils';
import { resolveFocusMeasureSteps } from '../../components/focus-balanco/resolveFocusMeasureSteps';

const degFrom12h = (rad: number) => Math.round(angleToNormalizedRodaRatio(rad) * 360);

// 1. Angles exacts des badges de temps et pas nominaux sur les 6 signatures (4/4, 2/4, 3/4, 6/8, 9/8, 12/8)
{
  const g44 = getRodaMeasureGeometry('4/4');
  assert.equal(g44.beatsCount, 4);
  assert.equal(g44.maxTicks, 96);
  assert.deepEqual(g44.beatAngles.map(degFrom12h), [0, 90, 180, 270]);
  assert.equal(computeRodaStepAngles('4/4').length, 16);

  const g24 = getRodaMeasureGeometry('2/4');
  assert.equal(g24.beatsCount, 2);
  assert.equal(g24.maxTicks, 48);
  assert.deepEqual(g24.beatAngles.map(degFrom12h), [0, 180]); // 12h & 6h !
  assert.deepEqual(computeRodaStepAngles('2/4').map(degFrom12h), [0, 45, 90, 135, 180, 225, 270, 315]);

  const g34 = getRodaMeasureGeometry('3/4');
  assert.equal(g34.beatsCount, 3);
  assert.equal(g34.maxTicks, 72);
  assert.deepEqual(g34.beatAngles.map(degFrom12h), [0, 120, 240]); // 12h, 4h, 8h !
  assert.equal(computeRodaStepAngles('3/4').length, 12);

  const g68 = getRodaMeasureGeometry('6/8');
  assert.equal(g68.beatsCount, 2);
  assert.equal(g68.maxTicks, 72);
  assert.deepEqual(g68.beatAngles.map(degFrom12h), [0, 180]); // 2 temps ternaires à 12h & 6h
  assert.deepEqual(computeRodaStepAngles('6/8').map(degFrom12h), [0, 60, 120, 180, 240, 300]);
  assert.deepEqual(getMarkers('6/8'), [0, 36]);

  const g98 = getRodaMeasureGeometry('9/8');
  assert.equal(g98.beatsCount, 3);
  assert.equal(g98.maxTicks, 108);
  assert.equal(getMaxTicks('9/8'), 108);
  assert.deepEqual(g98.beatAngles.map(degFrom12h), [0, 120, 240]);
  assert.deepEqual(computeRodaStepAngles('9/8').map(degFrom12h), [0, 40, 80, 120, 160, 200, 240, 280, 320]);
  assert.deepEqual(getMarkers('9/8'), [0, 36, 72]);

  const g128 = getRodaMeasureGeometry('12/8');
  assert.equal(g128.beatsCount, 4);
  assert.equal(g128.maxTicks, 144);
  assert.equal(resolveBeatsFromTimeSig('12/8', 12), 4); // Ne tombe plus sur 3 !
  assert.deepEqual(g128.beatAngles.map(degFrom12h), [0, 90, 180, 270]);
  assert.equal(computeRodaStepAngles('12/8').length, 12);
  assert.deepEqual(getMarkers('12/8'), [0, 36, 72, 108]);
}

// 2. Subdivisions mixtes [3, 4, 6, 8] et correspondance polaire rodaSweepMath
{
  const mixedRes = [3, 4, 6, 8];
  const angles = computeRodaStepAngles('4/4', mixedRes);
  assert.equal(angles.length, 21);
  assert.equal(findStepIndexAtNormalizedP(angles, 0.25), 3); // Temps 2 à 3h = index 3
  assert.equal(findStepIndexAtNormalizedP(angles, 0.50), 7); // Temps 3 à 6h = index 7
  assert.equal(findStepIndexAtNormalizedP(angles, 0.75), 13); // Temps 4 à 9h = index 13

  const active = Array(21).fill(0);
  active[3] = 'D';
  const blend = resolveStepSweepBlend({
    p: 0.25, isPlaying: false, playheadRatio: 0, rodaSweepMode: 'fullMeasure',
    currentMeasureIdx: 0, nextMeasureIdx: 1, prevMeasureIdx: null, hasPrevMeasure: false,
    currStepCount: 21, currentActiveSteps: active, currentBaseSteps: active, currStepAngles: angles,
    nextStepCount: 21, nextActiveSteps: active, nextBaseSteps: active, nextStepAngles: angles,
    prevStepCount: 21, prevActiveSteps: [], prevBaseSteps: [], prevStepAngles: [],
  });
  assert.equal(blend.primaryState, 'D');
  assert.equal(blend.primaryStepIdx, 3);
}

// 3. Masquage non-destructif d'un motif 4/4 (16 pas) sur 2/4 et alignement compilateur audio 6/8
{
  const pat44: any = { id: 1, steps: 16, beatResolutions: [4, 4, 4, 4], activeSteps: ['D', 0, 'd', 'E', 'D', 0, 'E', 0, 'X', 'X', 'X', 'X', 'Y', 'Y', 'Y', 'Y'] };
  assert.deepEqual(resolveActiveBeatResolutions('2/4', pat44), [4, 4]);
  const grid24 = buildMeasureStepGrid('2/4', pat44, 0);
  assert.deepEqual(grid24.stepTickMap, [0, 6, 12, 18, 24, 30, 36, 42]);
  assert.equal(pat44.activeSteps.length, 16); // Non-destructif

  const pat68: any = { id: 2, steps: 6, beatResolutions: [3, 3], activeSteps: ['G', 'a', 's', 'G', 'd', 'A'] };
  const grid68 = buildMeasureStepGrid('6/8', pat68, 0);
  assert.deepEqual(grid68.stepTickMap, [0, 12, 24, 36, 48, 60]);
  assert.equal(getRodaStepDurationTicks('6/8', pat68, 3), 12);
}

// 4. Verrouillage Balanço 0 % sur s === 0 ternaire (6/8, 9/8, 12/8) & FocusBalancoDrawer (6/8 vs 3/4 vs 12/8)
{
  const customSwing: any = { mode: 'custom', swingIntensity: 100, customOffsets: [25, 15, -20, -40] };
  const pat128: any = { id: 3, steps: 12, timeSignature: '12/8', beatResolutions: [3, 3, 3, 3], activeSteps: Array(12).fill('D'), measureAssignments: [true] };
  for (const downbeatIdx of [0, 3, 6, 9]) {
    assert.equal(computeStepBalancoPercent({ stepIdx: downbeatIdx, steps: 12, beatResolutions: [3, 3, 3, 3], timeSig: '12/8', globalSwing: customSwing }), 0);
    assert.equal(computePercussionNoteSwing({
      activePattern: pat128, liveTrack: { id: 1, instrumentIdx: 0 } as any, circleStepIdx: downbeatIdx,
      isTuplet: true, swingJitter: 0.004, globalMode: 'custom', globalSwing: customSwing, stepDurationSec: 0.2, timeSig: '12/8',
    }), 0);
  }

  const focusTrack: any = { id: 10, instrumentIdx: 0, patterns: [pat128] };
  const m68 = resolveFocusMeasureSteps({ focusTrack, tracks: [focusTrack], measureIdx: 0, timeSig: '6/8', soloPatternPlayId: null, globalSwing: customSwing, isLeftHanded: false, isPlaying: false, lang: 'fr' });
  const m34 = resolveFocusMeasureSteps({ focusTrack: { ...focusTrack, patterns: [{ ...pat128, timeSignature: '3/4', beatResolutions: [4, 4, 4] }] }, tracks: [focusTrack], measureIdx: 0, timeSig: '3/4', soloPatternPlayId: null, globalSwing: customSwing, isLeftHanded: false, isPlaying: false, lang: 'fr' });
  const m128 = resolveFocusMeasureSteps({ focusTrack, tracks: [focusTrack], measureIdx: 0, timeSig: '12/8', soloPatternPlayId: null, globalSwing: customSwing, isLeftHanded: false, isPlaying: false, lang: 'fr' });
  assert.equal(m68.beatsCount, 2); assert.equal(m68.stepCount, 6);
  assert.equal(m34.beatsCount, 3); assert.equal(m34.stepCount, 12);
  assert.equal(m128.beatsCount, 4); assert.equal(m128.stepCount, 12);
}

console.log('rodaTimeSigGeometry.test.ts: ALL ASSERTIONS PASSED');
