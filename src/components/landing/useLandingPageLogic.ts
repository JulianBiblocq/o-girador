import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { loadTone, getTone } from '@/src/ToneLoader';
import { audioEngine } from '../../hooks/useAudioSync';
import { preloadLandingSamples, getLandingAudioContext, decodedAudioBuffers } from './landingAudio';
import { safeResumeAudioContext, scheduleAudioContextAutoSuspend } from '../../audio/audioContextSuspendManager';
import { useLandingEcosystemNav } from './useLandingEcosystemNav';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

export const useLandingPageLogic = (
  onEnter: () => void,
  lang: 'fr' | 'pt',
  onLanguageChange?: (lang: 'fr' | 'pt') => void
) => {
  const [isToneReady, setIsToneReady] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentLang, setCurrentLang] = useState<'fr' | 'pt'>(() => {
    const saved = localStorage.getItem('o_gridador_lang');
    if (saved === 'fr' || saved === 'pt') return saved;
    if (lang === 'fr' || lang === 'pt') return lang;
    return typeof navigator !== 'undefined' && navigator.language.startsWith('fr') ? 'fr' : 'pt';
  });

  useEffect(() => {
    if (lang && lang !== currentLang) setCurrentLang(lang);
  }, [lang, currentLang]);

  const { currentUser, userProfile } = useAuth();
  const ecosystemNav = useLandingEcosystemNav(currentUser, userProfile);

  const handleLanguageSelect = (newLang: 'fr' | 'pt') => {
    setCurrentLang(newLang);
    localStorage.setItem('o_gridador_lang', newLang);
    if (onLanguageChange) onLanguageChange(newLang);
  };

  useEffect(() => {
    preloadLandingSamples();
    loadTone().then(() => setIsToneReady(true)).catch((err) => console.error(err));
  }, []);

  const handleEnterRoda = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (isUnlocking) return;
    setIsUnlocking(true);
    await safeResumeAudioContext();
    const Tone = safeGetTone();
    if (Tone && Tone.context.state !== 'running') { try { await Tone.start(); } catch (_) {} }
    useAudioStore.getState().unlockAudio();
    localStorage.setItem('ogirador_has_seen_welcome', 'true');
    useSequencerStore.getState().setMobileViewMode('complet');
    onEnter();
  }, [isUnlocking, onEnter]);

  const handleInstrumentTap = useCallback(async (instId: string, strokeSymbol: string, strokeFile: string) => {
    try {
      await safeResumeAudioContext();
      const ctx = getLandingAudioContext();
      if (!ctx) return;
      if (ctx.state !== 'running') await ctx.resume();
      const Tone = safeGetTone();
      if (Tone && Tone.context.state !== 'running') Tone.start().catch(() => {});
      useAudioStore.getState().unlockAudio();

      const bufferKey = `${instId}_${strokeSymbol}`;
      let buffer = decodedAudioBuffers.get(bufferKey) || decodedAudioBuffers.get(instId);
      if (!buffer) {
        const resp = await fetch(strokeFile);
        if (resp.ok) {
          buffer = await ctx.decodeAudioData(await resp.arrayBuffer());
          decodedAudioBuffers.set(bufferKey, buffer);
        }
      }
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.onended = () => { try { source.disconnect(); gainNode.disconnect(); } catch (_) {} };
        source.start(0);
        scheduleAudioContextAutoSuspend(500);
      }
    } catch (_) {
      if (audioEngine) audioEngine.playPreview(instId, strokeSymbol, 0, 1.0);
    }
  }, []);

  return {
    isToneReady, isUnlocking, currentLang, currentUser, isFr: currentLang === 'fr',
    handleLanguageSelect, handleEnterRoda, handleInstrumentTap,
    ...ecosystemNav,
  };
};
