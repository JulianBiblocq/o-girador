/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CustomDialogPortalProps {
  customDialog: any;
  setCustomDialog: (val: any) => void;
  lang: 'pt' | 'fr';
}

export const CordelCustomDialogPortal: React.FC<CustomDialogPortalProps> = ({
  customDialog,
  setCustomDialog,
  lang,
}) => {
  useEffect(() => {
    if (!customDialog) return;
    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setCustomDialog(null);
        customDialog.onResolve(customDialog.type === 'prompt' ? null : false);
      } else if (e.key === 'Enter' && customDialog.type !== 'prompt') {
        e.stopImmediatePropagation();
        e.preventDefault();
        setCustomDialog(null);
        customDialog.onResolve(true);
      }
    };
    window.addEventListener('keydown', handleCaptureKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleCaptureKeyDown, { capture: true });
  }, [customDialog, setCustomDialog]);

  if (!customDialog || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-testid="custom-dialog-backdrop"
      className="fixed inset-0 z-[100050] flex items-center justify-center bg-black/80 backdrop-blur-xs select-text text-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && customDialog.type !== 'alert') {
          setCustomDialog(null);
          customDialog.onResolve(customDialog.type === 'prompt' ? null : false);
        }
      }}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[6px_6px_0_var(--cordel-border)] p-5 max-w-sm w-full mx-4 flex flex-col gap-4 font-mono select-text z-[100050]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-cactus font-bold text-base border-b-2 border-[var(--cordel-border)] pb-2 select-none">
          {customDialog.type === 'alert' ? '📢 Info' : customDialog.type === 'confirm' ? '❓' : '📝'} {customDialog.type === 'alert' ? (lang === 'pt' ? 'Aviso' : 'Information') : customDialog.type === 'confirm' ? (lang === 'pt' ? 'Confirmação' : 'Confirmation') : (lang === 'pt' ? 'Entrada' : 'Saisie')}
        </div>
        <p className="text-xs leading-relaxed whitespace-pre-wrap">{customDialog.message}</p>
        {customDialog.type === 'prompt' && (
          <input
            id="custom-prompt-input"
            type="text"
            autoFocus
            autoComplete="off"
            className="w-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-1.5 text-xs outline-none focus:bg-[var(--cordel-text)] focus:text-[var(--cordel-bg)]"
            defaultValue={customDialog.defaultValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value;
                setCustomDialog(null);
                customDialog.onResolve(val);
              }
            }}
          />
        )}
        <div className="flex justify-end gap-2.5 mt-2 select-none">
          {customDialog.type !== 'alert' && (
            <button
              type="button"
              onClick={() => {
                setCustomDialog(null);
                customDialog.onResolve(customDialog.type === 'prompt' ? null : false);
              }}
              className="px-3 py-1 text-xs border-2 border-[var(--cordel-border)] hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors font-bold cursor-pointer"
            >
              {customDialog.cancelLabel || (lang === 'pt' ? 'Cancelar' : 'Annuler')}
            </button>
          )}
          <button
            type="button"
            autoFocus={customDialog.type !== 'prompt'}
            onClick={() => {
              const input = document.getElementById('custom-prompt-input') as HTMLInputElement;
              setCustomDialog(null);
              if (customDialog.type === 'prompt') {
                customDialog.onResolve(input?.value || '');
              } else {
                customDialog.onResolve(true);
              }
            }}
            className="px-4 py-1 text-xs bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:bg-[var(--cordel-border)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer focus:ring-2 focus:ring-[var(--cordel-border)] focus:outline-none"
          >
            {customDialog.confirmLabel || (lang === 'pt' ? 'OK' : 'Valider')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
