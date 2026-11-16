import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getActiveHostWindow } from '../../contexts/WindowContext';
import { resolveCordelDialogCopy, useCordelDialogCaptureKey } from './cordelDialogHelpers';

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
  const isDialogOpen = Boolean(customDialog);
  const hostWin = useMemo(() => getActiveHostWindow(), [isDialogOpen]);
  useCordelDialogCaptureKey(customDialog, setCustomDialog, hostWin);

  const portalTarget =
    hostWin?.document?.getElementById('satellite-modal-root') ||
    hostWin?.document?.getElementById('modal-root') ||
    hostWin?.document?.body;

  if (!customDialog || !portalTarget) return null;

  const { isAlert, isPrompt, isDestructive, titleText, confirmText, cancelText } =
    resolveCordelDialogCopy(customDialog, lang);

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
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] shadow-[6px_6px_0px_var(--cordel-border)] rounded-none p-5 max-w-sm w-full mx-4 flex flex-col gap-4 font-mono select-text z-[100050]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-cactus font-bold text-sm md:text-base uppercase tracking-wider border-b-2 border-[var(--cordel-border)] pb-2 select-none flex items-center gap-2 text-[var(--cordel-text)]">
          <svg className="w-5 h-5 shrink-0 text-[var(--cordel-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{titleText}</span>
        </div>

        <p className="text-xs font-cactus font-bold leading-relaxed whitespace-pre-wrap text-[var(--cordel-text)]">
          {customDialog.message}
        </p>

        {isPrompt && (
          <input
            id="custom-prompt-input"
            type="text"
            autoFocus
            autoComplete="off"
            className="w-full bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] p-2 text-xs font-cactus font-bold outline-none shadow-[2px_2px_0px_var(--cordel-border)]"
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
              className="px-3.5 py-1.5 text-xs font-cactus font-extrabold uppercase bg-[var(--cordel-bg)] hover:bg-[var(--cordel-surface)] !text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px]"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus={!isPrompt}
            onClick={() => {
              const input = hostWin.document.getElementById('custom-prompt-input') as HTMLInputElement | null;
              setCustomDialog(null);
              if (isPrompt) {
                customDialog.onResolve(input?.value || '');
              } else {
                customDialog.onResolve(true);
              }
            }}
            className={`px-4 py-1.5 text-xs font-cactus font-extrabold uppercase border-2 border-[var(--cordel-border)] shadow-[2px_2px_0px_var(--cordel-border)] cursor-pointer transition-colors active:translate-x-[1px] active:translate-y-[1px] ${
              isDestructive
                ? 'bg-[var(--cordel-accent)] !text-[var(--cordel-on-accent)]'
                : 'bg-[var(--cordel-wood)] !text-[var(--cordel-on-accent)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    portalTarget
  );
};
