/**
 * Déverrouillage synchrone du canal Multimédia iOS/iPadOS (`playback`) (< 90 lignes).
 * - Niveau 1 (iOS 17+) : `navigator.audioSession.type = 'playback'` synchrone (ignore le bouton Silencieux).
 * - Niveau 2 (Secours iOS/iPadOS 15–16 sans `navigator.audioSession`) : singleton `<audio playsinline>`
 *   portant une micro-trame WAV PCM 16-bit signée (point zéro `0x0000`), mis en `.pause()` dès Pause/Stop/veille.
 */

let legacySilentAudioEl: HTMLAudioElement | null = null;
let cachedSilentWavUri: string | null = null;

export function buildSilentPcm16WavDataUri(): string {
  if (cachedSilentWavUri) return cachedSilentWavUri;
  const sampleRate = 8000, numSamples = 800, dataSize = numSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const writeTag = (off: number, tag: string) => {
    for (let i = 0; i < 4; i++) v.setUint8(off + i, tag.charCodeAt(i));
  };
  writeTag(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true);
  writeTag(8, 'WAVE'); writeTag(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  writeTag(36, 'data'); v.setUint32(40, dataSize, true);
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64');
  cachedSilentWavUri = `data:audio/wav;base64,${b64}`;
  return cachedSilentWavUri;
}

export function isLegacyIosWithoutAudioSession(): boolean {
  if (typeof navigator === 'undefined' || 'audioSession' in navigator) return false;
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).platform || '';
  return /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1);
}

function getOrCreateLegacySilentAudio(): HTMLAudioElement | null {
  if (legacySilentAudioEl) return legacySilentAudioEl;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.preload = 'auto'; el.loop = true; el.muted = false;
    (el as any).disableRemotePlayback = true;
    el.src = buildSilentPcm16WavDataUri();
    legacySilentAudioEl = el;
    return el;
  } catch { return null; }
}

export function activateMultimediaAudioSession(): void {
  if (typeof navigator === 'undefined') return;
  if ('audioSession' in navigator) {
    try {
      const session = (navigator as any).audioSession;
      if (session) session.type = 'playback';
    } catch {}
    return;
  }
  if (!isLegacyIosWithoutAudioSession()) return;
  try {
    const el = getOrCreateLegacySilentAudio();
    if (el && el.paused !== false) {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  } catch {}
}

export function deactivateMultimediaAudioSession(): void {
  if (!legacySilentAudioEl) return;
  try { legacySilentAudioEl.pause(); legacySilentAudioEl.currentTime = 0; } catch {}
}

export function resetIosAudioSessionForTests(): void {
  deactivateMultimediaAudioSession();
  legacySilentAudioEl = null;
}
