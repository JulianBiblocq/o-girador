import React from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { useWizardStore } from '../../stores/useWizardStore';
import { Language } from '../../types';
import { t } from './wizardConstants';
import { WIZARD_EXPRESS_FORMATIONS, buildPlacedFromFormation, WizardExpressFormation } from './wizardFormations';
import { preloadWizardInstruments, stopAllWizardSpatialNodes } from './audio/wizardSpatialPreview';

interface WizardExpressFormationsBarProps {
  wizardLang: Language;
  placedCount: number;
  showToast: (msg: string) => void;
}

export const WizardExpressFormationsBar: React.FC<WizardExpressFormationsBarProps> = ({
  wizardLang,
  placedCount,
  showToast,
}) => {
  const setPlacedInstruments = useWizardStore((s) => s.setPlacedInstruments);
  const hasApito = useWizardStore((s) => s.hasApito);
  const setHasApito = useWizardStore((s) => s.setHasApito);
  const isPt = wizardLang === 'pt';

  const handleApplyFormation = (formation: WizardExpressFormation) => {
    const placed = buildPlacedFromFormation(formation);
    stopAllWizardSpatialNodes();
    setPlacedInstruments(placed);
    void preloadWizardInstruments(placed.map((i) => i.instrumentType));
    const label = isPt ? formation.labelPt : formation.labelFr;
    showToast(isPt ? `${label} posicionado no Palco !` : `${label} déployé sur La Place !`);
  };

  const handleClearStage = () => {
    stopAllWizardSpatialNodes();
    setPlacedInstruments([]);
    setHasApito(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border)] rounded-sm flex-shrink-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-[10px] font-cactus font-bold uppercase tracking-wider text-[var(--cordel-accent-readable)] mr-1">
          <Sparkles size={13} className="shrink-0" />
          <span>{t[wizardLang].formationsLabel}</span>
        </span>
        {WIZARD_EXPRESS_FORMATIONS.map((f) => {
          const label = isPt ? f.labelPt : f.labelFr;
          const desc = isPt ? f.descPt : f.descFr;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => handleApplyFormation(f)}
              title={desc}
              className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-cactus font-bold uppercase text-[10px] md:text-[11px] cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <span>{label}</span>
              <span className="text-[9px] font-mono opacity-75">({f.slots.length})</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleClearStage}
        disabled={placedCount === 0 && !hasApito}
        className="px-2.5 py-1 bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-status-danger)] text-[var(--cordel-text-muted)] hover:text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] font-cactus font-bold uppercase text-[10px] cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none"
      >
        <Trash2 size={12} />
        <span>{t[wizardLang].viderPlace}</span>
      </button>
    </div>
  );
};
