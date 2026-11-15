import React from 'react';
import { Camera, Check, Upload, X } from 'lucide-react';
import { useWizardStore } from '../../stores/useWizardStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { Language, RhythmSignal } from '../../types';
import { t } from './wizardConstants';

export function getDefaultWizardSigns(wizardLang: Language) {
  return [
    { id: 'pictures/sign-luanda.png', name: wizardLang === 'fr' ? 'Signe Luanda' : 'Sinal Luanda', image: '/Pictures/sign-luanda.png' },
    { id: 'pictures/tambour.png', name: wizardLang === 'fr' ? 'Signe Martelo' : 'Sinal Martelo', image: 'pictures/tambour.png' },
    { id: 'pictures/atelier.png', name: wizardLang === 'fr' ? 'Signe Trovão' : 'Sinal Trovão', image: 'pictures/atelier.png' },
  ];
}

interface WizardStep2SignsProps {
  wizardLang: Language;
  customSignalsMap: Record<string, RhythmSignal>;
  onOpenPhotoBooth: () => void;
  onSignalFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WizardStep2Signs: React.FC<WizardStep2SignsProps> = ({
  wizardLang,
  customSignalsMap,
  onOpenPhotoBooth,
  onSignalFileChange,
}) => {
  const mestreSignals = useSequencerStore((state) => state.mestreSignals);
  const selectedSignIds = useWizardStore((state) => state.selectedSignIds);
  const toggleSignId = useWizardStore((state) => state.toggleSignId);

  const defaultSigns = getDefaultWizardSigns(wizardLang);
  const mestreSignsList =
    mestreSignals && mestreSignals.length > 0
      ? mestreSignals.map((s) => ({ id: s.id || s.name, name: s.name, image: s.imageUrl || s.image }))
      : defaultSigns;

  const resolvePreviewSrc = (id: string): string => {
    if (customSignalsMap[id]?.image) return customSignalsMap[id].image;
    const fromStore = mestreSignals?.find((s) => (s.id || s.name) === id);
    if (fromStore) return fromStore.imageUrl || fromStore.image;
    const fromDef = defaultSigns.find((d) => d.id === id);
    return fromDef ? fromDef.image : id;
  };

  return (
    <div className="bg-[var(--cordel-surface)] border-3 border-[var(--cordel-border-strong)] p-4 md:p-5 shadow-[4px_4px_0px_var(--cordel-shadow-color)] flex flex-col gap-3.5 rounded-sm">
      <h3 className="font-cactus text-base md:text-lg font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider border-b border-[var(--cordel-border)] pb-1">
        {t[wizardLang].blason}
      </h3>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] md:text-xs font-cactus font-bold uppercase text-[var(--cordel-text-muted)]">
          {t[wizardLang].choixSigne}
        </label>
        <div className="flex gap-3 overflow-x-auto p-2 border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-bg)] rounded-sm">
          {mestreSignsList.map((sign) => {
            const isSelected = selectedSignIds.includes(sign.id);
            return (
              <button
                key={sign.id}
                type="button"
                onClick={() => toggleSignId(sign.id)}
                title={sign.name}
                className={`relative flex-shrink-0 w-16 h-16 p-1.5 border-2 bg-[var(--cordel-surface-elevated)] cursor-pointer flex items-center justify-center transition-transform ${
                  isSelected
                    ? 'border-[var(--cordel-accent-readable)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] scale-105'
                    : 'border-[var(--cordel-border)] hover:border-[var(--cordel-border-strong)]'
                }`}
              >
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] rounded-full w-5 h-5 flex items-center justify-center border border-[var(--cordel-border-strong)] z-10">
                    <Check size={12} />
                  </span>
                )}
                <img src={sign.image} className="w-full h-full object-contain pointer-events-none" alt={sign.name} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center border-t border-[var(--cordel-border)] pt-3">
        <div className="flex-1 flex gap-2 overflow-x-auto p-1 min-h-[3rem] items-center w-full">
          {selectedSignIds.length === 0 ? (
            <span className="text-[10px] text-[var(--cordel-text-muted)] italic">
              {wizardLang === 'fr' ? 'Aucun signe sélectionné' : 'Nenhum sinal selecionado'}
            </span>
          ) : (
            selectedSignIds.map((id) => (
              <div
                key={id}
                className="w-12 h-12 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] flex items-center justify-center overflow-hidden flex-shrink-0 relative"
              >
                <button
                  type="button"
                  onClick={() => toggleSignId(id)}
                  className="absolute top-0 right-0 bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] w-4 h-4 flex items-center justify-center cursor-pointer z-10"
                >
                  <X size={10} />
                </button>
                <img src={resolvePreviewSrc(id)} className="w-10 h-10 object-contain" alt="Signe" />
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={onOpenPhotoBooth}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            <Camera size={14} />
            <span>{wizardLang === 'fr' ? 'Photo-cabine' : 'Cabine de Fotos'}</span>
          </button>
          <label className="px-3 py-2 bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-accent-readable)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer font-cactus font-bold uppercase text-xs tracking-wider flex items-center gap-1.5">
            <Upload size={14} />
            <span>{t[wizardLang].importFichier}</span>
            <input type="file" accept="image/*" onChange={onSignalFileChange} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
