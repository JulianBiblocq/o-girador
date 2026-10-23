
import { useState, useEffect, useCallback } from 'react';
import { useSequencer } from '../contexts/SequencerContext';
import { applyServiceWorkerReload } from './app-update/swReloadHelper';
import { useVersionChecker, CURRENT_VERSION, HAS_SEEN_UPDATE_KEY } from './app-update/useVersionChecker';

export { CURRENT_VERSION, HAS_SEEN_UPDATE_KEY };

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function useAppUpdate() {
  const sequencer = useSequencer();
  const { confirmAsync } = sequencer;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleAppUpdate = useCallback(async (reg: ServiceWorkerRegistration) => {
    const swSessionKey = 'sw_update_prompted';
    if (sessionStorage.getItem(swSessionKey)) return;
    sessionStorage.setItem(swSessionKey, 'true');

    setIsUpdateAvailable(true);
    setWaitingRegistration(reg);

    const shouldUpdate = await confirmAsync(
      sequencer.lang === 'fr'
        ? "Une nouvelle version de O Girador est disponible. Recharger pour mettre à jour ?"
        : "Uma nova versão do O Girador está disponível. Recarregar para atualizar ?"
    );
    if (shouldUpdate) {
      await applyServiceWorkerReload(reg);
    }
  }, [confirmAsync, sequencer.lang]);

  const applyUpdate = useCallback(async () => {
    await applyServiceWorkerReload(waitingRegistration);
  }, [waitingRegistration]);

  useEffect(() => {
    const handleSWUpdateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ServiceWorkerRegistration>;
      handleAppUpdate(customEvent.detail);
    };
    window.addEventListener('sw-update-available', handleSWUpdateEvent);
    return () => window.removeEventListener('sw-update-available', handleSWUpdateEvent);
  }, [handleAppUpdate]);

  useVersionChecker({ confirmAsync, lang: sequencer.lang, setIsUpdateAvailable });

  return {
    deferredPrompt,
    isInstallable: !!deferredPrompt,
    isUpdateAvailable,
    handleInstallClick,
    applyUpdate,
  };
}
