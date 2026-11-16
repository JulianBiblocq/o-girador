import { useEffect } from 'react';

/**
 * Intercepte Escape et Enter en phase de capture pour les boîtes de dialogue Cordel.
 */
export function useCordelDialogCaptureKey(
  customDialog: any,
  setCustomDialog: (val: any) => void,
  hostWin: Window = typeof window !== 'undefined' ? window : ({} as Window)
) {
  useEffect(() => {
    if (!customDialog || !hostWin?.addEventListener) return;
    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        setCustomDialog(null);
        customDialog.onResolve(customDialog.type === 'prompt' ? null : false);
      } else if (e.key === 'Enter' && customDialog.type !== 'prompt') {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        setCustomDialog(null);
        customDialog.onResolve(true);
      }
    };
    hostWin.addEventListener('keydown', handleCaptureKeyDown, { capture: true });
    return () => hostWin.removeEventListener('keydown', handleCaptureKeyDown, { capture: true });
  }, [customDialog, setCustomDialog, hostWin]);
}

/**
 * Calcule les libellés bilingues et l'état destructif d'une modale Cordel.
 */
export function resolveCordelDialogCopy(customDialog: any, lang: 'pt' | 'fr') {
  const isAlert = customDialog.type === 'alert';
  const isPrompt = customDialog.type === 'prompt';
  const isDestructive = customDialog.isDestructive ?? (
    Boolean(customDialog.confirmLabel && /suppr|excluir|delete/i.test(customDialog.confirmLabel)) ||
    /supprimer|excluir|écraser|substituir/i.test(customDialog.message)
  );

  const titleText = isAlert
    ? (lang === 'pt' ? 'AVISO' : 'INFORMATION')
    : customDialog.type === 'confirm'
      ? (lang === 'pt' ? 'CONFIRMAÇÃO' : 'CONFIRMATION')
      : (lang === 'pt' ? 'ENTRADA' : 'SAISIE');

  const confirmText = customDialog.confirmLabel
    ? customDialog.confirmLabel.toUpperCase()
    : isAlert
      ? (lang === 'pt' ? 'FECHAR' : 'FERMER')
      : isDestructive
        ? (lang === 'pt' ? 'EXCLUIR' : 'SUPPRIMER')
        : (lang === 'pt' ? 'CONFIRMAR' : 'VALIDER');

  const cancelText = customDialog.cancelLabel
    ? customDialog.cancelLabel.toUpperCase()
    : (lang === 'pt' ? 'CANCELAR' : 'ANNULER');

  return { isAlert, isPrompt, isDestructive, titleText, confirmText, cancelText };
}
