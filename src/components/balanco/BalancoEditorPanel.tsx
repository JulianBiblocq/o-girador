import React, { useState } from 'react';
import { Globe, Layers } from 'lucide-react';
import { GlobalSwing, Language } from '../../types';
import { BalancoModeSelector } from './BalancoModeSelector';
import { BalancoCustomSection } from './BalancoCustomSection';
import { BalancoStepSliders } from './BalancoStepSliders';
import { BalancoIntensitySlider } from './BalancoIntensitySlider';
import { BalancoModalsOverlay } from './BalancoModalsOverlay';
import { useBalancoPreview } from './useBalancoPreview';
import { useBalancoManager } from './useBalancoManager';
import { canManagePreset } from './balancoHelpers';

interface BalancoLocalOverrideScope {
  tier: 'track' | 'pattern';
  presetId?: string;
  amount: number;
  onPresetChange: (presetId: string) => void;
  onAmountChange: (amount: number) => void;
  onSwitchToGlobal: () => void;
}

interface BalancoEditorPanelProps {
  globalSwing: GlobalSwing;
  setGlobalSwing: (gs: GlobalSwing) => void;
  lang: Language;
  compact?: boolean;
  overrideScope?: BalancoLocalOverrideScope;
}

export const BalancoEditorPanel: React.FC<BalancoEditorPanelProps> = ({
  globalSwing, setGlobalSwing, lang, compact = false, overrideScope,
}) => {
  const isFr = lang === 'fr';
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  const sliderMode: 'maracatu' | 'custom' = globalSwing.mode === 'custom' ? 'custom' : 'maracatu';
  const mgr = useBalancoManager(globalSwing, setGlobalSwing, lang);
  const { isPreviewPlaying, togglePreview } = useBalancoPreview(
    globalSwing.customOffsets, globalSwing.swingIntensity ?? 100, sliderMode, isCaptureModalOpen
  );

  const handleNudgeGroup = (delta: number) => {
    const newOffsets = globalSwing.customOffsets.map((v) => Math.max(-100, Math.min(100, (v ?? 0) + delta))) as [number, number, number, number];
    setGlobalSwing({ ...globalSwing, mode: 'custom', customOffsets: newOffsets });
  };

  const handleOffsetChange = (index: number, val: number) => {
    const newOffsets = [...globalSwing.customOffsets] as [number, number, number, number];
    newOffsets[index] = val;
    setGlobalSwing({ ...globalSwing, mode: 'custom', customOffsets: newOffsets });
  };

  const triggerCloudSync = () => {
    if (mgr.userProfile?.uid) {
      mgr.syncCloudPresets(mgr.userProfile.uid, mgr.userProfile.groupId, mgr.userProfile.role, mgr.userProfile.mestreId, mgr.userProfile.canWriteSequenciador);
    }
  };

  if (overrideScope) {
    const isTrackTier = overrideScope.tier === 'track';
    return (
      <div className="flex flex-col gap-3.5 text-left select-none text-[var(--cordel-text)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cordel-border)] pb-2">
          <span className="font-cactus font-bold text-sm uppercase flex items-center gap-1.5">
            <Layers size={14} className="text-[var(--cordel-accent-readable)] shrink-0" />
            {isTrackTier ? (isFr ? 'Surcharge Locale du Pupitre' : 'Sobrescrita Local do Naipe') : (isFr ? 'Surcharge Locale du Motif' : 'Sobrescrita Local do Padrão')}
          </span>
          <button
            type="button" data-testid="groove-edit-global-dna-btn" onClick={overrideScope.onSwitchToGlobal}
            className="px-2.5 py-1 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border border-[var(--cordel-card-btn-border)] text-[11px] font-bold hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)]"
          >
            <Globe size={12} className="shrink-0" />
            <span>{isFr ? "Modifier l'ADN du Preset (Global)" : 'Editar DNA do Preset (Global)'}</span>
          </button>
        </div>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-[var(--cordel-text)]">
          <span>{isFr ? 'Preset de Balanço appliqué :' : 'Preset de Balanço aplicado :'}</span>
          <select
            data-testid="groove-override-preset-select" value={overrideScope.presetId ?? ''} onChange={(e) => overrideScope.onPresetChange(e.target.value)}
            className="bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="">{isTrackTier ? (isFr ? '(Hériter du Morceau Global)' : '(Herdar da Música Global)') : (isFr ? '(Hériter de la Piste / Global)' : '(Herdar da Faixa / Global)')}</option>
            {mgr.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <BalancoIntensitySlider
          sliderTestId="groove-override-amount-slider" swingIntensity={overrideScope.amount} lang={lang}
          label={isTrackTier ? (isFr ? 'Dosage du Balanço sur ce Pupitre :' : 'Dosagem do Balanço neste Naipe :') : (isFr ? 'Dosage du Balanço sur ce Motif :' : 'Dosagem do Balanço neste Padrão :')}
          hint={isFr ? '0% = strictement droit sur cette cible • 100% = adhérence complète au preset actif.' : '0% = estritamente reto neste alvo • 100% = aderência total ao preset ativo.'}
          onChange={overrideScope.onAmountChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 text-left select-none text-[var(--cordel-text)]">
      <BalancoModeSelector
        activeMode={globalSwing.mode} selectedPresetId={mgr.selectedPresetId} selectedPreset={mgr.selectedPreset}
        presets={mgr.presets} userProfile={mgr.userProfile} compact={compact} isLoadingCloud={mgr.isLoadingCloud}
        canManageSelectedPreset={canManagePreset(mgr.selectedPreset, mgr.userProfile)} lang={lang}
        onModeChange={(mode) => setGlobalSwing({ ...globalSwing, mode })} onRefreshCloud={triggerCloudSync}
        onOpenLibrary={() => setIsLibraryModalOpen(true)} onPresetSelect={mgr.handlePresetSelect}
        onLoadToCustom={mgr.handleLoadToCustom} onRequestDelete={(p) => mgr.setPresetToDelete(p)}
      />
      {globalSwing.mode === 'custom' && (
        <BalancoCustomSection
          editingPresetId={mgr.editingPresetId} editingPreset={mgr.editingPreset} customName={mgr.customName}
          isSaving={mgr.isSaving} canManageEditingPreset={canManagePreset(mgr.editingPreset, mgr.userProfile)}
          isPreviewPlaying={isPreviewPlaying} lang={lang} setEditingPresetId={mgr.setEditingPresetId}
          setCustomName={mgr.setCustomName} onOpenCaptureModal={() => setIsCaptureModalOpen(true)}
          onSaveCustomPreset={mgr.handleSaveCustomPreset} onNudgeGroup={handleNudgeGroup} onTogglePreview={togglePreview}
        />
      )}
      {globalSwing.mode === 'off' ? (
        <div className="p-3 bg-[var(--cordel-surface)] border border-[var(--cordel-border)] rounded-sm text-xs text-[var(--cordel-text-muted)] font-semibold">
          {isFr ? 'Balanço global désactivé : tous les pupitres et motifs jouent de manière strictement quantisée (0.0 ms).' : 'Balanço global desativado: todos os naipes e padrões tocam de forma estritamente quantizada (0.0 ms).'}
        </div>
      ) : (
        <>
          <BalancoStepSliders customOffsets={globalSwing.customOffsets} activeMode={sliderMode} lang={lang} onOffsetChange={handleOffsetChange} onResetCustom={mgr.handleResetCustom} />
          <BalancoIntensitySlider swingIntensity={globalSwing.swingIntensity} lang={lang} onChange={(val) => setGlobalSwing({ ...globalSwing, swingIntensity: val })} />
        </>
      )}
      <BalancoModalsOverlay
        isCaptureModalOpen={isCaptureModalOpen} onCloseCaptureModal={() => setIsCaptureModalOpen(false)}
        isLibraryModalOpen={isLibraryModalOpen} onCloseLibraryModal={() => setIsLibraryModalOpen(false)}
        lang={lang} globalSwing={globalSwing} setGlobalSwing={setGlobalSwing} mgr={mgr} triggerCloudSync={triggerCloudSync}
      />
    </div>
  );
};
