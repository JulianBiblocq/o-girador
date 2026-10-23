/**
 * Gestionnaire d'écouteurs d'événements window pour le moteur audio et vocal (< 55 lignes).
 */

import { AudioEngine } from '../../AudioEngine';
import { vocalEngineService } from '../../audio/vocalEngineService';

export function setupAudioWindowEvents(engine: AudioEngine | null): () => void {
  const handlePreviewVoice = (e: Event) => {
    const note = (e as CustomEvent).detail;
    if (note && engine) engine.triggerVoiceAttackRelease(note, '8n');
  };
  const handleStopVocals = () => {
    vocalEngineService.stopAllVocalPlayback();
  };
  const handleReleaseVoicePitch = () => {
    if (engine) engine.releaseVoicePitch();
  };
  const handleApplyVocalPreset = (e: Event) => {
    const preset = (e as CustomEvent).detail;
    if (preset) vocalEngineService.applyVocalPreset(preset);
  };

  window.addEventListener('audio-preview-voice-note', handlePreviewVoice);
  window.addEventListener('vocal-stop-all-playback', handleStopVocals);
  window.addEventListener('vocal-release-voice-pitch', handleReleaseVoicePitch);
  window.addEventListener('vocal-apply-preset-live', handleApplyVocalPreset);

  return () => {
    window.removeEventListener('audio-preview-voice-note', handlePreviewVoice);
    window.removeEventListener('vocal-stop-all-playback', handleStopVocals);
    window.removeEventListener('vocal-release-voice-pitch', handleReleaseVoicePitch);
    window.removeEventListener('vocal-apply-preset-live', handleApplyVocalPreset);
  };
}
