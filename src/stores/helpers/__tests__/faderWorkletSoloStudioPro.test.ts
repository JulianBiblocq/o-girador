/**
 * faderWorkletSoloStudioPro.test.ts — Tests unitaires : Loi Fader 0.0/-inf, Isolation Mute, Cascade Solo Studio Pro & Slots Worklet (< 145L).
 */
import assert from 'node:assert/strict';
import { busChannels, busReverbSendVca, channels } from '../../../audio/effects/effectsChainNodes';
import { PercussionWorkletSlotRouter } from '../../../audio/worklet/percussionWorkletSlotRouter';
import { applyRealtimeTrackOrBusFader } from '../../../hooks/audio-sync/realtimeFaderAudioUpdater';
import { faderPositionToGain } from '../../../utils/audioMath';
import { applyChannelVolumeLinear, masterDbToLinearGain } from '../../../utils/audio/channelFaderLinearRamp';
import { safeRampDb, safeRampTo } from '../../../utils/audio/safeAudioParamRamp';
import { attachCompiledTrackIds, extractCompiledTrackIds, resolveTrackFromPackedData } from '../../../workers/compiler/compiledTrackIdResolver';
import { getEffectiveMuteState, toggleTrackMuteStudioPro, toggleTrackSoloStudioPro, useSequencerStore } from '../../useSequencerStore';

const mkParam = (init = 1) => ({
  value: init, cancelScheduledValues() {}, setValueAtTime(v: number) { this.value = v; }, linearRampToValueAtTime(v: number) { this.value = v; },
});
const mkChan = (init = 1) => {
  const _param = mkParam(init);
  return { mute: false, _param, volume: { units: 'decibels', _param } };
};

// 1. Loi de Fader (-inf -> +6 dB), zéro retombée sur 0 dB (1.0) & étanchéité d'une tranche mutée
{
  for (const pos of [0, 1, 2, 3]) assert.equal(faderPositionToGain(pos), 0, `faderPositionToGain(${pos}) must be 0.0`);
  assert.ok(Math.abs(faderPositionToGain(75) - 1.0) < 1e-6, 'Position 75 must equal unity gain 1.0 (0 dB)');
  assert.ok(Math.abs(faderPositionToGain(100) - Math.pow(10, 6 / 20)) < 1e-4, 'Position 100 must equal +6 dB');
  assert.equal(masterDbToLinearGain(-Infinity), 0, 'Master -Infinity dB must map to 0.0 linear');

  const rawParam = { value: 0 };
  safeRampTo(rawParam, -Infinity, 0.02, -100, 12);
  assert.equal(rawParam.value, -100, '-Infinity must clamp to minVal (-100), NEVER 0 dB');
  safeRampTo(rawParam, Infinity, 0.02, -100, 12);
  assert.equal(rawParam.value, 12, '+Infinity must clamp to maxVal (12)');

  const dbWrapper = mkChan(1.0);
  safeRampDb(dbWrapper.volume, -Infinity, 0.018);
  assert.equal(dbWrapper._param.value, 0, 'safeRampDb(-Infinity) must drive linear _param to exact 0.0');

  applyChannelVolumeLinear(dbWrapper, 88, 0, true, 0.018, true);
  assert.equal(dbWrapper._param.value, 0, 'Muted channel must stay at 0.0 linear when fader moves to 88');
  assert.equal(dbWrapper.mute, false, 'Tone.Channel.mute must never be mutated');

  const chLeaf = mkChan(0.8), chBus = mkChan(0.9), vcaParam = mkParam(0.9);
  channels[101] = chLeaf as any; busChannels[200] = chBus as any;
  busReverbSendVca[200] = { gain: { _param: vcaParam } } as any;
  useSequencerStore.setState({
    tracks: [
      { id: 200, isBusFolder: true, volumeVal: 75, isMute: true, isSolo: false } as any,
      { id: 101, instrumentIdx: 0, busId: '200', volumeVal: 75, isMute: false, isSolo: false } as any,
    ],
  });
  applyRealtimeTrackOrBusFader(101, 92, 0.018);
  applyRealtimeTrackOrBusFader(200, 95, 0.018);
  assert.equal(chLeaf._param.value, 0, 'Child under muted Bus must remain at 0.0 during fader drag');
  assert.equal(chBus._param.value, 0, 'Muted Bus must remain at 0.0 during fader drag');
  assert.equal(vcaParam.value, 0, 'Muted Bus send VCA must remain at 0.0 during fader drag');
  delete channels[101]; delete busChannels[200]; delete busReverbSendVca[200];
}

