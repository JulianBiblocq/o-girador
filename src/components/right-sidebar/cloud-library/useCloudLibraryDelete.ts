/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { Language } from '../../../types';
import { deleteMestreSignal } from '../../../cloudSignals';

export function useCloudLibraryDelete(refreshMestreSignals: (() => void) | undefined, lang: Language) {
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const [signalToDelete, setSignalToDelete] = useState<{ id: string; mestreId: string; name: string } | null>(null);
  const [isDeletingSignal, setIsDeletingSignal] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', message: string, durationMs: number = 4000) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast({ type, message });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, durationMs);
  };

  const handleConfirmDelete = async () => {
    if (!signalToDelete) return;
    setIsDeletingSignal(true);
    const { id, mestreId, name } = signalToDelete;
    const res = await deleteMestreSignal(id, mestreId);
    setIsDeletingSignal(false);
    setSignalToDelete(null);
    if (res.success) {
      showToast('success', lang === 'fr' ? `Signal "${name}" supprimé.` : `Sinal "${name}" exclu.`);
      if (refreshMestreSignals) refreshMestreSignals();
    } else {
      showToast('error', (lang === 'fr' ? 'Erreur suppression : ' : 'Erro ao excluir: ') + (res.error || ''));
    }
  };

  return {
    toast,
    setToast,
    showToast,
    signalToDelete,
    setSignalToDelete,
    isDeletingSignal,
    handleConfirmDelete,
  };
}
