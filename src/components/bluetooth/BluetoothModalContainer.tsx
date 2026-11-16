/**
 * Boîte modale Cordel en portail pour les outils de synchronisation Bluetooth (< 100 lignes).
 */
import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getActiveHostWindow } from '../../contexts/WindowContext';
import { useBluetoothLatencyStore } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';
import { BluetoothOnboardingCard } from './BluetoothOnboardingCard';
import { BluetoothProfileSelector } from './BluetoothProfileSelector';
import { BluetoothPingCalibration } from './BluetoothPingCalibration';
import { BluetoothVisualCalibration } from './BluetoothVisualCalibration';

interface Props {
  lang: 'fr' | 'pt';
}

export const BluetoothModalContainer: React.FC<Props> = ({ lang }) => {
  const isModalOpen = useBluetoothLatencyStore((s) => s.isModalOpen);
  const activeModalTab = useBluetoothLatencyStore((s) => s.activeModalTab);
  const openModal = useBluetoothLatencyStore((s) => s.openModal);
  const closeModal = useBluetoothLatencyStore((s) => s.closeModal);
  const hostWin = useMemo(() => getActiveHostWindow(), [isModalOpen]);
  const t = btTranslations[lang];

  useEffect(() => {
    if (!isModalOpen || !hostWin?.addEventListener) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeModal();
      }
    };
    hostWin.addEventListener('keydown', onKeyDown, { capture: true });
    return () => hostWin.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [isModalOpen, closeModal, hostWin]);

  const portalTarget =
    hostWin?.document?.getElementById('satellite-modal-root') ||
    hostWin?.document?.getElementById('modal-root') ||
    hostWin?.document?.body;

  if (!isModalOpen || !portalTarget) return null;

  const title =
    activeModalTab === 'onboarding'
      ? t.onboardingTitle
      : activeModalTab === 'ping'
        ? t.pingTitle
        : activeModalTab === 'visual'
          ? t.visualTitle
          : t.quickAdjustTitle;

  return createPortal(
    <div
      className="fixed inset-0 z-[100045] flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs select-none"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-sm border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[5px_5px_0_var(--cordel-shadow-color)] p-4 flex flex-col gap-3 rounded-none relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2">
          <h3 className="font-cactus font-bold text-sm tracking-wide uppercase truncate pr-2">
            {title}
          </h3>
          <button
            type="button"
            onClick={closeModal}
            aria-label={t.btnCancel}
            className="w-7 h-7 flex items-center justify-center border border-[var(--cordel-border)] bg-[var(--cordel-surface)] hover:bg-[var(--cordel-accent)] hover:text-[var(--cordel-on-accent)] cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div>
          {activeModalTab === 'onboarding' && (
            <BluetoothOnboardingCard lang={lang} onLaunchTool={(tool) => openModal(tool)} onDone={closeModal} />
          )}
          {activeModalTab === 'selector' && (
            <BluetoothProfileSelector lang={lang} onSelectTab={(tab) => openModal(tab)} onClose={closeModal} />
          )}
          {activeModalTab === 'ping' && (
            <BluetoothPingCalibration lang={lang} onDone={() => openModal('selector')} />
          )}
          {activeModalTab === 'visual' && (
            <BluetoothVisualCalibration lang={lang} onDone={() => openModal('selector')} />
          )}
        </div>
      </div>
    </div>,
    portalTarget
  );
};