// 2. Cascade Studio Pro des Solos [S] (Bus <-> Enfants, Bus imbriqués, Toada puxador/coro & exclusivité [M]/[S])
{
  let tracks: any[] = [
    { id: 'master-bat', customName: 'Bateria', isBusFolder: true, isMute: false, isSolo: false, volumeVal: 75 },
    { id: 'bus-alf', customName: 'Alfaias', isBusFolder: true, busId: 'master-bat', isMute: true, isSolo: false, volumeVal: 75 },
    { id: 1, instrumentIdx: 0, busId: 'bus-alf', isMute: true, isSolo: false, volumeVal: 75 },
    { id: 2, instrumentIdx: 1, busId: 'bus-alf', isMute: false, isSolo: false, volumeVal: 75 },
    { id: 3, instrumentIdx: 2, busId: 'bus-alf', isMute: false, isSolo: false, volumeVal: 75 },
    { id: 4, instrumentIdx: 3, busId: 'master-bat', isMute: false, isSolo: false, volumeVal: 75 },
    { id: 'bus-toada', customName: 'Toada', isBusFolder: true, isMute: false, isSolo: false, volumeVal: 75 },
    { id: 10, instrumentIdx: 10, isVocal: true, isMute: false, isSolo: false, volumeVal: 75 },
    { id: 11, instrumentIdx: 11, isVocal: true, isMute: false, isSolo: false, volumeVal: 75 },
  ];
  const byId = (id: number | string) => tracks.find((t) => String(t.id) === String(id))!;

  tracks = toggleTrackSoloStudioPro(tracks, 'bus-alf');
  assert.equal(byId('bus-alf').isSolo, true);
  assert.equal(byId('bus-alf').isMute, false, 'Soloing Bus clears local Mute');
  for (const id of [1, 2, 3]) {
    assert.equal(byId(id).isSolo, true, `Child ${id} must inherit Bus Solo`);
    assert.equal(getEffectiveMuteState(tracks, id), false, `Soloed child ${id} must be audible`);
  }
  assert.equal(getEffectiveMuteState(tracks, 'bus-alf'), false);
  assert.equal(getEffectiveMuteState(tracks, 'master-bat'), false, 'Ancestor Bus must stay Solo-Safe open');
  assert.equal(getEffectiveMuteState(tracks, 4), true, 'Sibling Caixa outside Solo must be muted');
  assert.equal(getEffectiveMuteState(tracks, 10), true, 'Un-soloed Puxador must be muted');

  tracks = toggleTrackSoloStudioPro(tracks, 2);
  assert.equal(byId(2).isSolo, false);
  assert.equal(byId('bus-alf').isSolo, false, 'Bus Solo header drops when 1 child exits Solo');
  assert.equal(byId(1).isSolo, true, 'Sibling Marcante stays in Solo');
  assert.equal(byId(3).isSolo, true, 'Sibling Repique stays in Solo');
  assert.equal(getEffectiveMuteState(tracks, 2), true);
  assert.equal(getEffectiveMuteState(tracks, 1), false);
  assert.equal(getEffectiveMuteState(tracks, 'bus-alf'), false, 'Parent Bus stays Solo-Safe open for remaining solo children');

  tracks = toggleTrackSoloStudioPro(tracks, 2);
  assert.equal(byId('bus-alf').isSolo, true, 'Bus Solo header relights automatically when all children are Solo');

  tracks = toggleTrackSoloStudioPro(tracks, 'bus-toada');
  assert.equal(byId('bus-toada').isSolo, true);
  assert.equal(byId(10).isSolo, true, 'Implicit Puxador inherits Toada Solo');
  assert.equal(byId(11).isSolo, true, 'Implicit Coro inherits Toada Solo');
  assert.equal(getEffectiveMuteState(tracks, 10), false);
  assert.equal(getEffectiveMuteState(tracks, 11), false);

  tracks = toggleTrackMuteStudioPro(tracks, 1);
  assert.equal(byId(1).isMute, true);
  assert.equal(byId(1).isSolo, false, 'Activating Mute clears local Solo');
  assert.equal(byId('bus-alf').isSolo, false);
  assert.equal(getEffectiveMuteState(tracks, 1), true);
  assert.equal(getEffectiveMuteState(tracks, 2), false);

  tracks = toggleTrackMuteStudioPro(tracks, 'bus-alf');
  assert.equal(getEffectiveMuteState(tracks, 2), true, 'Explicit Mute on ancestor Bus mutes its soloed children');
}

// 3. Stabilité `compiledTrackIds` après réordonnancement/suppression & recyclage des 31 slots Worklet
{
  const compiledTracks = [{ id: 10, name: 'Marcante' }, { id: 20, name: 'Meiao' }, { id: 30, name: 'Repique' }];
  const schedule = {};
  attachCompiledTrackIds(schedule, extractCompiledTrackIds(compiledTracks));
  const reorderedWithBusAndDeletion = [{ id: 'bus-1', name: 'Bus' }, { id: 30, name: 'Repique' }, { id: 10, name: 'Marcante' }];
  assert.equal(resolveTrackFromPackedData(0 << 22, reorderedWithBusAndDeletion, schedule)?.id, 10);
  assert.equal(resolveTrackFromPackedData(2 << 22, reorderedWithBusAndDeletion, schedule)?.id, 30);
  assert.equal(resolveTrackFromPackedData(1 << 22, reorderedWithBusAndDeletion, schedule), undefined, 'Deleted track resolves to undefined');

  const router = new PercussionWorkletSlotRouter();
  const mockTarget = () => ({ connect() {}, disconnect() {} });
  const mockCtx = { destination: mockTarget(), createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }) } as any;
  const mockWorklet = { connect() {} } as any;
  router.attachWorkletNode(mockCtx, mockCtx, mockWorklet);
  for (let id = 1; id <= 31; id++) assert.ok(router.ensureTrackSlot(mockCtx, id, mockTarget()) >= 1);
  assert.equal(router.routedSlotCount, 31);
  assert.equal(router.ensureTrackSlot(mockCtx, 32, mockTarget()), -1, '32nd concurrent track rejected when 31 slots full');
  assert.ok(router.releaseTrackSlot(15) >= 1);
  assert.equal(router.routedSlotCount, 30);
  assert.ok(router.ensureTrackSlot(mockCtx, 99, mockTarget()) >= 1, 'Released slot recycled for new track 99');
  assert.equal(router.routedSlotCount, 31);
  router.dispose();
}

console.log('faderWorkletSoloStudioPro.test.ts: ALL ASSERTIONS PASSED');
