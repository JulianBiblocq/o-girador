import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHardwareCapabilities } from '../../../utils/hardwareDetection';
import { buildEcoConfig, detectEcoMode, detectStrictAudioEco, ECO_OFF_CONFIG } from '../ecoModeDetector';
import { useSequencerStore } from '../../useSequencerStore';
import { resolveLowCutTargetHz } from '../../../audio/effects/lowCutTarget';
import { resolveTrackSectionSpatialProfile } from '../../../audio/spatial/sectionSpatialAcoustics';
import { createMasterBusDspState, resetMasterBusDspState, updateMasterBusDspParams } from '../../../audio/worklet/master-bus/masterBusWorkletTypes';
import { processMasterBusDspBlock } from '../../../audio/worklet/master-bus/masterBusProcessor';
import { syncSaturationOversampleSmooth } from '../../../audio/effects/studioSaturationChain';
import { subscribeVuMeter, getVuMeterTickerDebugState } from '../../../components/controls/vuMeterTicker';

test('Volet 2.1 — detectHardwareCapabilities & detectEcoMode ignorent userAgent et activent uniquement le Palier 1 sur <=2 coeurs/Go', () => {
  const origNav = globalThis.navigator, origWin = (globalThis as any).window, origStorage = (globalThis as any).localStorage;
  const store = new Map<string, string>();
  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile', hardwareConcurrency: 6, deviceMemory: 4 },
      configurable: true,
    });
    assert.equal(detectHardwareCapabilities().isVeryLowEnd, false);
    assert.equal(detectEcoMode(), false);

    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', hardwareConcurrency: 2, deviceMemory: 4 },
      configurable: true,
    });
    assert.equal(detectHardwareCapabilities().isVeryLowEnd, true);
    const initialEco = detectEcoMode(), initialStrict = detectStrictAudioEco(initialEco);
    assert.equal(initialEco, true);
    assert.equal(initialStrict, false);
    assert.deepEqual(buildEcoConfig(initialEco, initialStrict), { disableAnimations: true, disableFx: false, disableEq: false });
  } finally {
    Object.defineProperty(globalThis, 'navigator', { value: origNav, configurable: true });
    (globalThis as any).window = origWin;
    (globalThis as any).localStorage = origStorage;
  }
});

test('Volet 2.2 — Contrat des 2 paliers : toggleStrictAudioEco explicite, reset complet sur toggleEcoMode Off et veille VU zero-RAF', () => {
  useSequencerStore.setState({ isEcoMode: false, ecoConfig: { ...ECO_OFF_CONFIG }, editingTrackId: null });
  useSequencerStore.getState().toggleEcoMode();
  let st = useSequencerStore.getState();
  assert.equal(st.isEcoMode, true);
  assert.deepEqual(st.ecoConfig, { disableAnimations: true, disableFx: false, disableEq: false });

  st.toggleStrictAudioEco();
  st = useSequencerStore.getState();
  assert.equal(st.isEcoMode, true);
  assert.deepEqual(st.ecoConfig, { disableAnimations: true, disableFx: true, disableEq: true });

  st.toggleEcoMode();
  st = useSequencerStore.getState();
  assert.equal(st.isEcoMode, false);
  assert.deepEqual(st.ecoConfig, { disableAnimations: false, disableFx: false, disableEq: false });

  let suspendCalls = 0;
  const unsub = subscribeVuMeter(() => {}, () => { suspendCalls++; });
  assert.equal(suspendCalls, 0);
  useSequencerStore.getState().toggleEcoMode();
  assert.equal(suspendCalls, 1);
  assert.equal(getVuMeterTickerDebugState().isRafRunning, false);
  unsub();
  useSequencerStore.setState({ isEcoMode: false, ecoConfig: { ...ECO_OFF_CONFIG } });
});

test('Volet 1.1 — MasterBusWorklet lisse sans clic (~25 ms) le bypass compresseur/Eco et reinitialise l enveloppe a 0', () => {
  const sr = 48000, state = createMasterBusDspState(sr);
  updateMasterBusDspParams(state, {
    compressorEnabled: true, ecoBypassAesthetic: false,
    thresholdDb: -24, ratio: 6, makeupDb: 4, compMixPct: 100, transientAttackDb: 4, duckingDb: 3,
  });
  resetMasterBusDspState(state);
  assert.equal(state.activeAestheticMix, 1);
  assert.equal(state.activeCompMix, 1);

  const inL = new Float32Array(128), inR = new Float32Array(128);
  const scL = new Float32Array(128).fill(0.25), scR = new Float32Array(128).fill(0.25);
  const outL = new Float32Array(128), outR = new Float32Array(128);
  let phase = 0;
  const runBlock = () => {
    for (let i = 0; i < 128; i++) {
      const s = 0.65 * Math.sin(phase);
      inL[i] = s; inR[i] = 0.8 * s;
      phase += (2 * Math.PI * 440) / sr;
    }
    processMasterBusDspBlock(state, inL, inR, scL, scR, outL, outR, 128);
  };

  for (let b = 0; b < 8; b++) runBlock();
  assert.ok(state.compEnvDb > 1.0);
  const prevLastSample = outL[127];

  updateMasterBusDspParams(state, { compressorEnabled: false, ecoBypassAesthetic: true });
  runBlock();
  const boundaryJump = Math.abs(outL[0] - prevLastSample);
  assert.ok(boundaryJump < 0.08, `Expected smooth transition at block boundary, got ${boundaryJump}`);
  assert.ok(state.activeCompMix > 0 && state.activeCompMix < 1);

  for (let b = 0; b < 15; b++) runBlock();
  assert.equal(state.activeCompMix, 0);
  assert.equal(state.activeAestheticMix, 0);
  assert.equal(state.compEnvDb, 0);
});

test('Volet 1.2 & Verrou 2 — Parite acoustique des pistes esclaves, escouade 100% intacte au Palier 1 et anti-course oversample', async () => {
  const masterAlfaia = { id: 1, instrumentIdx: 0, lowCut: false, isLinkMaster: true, linkedToTrackId: '100' };
  const slaveAlfaia = { id: 2, instrumentIdx: 1, lowCut: false, isLinkMaster: false, linkedToTrackId: '100' };
  assert.equal(resolveLowCutTargetHz(masterAlfaia, false), 20);
  assert.equal(resolveLowCutTargetHz(slaveAlfaia, false), 20);
  assert.equal(resolveLowCutTargetHz({ ...slaveAlfaia, lowCut: true }, false), 80);

  const squadTrack = { sectionPlayers: [15, 32, 50, 68, 85].map((x, i) => ({ id: `p${i}`, x, y: 85 })), panVal: 0 };
  assert.equal(resolveTrackSectionSpatialProfile(squadTrack as any, 'marcante', false).synthesizedCount, 5);
  assert.equal(resolveTrackSectionSpatialProfile(squadTrack as any, 'marcante', true).synthesizedCount, 2);

  const fakeSat: any = { _shaper: { oversample: '4x' as OverSampleType }, _oversampleTimer: null };
  syncSaturationOversampleSmooth(fakeSat, true);
  assert.equal(fakeSat._shaper.oversample, '4x');
  syncSaturationOversampleSmooth(fakeSat, false);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(fakeSat._shaper.oversample, '4x');
});
