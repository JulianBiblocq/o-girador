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
    window.addEventListener('keydown', handleCaptureKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleCaptureKeyDown, { capture: true });
  }, [customDialog, setCustomDialog]);

  if (!customDialog || typeof document === 'undefined') return null;

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

  return createPortal(
    <div
      data-testid="custom-dialog-backdrop"
      className="fixed inset-0 z-[100050] flex items-center justify-center bg-black/80 backdrop-blur-xs select-text text-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAlert) {
          setCustomDialog(null);
          customDialog.onResolve(isPrompt ? null : false);
        }
      }}
    >
      <div
        className="bg-[#f4ecd8] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] rounded-none p-5 max-w-sm w-full mx-4 flex flex-col gap-4 font-mono select-text z-[100050]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-cactus font-bold text-sm md:text-base uppercase tracking-wider border-b-2 border-[#1a1a1a] pb-2 select-none flex items-center gap-2 text-[#1a1a1a]">
          <svg className="w-5 h-5 shrink-0 text-[#8b2a1a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{titleText}</span>
        </div>

        <p className="text-xs font-cactus font-bold leading-relaxed whitespace-pre-wrap text-[#1a1a1a]">
          {customDialog.message}
        </p>

        {isPrompt && (
          <input
            id="custom-prompt-input"
            type="text"
            autoFocus
            autoComplete="off"
            className="w-full bg-white text-[#1a1a1a] border-2 border-[#1a1a1a] p-2 text-xs font-cactus font-bold outline-none shadow-[2px_2px_0px_#1a1a1a]"
            defaultValue={customDialog.defaultValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                const val = (e.target as HTMLInputElement).value;
                setCustomDialog(null);
                customDialog.onResolve(val);
              }
            }}
          />
        )}

        <div className="flex justify-end gap-2.5 mt-1 select-none">
          {!isAlert && (
            <button
              type="button"
              onClick={() => {
                setCustomDialog(null);
                customDialog.onResolve(isPrompt ? null : false);
              }}
              className="px-3.5 py-1.5 text-xs font-cactus font-extrabold uppercase bg-[#f4ecd8] hover:bg-[#e6dec8] !text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px]"
            >
              ✕ {cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus={!isPrompt}
            onClick={() => {
              const input = document.getElementById('custom-prompt-input') as HTMLInputElement;
              setCustomDialog(null);
              if (isPrompt) {
                customDialog.onResolve(input?.value || '');
              } else {
                customDialog.onResolve(true);
              }
            }}
            className={`px-4 py-1.5 text-xs font-cactus font-extrabold uppercase border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] ${
              isDestructive
                ? 'bg-[#8b2a1a] hover:bg-[#a63421] !text-[#f4ecd8]'
                : 'bg-[#1a1a1a] hover:bg-[#333333] !text-[#f4ecd8]'
            }`}
          >
            ✓ {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
