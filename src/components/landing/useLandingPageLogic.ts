import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { loadTone, getTone } from '@/src/ToneLoader';
import { audioEngine } from '../../hooks/useAudioSync';
import { getEcosystemUrl } from '../../constants/ecosystemUrls';
import { launchCrossApp } from '../../utils/crossAppAuth';
import { preloadLandingSamples, getLandingAudioContext, decodedAudioBuffers } from './landingAudio';
import { safeResumeAudioContext, scheduleAudioContextAutoSuspend } from '../../audio/audioContextSuspendManager';

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

  const handleLanguageSelect = (newLang: 'fr' | 'pt') => {
    setCurrentLang(newLang);
    localStorage.setItem('o_gridador_lang', newLang);
    if (onLanguageChange) onLanguageChange(newLang);
  };

  const handleLaunchOrquestrador = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const url = getEcosystemUrl('orquestrador');
    if (currentUser) launchCrossApp(url, { appKey: 'orquestrador', appLabel: "l'Orquestrad'Or" });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }, [currentUser]);

  const handleCurrentAppClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLaunchOrganizador = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!currentUser) window.open('https://organizador.o-girador.com/demo', '_blank', 'noopener,noreferrer');
    else launchCrossApp(getEcosystemUrl('organizador'), { appKey: 'organizador', appLabel: "l'Organizad'Or" });
  }, [currentUser]);

  const handleLaunchDancador = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const url = getEcosystemUrl('dancador');
    if (currentUser) launchCrossApp(url, { appKey: 'dancador', appLabel: "le Dançad'Or" });
    else window.open(url, '_blank', 'noopener,noreferrer');
  }, [currentUser]);

  const handleLaunchMostrador = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rawGroupId = userProfile?.groupId?.trim()?.toLowerCase();
    if (!currentUser || !rawGroupId) window.open('https://organizador.o-girador.com/demo?app=mostrador', '_blank', 'noopener,noreferrer');
    else launchCrossApp(`https://mostrador.o-girador.com/${encodeURIComponent(rawGroupId)}`, { appKey: 'mostrador', appLabel: "le Mostrad'Or" });
  }, [currentUser, userProfile?.groupId]);

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
    if (Tone && Tone.context.state !== 'running') {
      try { await Tone.start(); } catch (_) {}
    }
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
          const arrayBuffer = await resp.arrayBuffer();
          buffer = await ctx.decodeAudioData(arrayBuffer);
          decodedAudioBuffers.set(bufferKey, buffer);
        }
      }
      if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        scheduleAudioContextAutoSuspend(500);
      }
    } catch (_) {
      if (audioEngine) audioEngine.playPreview(instId, strokeSymbol, 0, 1.0);
    }
  }, []);

  const isFr = currentLang === 'fr';

  return {
    isToneReady, isUnlocking, currentLang, currentUser, isFr, handleLanguageSelect,
    handleLaunchOrquestrador, handleCurrentAppClick, handleLaunchOrganizador,
    handleLaunchDancador, handleLaunchMostrador, handleEnterRoda, handleInstrumentTap
  };
};
