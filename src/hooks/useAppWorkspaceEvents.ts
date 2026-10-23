/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export function useAppWorkspaceEvents(alertAsync: (msg: string) => Promise<any>, changeViewMode: (mode: any) => void, viewMode: string, handleSaveToLocal: () => void) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMandatoryVisitorModal, setShowMandatoryVisitorModal] = useState(false);
  const [isPaperWorkshopOpen, setIsPaperWorkshopOpen] = useState(false);
  const [paperWorkshopInitialTab, setPaperWorkshopInitialTab] = useState<'sheets' | 'scanner' | 'reserve'>('sheets');

  useEffect(() => {
    const handleAppToast = (e: any) => {
      const msg = e.detail?.message || e.detail;
      if (msg) {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
      }
    };
    window.addEventListener('app-toast', handleAppToast);
    return () => window.removeEventListener('app-toast', handleAppToast);
  }, []);

  useEffect(() => {
    const handleStageCompleted = (e: Event) => {
      const detail = (e as CustomEvent<{ stageIndex: number; targetBpm: number }>).detail;
      if (detail && alertAsync) {
        alertAsync(`Parabéns ! Vous avez validé avec succès le Palier ${detail.stageIndex} (${detail.targetBpm} BPM) !`);
      }
    };
    window.addEventListener('o-girador-stage-completed', handleStageCompleted);
    return () => window.removeEventListener('o-girador-stage-completed', handleStageCompleted);
  }, [alertAsync]);

  useEffect(() => {
    const handleToggleViewMode = () => {
      changeViewMode(viewMode === 'roda' ? 'timeline' : 'roda');
    };
    window.addEventListener('toggle-view-mode', handleToggleViewMode);
    return () => window.removeEventListener('toggle-view-mode', handleToggleViewMode);
  }, [changeViewMode, viewMode]);

  useEffect(() => {
    const handleShowAuth = () => setShowMandatoryVisitorModal(true);
    window.addEventListener('show-visitor-auth-mandatory', handleShowAuth);
    return () => window.removeEventListener('show-visitor-auth-mandatory', handleShowAuth);
  }, []);

  useEffect(() => {
    const handleOpenPaper = (e: any) => {
      setPaperWorkshopInitialTab(e?.detail?.tab || 'sheets');
      setIsPaperWorkshopOpen(true);
    };
    window.addEventListener('open-paper-workshop', handleOpenPaper);
    return () => window.removeEventListener('open-paper-workshop', handleOpenPaper);
  }, []);

  useEffect(() => {
    const handleOpenSaveModal = () => handleSaveToLocal();
    window.addEventListener('open-save-modal', handleOpenSaveModal);
    return () => window.removeEventListener('open-save-modal', handleOpenSaveModal);
  }, [handleSaveToLocal]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'IMG' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range') || target.classList.contains('vertical-fader') || target.closest('.vertical-fader') || target.closest('.percussion-step-container') || target.closest('.step-input-cell') || target.closest('.v-card'))) {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    return () => window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
  }, []);

  return {
    toastMessage,
    showMandatoryVisitorModal,
    setShowMandatoryVisitorModal,
    isPaperWorkshopOpen,
    setIsPaperWorkshopOpen,
    paperWorkshopInitialTab,
    setPaperWorkshopInitialTab,
  };
}
