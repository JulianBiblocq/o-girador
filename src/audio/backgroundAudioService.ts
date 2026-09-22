/**
 * Background Audio & Media Session Service
 *
 * Configures the Media Session API for lock-screen / notification transport controls
 * and system playback status metadata.
 *
 * Architecture:
 * - Pure Vanilla TS singleton (no React, no useState) → Commandement 1 respected
 * - Called imperatively from useAudioSync's handleTogglePlay/handleStop callbacks
 */

/**
 * Configure Media Session API for mobile transport controls.
 *
 * @param onMediaPlay  - Callback invoked when user taps "Play" on media controls
 * @param onMediaPause - Callback invoked when user taps "Pause" on media controls
 */
export function startBackgroundAnchor(
  onMediaPlay: () => void,
  onMediaPause: () => void
): void {
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
 * Reset Media Session state.
 * Called from handleStop().
 */
export function stopBackgroundAnchor(): void {
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'paused';
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    } catch (_) {}
  }
}

/**
 * Update Media Session playback state.
 * Used for pause/resume toggle.
 */
export function setMediaSessionState(state: 'playing' | 'paused'): void {
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = state;
    } catch (_) {}
  }
}
