/**
 * Tests unitaires du verrouillage Multimédia iOS (`playback`), de l'en-tête RIFF/WAVE PCM 16-bit point zéro
 * et du garde anti-silence total profil élève (< 140 lignes).
 */
import assert from 'node:assert/strict';
import {
  activateMultimediaAudioSession,
  buildSilentPcm16WavDataUri,
  deactivateMultimediaAudioSession,
  isLegacyIosWithoutAudioSession,
  resetIosAudioSessionForTests,
} from '../iosAudioSessionUnlock';
import { isTrackMutedByPracticeMode } from '../../utils/practiceAudioMuteGuard';
import { sanitizeRestoredAutosave } from '../../hooks/app-audio/autosaveRestoreSanitizer';
import { TrackGroup } from '../../types';

const origNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const origDocument = (globalThis as any).document;

function setMockNavigator(nav: any) {
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
}

// 1. Validation stricte de l'en-tête RIFF/WAVE 8000 Hz Mono 16-bit signé et point zéro exact (0x0000)
{
  const uri = buildSilentPcm16WavDataUri();
  assert.ok(uri.startsWith('data:audio/wav;base64,'));
  const raw = Buffer.from(uri.slice('data:audio/wav;base64,'.length), 'base64');
  assert.equal(raw.length, 44 + 800 * 2);
  assert.equal(raw.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(raw.readUInt32LE(4), 36 + 1600);
  assert.equal(raw.subarray(8, 12).toString('ascii'), 'WAVE');
  assert.equal(raw.subarray(12, 16).toString('ascii'), 'fmt ');
  assert.equal(raw.readUInt32LE(16), 16);
  assert.equal(raw.readUInt16LE(20), 1); // PCM linéaire
  assert.equal(raw.readUInt16LE(22), 1); // Mono
  assert.equal(raw.readUInt32LE(24), 8000); // 8000 Hz
  assert.equal(raw.readUInt32LE(28), 16000); // ByteRate = 8000 * 1 * 2
  assert.equal(raw.readUInt16LE(32), 2); // BlockAlign = 2
  assert.equal(raw.readUInt16LE(34), 16); // 16-bit signed
  assert.equal(raw.subarray(36, 40).toString('ascii'), 'data');
  assert.equal(raw.readUInt32LE(40), 1600);
  for (let off = 44; off < raw.length; off += 2) {
    assert.equal(raw.readInt16LE(off), 0, `Sample at byte ${off} must be strict digital zero`);
  }
}

// 2. Niveau 1 — iOS 17+ (`navigator.audioSession` natif) : bascule synchrone en `'playback'`, 0 `<audio>` créé
{
  resetIosAudioSessionForTests();
  let createdAudioCount = 0;
  (globalThis as any).document = { createElement: () => { createdAudioCount++; return {}; } };
  const audioSessionObj = { type: 'ambient' };
  setMockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)', maxTouchPoints: 5, audioSession: audioSessionObj });

  assert.equal(isLegacyIosWithoutAudioSession(), false);
  activateMultimediaAudioSession();
  assert.equal(audioSessionObj.type, 'playback');
  assert.equal(createdAudioCount, 0);

  // Résilience si le setter lève une exception
  setMockNavigator({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    get audioSession() {
      return { set type(_v: string) { throw new Error('ReadOnly'); } };
    },
  });
  assert.doesNotThrow(() => activateMultimediaAudioSession());
}

// 3. Niveau 2 — Secours iOS 15/16 & iPadOS (`MacIntel` + `maxTouchPoints > 1` sans `audioSession`)
{
  resetIosAudioSessionForTests();
  const createdEls: any[] = [];
  (globalThis as any).document = {
    createElement: (tag: string) => {
      assert.equal(tag, 'audio');
      const attrs: Record<string, string> = {};
      const el: any = {
        paused: true, loop: false, muted: true, currentTime: 4.2, preload: '', src: '',
        setAttribute: (k: string, v: string) => { attrs[k] = v; },
        attrs, playCalls: 0, pauseCalls: 0,
        play() { this.playCalls++; this.paused = false; return Promise.resolve(); },
        pause() { this.pauseCalls++; this.paused = true; },
      };
      createdEls.push(el);
      return el;
    },
  };
  setMockNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 });
  assert.equal(isLegacyIosWithoutAudioSession(), true);

  activateMultimediaAudioSession();
  assert.equal(createdEls.length, 1);
  assert.equal(createdEls[0].muted, false, 'Legacy iOS <audio> must not have muted=true so AVAudioSession switches to Playback');
  assert.equal(createdEls[0].loop, true);
  assert.equal(createdEls[0].attrs.playsinline, '');
  assert.equal(createdEls[0].playCalls, 1);

  deactivateMultimediaAudioSession();
  assert.equal(createdEls[0].pauseCalls, 1);
  assert.equal(createdEls[0].currentTime, 0);
}

// 4. Desktop Windows / macOS sans écran tactile : no-op strict
{
  resetIosAudioSessionForTests();
  let created = 0;
  (globalThis as any).document = { createElement: () => { created++; return {}; } };
  setMockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 0 });
  assert.equal(isLegacyIosWithoutAudioSession(), false);
  activateMultimediaAudioSession();
  assert.equal(created, 0);
}

// 5. Garde anti-silence total élève : double verrou `tocarJuntoIsMuted` + `isRestOfEnsembleMuted` sans piste secondaire
{
  const tracks: TrackGroup[] = [
    { id: 10, instrumentIdx: 0, customName: 'Marcante', isMute: false, isSolo: false, patterns: [] } as any,
    { id: 40, instrumentIdx: 3, customName: 'Caixa', isMute: false, isSolo: false, patterns: [] } as any,
  ];
  const doubleLockedState = {
    mobileViewMode: 'percussion',
    tocarJuntoActive: true, tocarJuntoIsMuted: true, tocarJuntoTrackId: 10, tocarJuntoMuteScope: 'track' as const,
    isRestOfEnsembleMuted: true, focusTrackId: 10, referenceTrackId: null, isLetraActive: false,
  };
  assert.equal(isTrackMutedByPracticeMode(40, tracks, doubleLockedState), true);
  assert.equal(isTrackMutedByPracticeMode(10, tracks, doubleLockedState), false, 'Focus track must stay audible when all other tracks are muted by RestOfEnsemble');
  const sanitized = sanitizeRestoredAutosave({ masterVol: -80, tracks: [{ id: 100, isBusFolder: true, isMute: true }, { id: 10, isMute: true }, { id: 40, isMute: true }] });
  assert.equal(sanitized.masterVol, 0);
  assert.deepEqual([sanitized.tracks[1].isMute, sanitized.tracks[2].isMute], [false, false]);
}

resetIosAudioSessionForTests();
if (origNavigatorDesc) Object.defineProperty(globalThis, 'navigator', origNavigatorDesc);
(globalThis as any).document = origDocument;
console.log('iosAudioSessionUnlock.test.ts: ALL ASSERTIONS PASSED');
