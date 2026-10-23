/**
 * Boîte modale Cordel pour les outils de synchronisation Bluetooth (< 130 lignes).
 */
import React from 'react';
import { useBluetoothLatencyStore } from '../../utils/bluetoothLatencyStore';
import { btTranslations } from '../../utils/bluetoothTranslations';
import { BluetoothOnboardingCard } from './BluetoothOnboardingCard';
import { BluetoothProfileSelector } from './BluetoothProfileSelector';
import { BluetoothPingCalibration } from './BluetoothPingCalibration';
import { BluetoothVisualCalibration } from './BluetoothVisualCalibration';
import { X } from 'lucide-react';

interface Props {
  lang: 'fr' | 'pt';
}

export const BluetoothModalContainer: React.FC<Props> = ({ lang }) => {
  const { isModalOpen, activeModalTab, openModal, closeModal } = useBluetoothLatencyStore();
  const t = btTranslations[lang];

  if (!isModalOpen) return null;

  const getTitle = () => {
    if (activeModalTab === 'onboarding') return t.onboardingTitle;
    if (activeModalTab === 'ping') return t.pingTitle;
    if (activeModalTab === 'visual') return t.visualTitle;
    return t.quickAdjustTitle;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-sm border-2 border-black bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[4px_4px_0_#000] p-4 flex flex-col gap-3 rounded-none relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[var(--cordel-border)] pb-2">
          <h3 className="font-cactus font-bold text-sm tracking-wide uppercase truncate pr-2">
            {getTitle()}
          </h3>
          <button
            type="button"
            onClick={closeModal}
            className="w-7 h-7 flex items-center justify-center border border-[var(--cordel-border)] bg-[var(--cordel-surface)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Corps de la modale */}
        <div>
          {activeModalTab === 'onboarding' && (
            <BluetoothOnboardingCard
              lang={lang}
              onLaunchTool={(tool) => openModal(tool)}
              onDone={closeModal}
            />
          )}

          {activeModalTab === 'selector' && (
            <BluetoothProfileSelector
              lang={lang}
              onSelectTab={(tab) => openModal(tab)}
              onClose={closeModal}
            />
          )}

          {activeModalTab === 'ping' && (
            <BluetoothPingCalibration
              lang={lang}
              onDone={() => openModal('selector')}
            />
          )}

          {activeModalTab === 'visual' && (
            <BluetoothVisualCalibration
              lang={lang}
              onDone={() => openModal('selector')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
