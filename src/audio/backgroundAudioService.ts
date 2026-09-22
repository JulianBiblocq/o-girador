/**
 * Background Audio Service — Mobile Background Playback Anchor
 *
 * Maintains an active audio session on mobile browsers (iOS Safari, Chrome Android)
 * when the screen is locked or the app goes to the background by playing a silent
 * HTML5 <audio> element. This prevents the OS from suspending the AudioContext.
 *
 * Also configures the Media Session API for lock-screen transport controls.
 *
 * Architecture:
 * - Pure Vanilla TS singleton (no React, no useState) → Commandement 1 respected
 * - Called imperatively from useAudioSync's handleTogglePlay/handleStop callbacks
 * - The silent anchor is started synchronously inside the user gesture stack
 *   to satisfy mobile autoplay policies
 */

// ─── Silent WAV (base64) ───────────────────────────────────────────────
// Minimal 1-second 44100 Hz mono 16-bit PCM WAV filled with silence.
// ~88 KB uncompressed, but base64-inlined to avoid network requests.
// Using a proper WAV header ensures maximum browser compatibility.
const SILENT_WAV_DURATION_SAMPLES = 44100; // 1 second at 44100 Hz
function generateSilentWavDataUri(): string {
  const numChannels = 1;
  const sampleRate = 44100;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = SILENT_WAV_DURATION_SAMPLES * numChannels * bytesPerSample;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Sub-chunk size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // Byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // Block align
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk (all zeros = silence)
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  // Remaining bytes are already 0 (silence) from ArrayBuffer initialization

  // Convert to base64 data URI
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ─── Singleton State ───────────────────────────────────────────────────

let silentAudioEl: HTMLAudioElement | null = null;
let silentWavUri: string | null = null; // Lazy-init to avoid startup cost

/**
 * Start the silent HTML5 audio anchor for mobile background playback.
 * MUST be called synchronously inside a user gesture event handler
 * (tap/click) to satisfy mobile autoplay policies.
 *
 * @param onMediaPlay  - Callback invoked when user taps "Play" on lock-screen media controls
 * @param onMediaPause - Callback invoked when user taps "Pause" on lock-screen media controls
 */
export function startBackgroundAnchor(
  onMediaPlay: () => void,
  onMediaPause: () => void
): void {
  // Lazy-generate the silent WAV on first use
  if (!silentWavUri) {
    silentWavUri = generateSilentWavDataUri();
  }

  // Create or reuse the silent <audio> element
  if (!silentAudioEl) {
    silentAudioEl = document.createElement('audio');
    silentAudioEl.setAttribute('playsinline', '');
    silentAudioEl.setAttribute('webkit-playsinline', '');
    silentAudioEl.loop = true;
    // Volume at near-zero (some browsers ignore volume=0 for power saving)
    silentAudioEl.volume = 0.01;
    silentAudioEl.src = silentWavUri;
  }

  // Start playback synchronously in user gesture stack
  try {
    const playPromise = silentAudioEl.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Autoplay blocked — not critical, audio still works via AudioContext
      });
    }
  } catch (_) {
    // play() threw synchronously — old browser, ignore
  }

  // ─── Media Session API ─────────────────────────────────────────────
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'O Girador — Séquenceur',
        artist: 'O Girador',
        album: 'Maracatu',
      });

      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('play', () => {
        onMediaPlay();
        navigator.mediaSession.playbackState = 'playing';
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        onMediaPause();
        navigator.mediaSession.playbackState = 'paused';
      });
    } catch (_) {
      // Media Session API not fully supported — non-critical
    }
  }
}

/**
 * Stop the silent anchor and reset Media Session state.
 * Called from handleStop().
 */
export function stopBackgroundAnchor(): void {
  if (silentAudioEl) {
    silentAudioEl.pause();
    silentAudioEl.currentTime = 0;
  }

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'paused';
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    } catch (_) {}
  }
}

/**
 * Update Media Session playback state without starting/stopping the anchor.
 * Used for pause/resume toggle.
 */
export function setMediaSessionState(state: 'playing' | 'paused'): void {
  if (silentAudioEl) {
    if (state === 'playing') {
      try {
        const p = silentAudioEl.play();
        if (p) p.catch(() => {});
      } catch (_) {}
    } else {
      silentAudioEl.pause();
    }
  }

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = state;
    } catch (_) {}
  }
}
