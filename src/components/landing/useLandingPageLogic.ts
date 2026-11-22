import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useGuideStore } from '../../stores/useGuideStore';
import { loadTone, getTone } from '@/src/ToneLoader';
import { preloadLandingSamples, playLandingInstrumentSample } from './landingAudio';
import { safeResumeAudioContext } from '../../audio/audioContextSuspendManager';
import { useLandingEcosystemNav } from './useLandingEcosystemNav';

function safeGetTone() {
  try { return getTone(); } catch { return null; }
}

export const useLandingPageLogic = (
  onEnter: () => void,
  lang: 'fr' | 'pt',
  onLanguageChange?: (lang: 'fr' | 'pt') => void,
  onOpenPaperSheets?: () => void
) => {
  const [isToneReady, setIsToneReady] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentLang, setCurrentLang] = useState<'fr' | 'pt'>(() => {
    const saved = localStorage.getItem('o_girador_lang') || localStorage.getItem('o_gridador_lang');
    if (saved === 'fr' || saved === 'pt') return saved;
    if (lang === 'fr' || lang === 'pt') return lang;
    return typeof navigator !== 'undefined' && navigator.language.startsWith('fr') ? 'fr' : 'pt';
  });

  useEffect(() => {
    if (lang && lang !== currentLang) setCurrentLang(lang);
  }, [lang, currentLang]);

  const { currentUser, userProfile } = useAuth();
  const ecosystemNav = useLandingEcosystemNav(currentUser, userProfile);

  const handleLanguageSelect = useCallback((newLang: 'fr' | 'pt') => {
    setCurrentLang(newLang);
    localStorage.setItem('o_girador_lang', newLang);
    localStorage.setItem('o_gridador_lang', newLang);
    if (onLanguageChange) onLanguageChange(newLang);
  }, [onLanguageChange]);

  useEffect(() => {
    preloadLandingSamples();
    loadTone().then(() => setIsToneReady(true)).catch((err) => console.error(err));
  }, []);

  const unlockAudioAndMarkSeen = useCallback(async () => {
    await safeResumeAudioContext();
    const Tone = safeGetTone();
    if (Tone && Tone.context.state !== 'running') { try { await Tone.start(); } catch (_) {} }
    useAudioStore.getState().unlockAudio();
    localStorage.setItem('ogirador_has_seen_welcome', 'true');
  }, []);

  const handleEnterRoda = useCallback(async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (isUnlocking) return;
    setIsUnlocking(true);
    await unlockAudioAndMarkSeen();
    const s = useSequencerStore.getState();
    s.setIsPracticeMode(false);
    s.setMobileViewMode('complet');
    onEnter();
  }, [isUnlocking, unlockAudioAndMarkSeen, onEnter]);

  const handleEnterPractice = useCallback(async () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    await unlockAudioAndMarkSeen();
    const s = useSequencerStore.getState();
    s.setIsPracticeMode(true);
    s.setMobileViewMode('percussion');
    onEnter();
  }, [isUnlocking, unlockAudioAndMarkSeen, onEnter]);

  const handleEnterPrintA4 = useCallback(async () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    await unlockAudioAndMarkSeen();
    const s = useSequencerStore.getState();
    s.setIsPracticeMode(false);
    s.setMobileViewMode('complet');
    onEnter();
    if (onOpenPaperSheets) onOpenPaperSheets();
    else window.dispatchEvent(new CustomEvent('open-paper-workshop', { detail: { tab: 'sheets' } }));
  }, [isUnlocking, unlockAudioAndMarkSeen, onEnter, onOpenPaperSheets]);

  const handleEnterGuide = useCallback(async () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    await unlockAudioAndMarkSeen();
    const s = useSequencerStore.getState();
    s.setIsPracticeMode(false);
    s.setMobileViewMode('complet');
    useGuideStore.getState().openGuide('panorama');
    onEnter();
  }, [isUnlocking, unlockAudioAndMarkSeen, onEnter]);

  const handleReturnToRoda = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('ogirador_has_seen_welcome', 'true');
    onEnter();
  }, [onEnter]);

  return {
    isToneReady, isUnlocking, currentLang, currentUser, isFr: currentLang === 'fr',
    handleLanguageSelect, handleEnterRoda, handleEnterPractice, handleEnterPrintA4,
    handleEnterGuide, handleReturnToRoda, handleInstrumentTap: playLandingInstrumentSample,
    ...ecosystemNav,
  };
};
