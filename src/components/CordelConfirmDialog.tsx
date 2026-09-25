/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface CordelConfirmDialogProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const CordelConfirmDialog: React.FC<CordelConfirmDialogProps> = ({
  isOpen,
  title,
  subtitle,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmVariant = 'primary',
  icon,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const confirmBtnBg =
    confirmVariant === 'danger'
      ? 'bg-[#b33939] hover:bg-[#8f2727] text-white'
      : confirmVariant === 'warning'
      ? 'bg-[#d35400] hover:bg-[#b04300] text-white'
      : 'bg-[#8b2a1a] hover:bg-[#702014] text-white';

  return createPortal(
    <div
      className="fixed inset-0 z-[350] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={onCancel}
    >
      <div
        className="bg-[#f4ecd8] border-4 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] rounded-[2px_6px_3px_5px] max-w-md w-full flex flex-col relative text-[#1a1a1a] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cordel */}
        <div className="px-5 py-3.5 border-b-3 border-[#1a1a1a] bg-[#ebe2cb] flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            {subtitle && (
              <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[#8b2a1a]">
                {subtitle}
              </span>
            )}
            <h3 className="font-cactus font-bold text-lg sm:text-xl uppercase tracking-wide text-[#1a1a1a] flex items-center gap-2 truncate">
              {icon}
              <span>{title}</span>
            </h3>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[#1a1a1a] hover:text-[#8b2a1a] hover:bg-[#1a1a1a]/10 w-7 h-7 flex items-center justify-center font-bold text-lg border-2 border-[#1a1a1a] rounded-[3px] transition-colors shrink-0 cursor-pointer shadow-[2px_2px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              title="Fermer (Échap)"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Message body */}
        <div className="p-5 font-mono text-sm leading-relaxed text-[#1a1a1a] bg-[#f4ecd8]">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-3 border-t-2 border-dashed border-[#1a1a1a]/30 bg-[#ece4d0] flex items-center justify-end gap-2.5">
          {onCancel && cancelText && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 bg-[#fcf9f2] hover:bg-[#e2d8be] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 ${confirmBtnBg} border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] font-cactus font-bold text-xs uppercase cursor-pointer transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-1.5`}
          >
            {icon && <span className="opacity-90">{icon}</span>}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
