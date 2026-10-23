/**
 * Onglet Signes du Mestre avec grand aperçu, galerie interactive & caméra WebRTC (< 115 lignes).
 */

import React, { useState } from 'react';
import { Camera, Save, PlusCircle } from 'lucide-react';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { tMobile } from '../../../i18n/mobileTranslations';
import { MobileSignalTopBar } from './MobileSignalTopBar';
import { MobileSignal4TBar } from './MobileSignal4TBar';
import { MobileSignalSettingsAccordion } from './MobileSignalSettingsAccordion';
import { MobileLiveCameraBox } from './MobileLiveCameraBox';
import { useMestreSignalEditorState } from './useMestreSignalEditorState';

export const MobileMestreSignalTab: React.FC = () => {
  const lang = useSequencerStore((s) => s.lang);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  const {
    mode, setMode, name, setName,
    setRawImages, rawImages, previewImgs, selectedFrame, setSelectedFrame, isPlaying, setIsPlaying,
    isSaving, editingSignalId, globalOptions, setGlobalOptions, effectiveOptions,
    handleUpdateOptions, toggleFrameOverride, handlePickSignal, handleNewSignal, handleSave, mestreSignals,
    frameOverrides,
  } = useMestreSignalEditorState();

  return (
    <div className="flex flex-col gap-2.5 p-2 overflow-y-auto max-h-[calc(100vh-175px)] text-[var(--cordel-text)]">
      {/* 1. Bandeau supérieur compact */}
      <MobileSignalTopBar
        name={name} setName={setName} mode={mode} setMode={setMode}
        isMirror={globalOptions.isMirror} onToggleMirror={() => handleUpdateOptions({ isMirror: !globalOptions.isMirror })}
        lockFraming={globalOptions.lockFraming !== false} onToggleLockFraming={() => handleUpdateOptions({ lockFraming: globalOptions.lockFraming === false })}
        onTriggerLiveCamera={() => setIsLiveCameraOpen(true)}
        onFiles={(e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          Promise.all(files.map((f) => new Promise<string>((res) => {
            const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f);
          }))).then((imgs) => { setRawImages(imgs); setSelectedFrame(0); setIsPlaying(imgs.length > 1 && mode === 'four'); });
        }}
        lang={lang}
      />

      {/* 2. Zone Héro Centrale : Grand Format Carré Xylogravure */}
      <div className="w-full max-w-[380px] aspect-square mx-auto border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex items-center justify-center overflow-hidden shrink-0 shadow-[2px_2px_0px_var(--cordel-border)] relative">
        {isLiveCameraOpen ? (
          <MobileLiveCameraBox
            isOpen={isLiveCameraOpen} onClose={() => setIsLiveCameraOpen(false)} defaultFacingMode="user" mode={mode}
            onCapture={(imgs) => { setRawImages(imgs); setSelectedFrame(0); setIsPlaying(imgs.length > 1 && mode === 'four'); }}
            lang={lang} isInline
          />
        ) : previewImgs[selectedFrame] || previewImgs[0] ? (
          <img src={previewImgs[selectedFrame] || previewImgs[0]} alt="Xilo Preview" className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-50 p-4 text-center">
            <Camera size={36} />
            <span className="font-cactus font-bold text-xs uppercase tracking-wider">{tMobile(lang, 'signalTab')}</span>
          </div>
        )}
      </div>

      {/* 3. Barre 4 Temps si mode 4T */}
      {mode === 'four' && (
        <MobileSignal4TBar
          isPlaying={isPlaying} onTogglePlay={() => setIsPlaying((p) => !p)}
          selectedIndex={selectedFrame} onSelectFrame={(i) => { setIsPlaying(false); setSelectedFrame(i); }}
          framesCount={rawImages.length || 4} isOverridden={Boolean(frameOverrides[selectedFrame])}
          onToggleOverride={toggleFrameOverride} lang={lang}
        />
      )}

      {/* 4. Menus Accordéons & Galerie */}
      <MobileSignalSettingsAccordion
        options={effectiveOptions} onUpdateOptions={handleUpdateOptions}
        onSelectSignal={handlePickSignal} onCopyStyle={(opts) => setGlobalOptions(opts)}
        selectedSignalId={editingSignalId} signalsCount={mestreSignals.length} lang={lang}
      />

      {/* 5. Boutons de Sauvegarde et Nouveau signe */}
      <div className="flex gap-2">
        {editingSignalId && (
          <button type="button" onClick={handleNewSignal} className="py-2.5 px-3 bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] border-2 border-[var(--cordel-border)] font-cactus font-bold text-xs uppercase flex items-center justify-center gap-1 cursor-pointer">
            <PlusCircle size={14} /> <span>{tMobile(lang, 'newSignal')}</span>
          </button>
        )}
        <button
          onClick={handleSave} disabled={isSaving || !previewImgs[0] || !name.trim()}
          className="flex-1 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-cactus font-bold uppercase shadow-[2px_2px_0px_var(--cordel-border)] disabled:opacity-40 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Save size={14} /> <span>{isSaving ? '...' : tMobile(lang, editingSignalId ? 'updateSignal' : 'saveSignal')}</span>
        </button>
      </div>
    </div>
  );
};
