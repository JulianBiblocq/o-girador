import React, { useRef, useState } from 'react';
import { Sliders, ChevronRight } from 'lucide-react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { masterVolumeNode } from '../../hooks/useAudioSync';
import { dbToFaderPosition, faderPositionToDb, faderPositionToGain } from '../../utils/audioMath';
import { safeRampTo } from '../../utils/audio/safeAudioParamRamp';
import { anyTrackHasRealAuto } from '../../utils/automationDetectHelper';
import { isMasterVolumeBypassedHelper } from '../../utils/automationBypassHelper';
import { MixerMasterEffects } from '../MixerMasterEffects';
import { StudioRackModuleId } from './masterEffectsTypes';
import { MixerVolumeFader } from '../MixerVolumeFader';
import { useMasterVuMeter } from './useMasterVuMeter';
import { useMasterFaderAutomation } from './useMasterFaderAutomation';
import { useMasterThemeTokens } from './useMasterThemeTokens';
import { MasterStereoMeter } from './MasterStereoMeter';
import { MasterCollapsedStrip } from './MasterCollapsedStrip';
import { MasterAutomationBypassBox } from './master/MasterAutomationBypassBox';

interface MixerMasterStripProps {
  isMobile: boolean; isActive: boolean; isPlaying: boolean; lang: string;
  t: (key: string) => string; masterVol: number; onMasterVolChange: (vol: number) => void;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  onOpenSaveTemplate: () => void;
  onOpenStudioRack?: (module: StudioRackModuleId) => void;
}

export const MixerMasterStrip: React.FC<MixerMasterStripProps> = ({
  isMobile, isActive, isPlaying, lang, t, masterVol, onMasterVolChange,
  masterEQ, onMasterEQChange, masterCompressor, onMasterCompressorChange,
  onOpenSaveTemplate, onOpenStudioRack,
}) => {
  const isEcoMode = useSequencerStore(s => s.isEcoMode);
  const isPracticeMode = useSequencerStore(s => Boolean((s as any).isPracticeMode));
  const totalMeasures = useSequencerStore(s => s.totalMeasures);
  const measureVols = useSequencerStore(s => s.measureVols);
  const measureVolTransitions = useSequencerStore(s => s.measureVolTransitions);
  const isMasterVolumeBypassed = useSequencerStore(s => s.isMasterVolumeBypassed);
  const globalAutomationBypass = useSequencerStore(s => s.globalAutomationBypass);
  const toggleMasterVolumeBypass = useSequencerStore(s => s.toggleMasterVolumeBypass);
  const isMasterMono = useSequencerStore(s => s.isMasterMono);
  const toggleMasterMono = useSequencerStore(s => s.toggleMasterMono);
  const masterEffectsActive = useSequencerStore(s => s.masterEffectsActive);
  const toggleMasterEffectActive = useSequencerStore(s => s.toggleMasterEffectActive);
  const hasTrackAuto = useSequencerStore(s => anyTrackHasRealAuto(s.tracks));

  const hasMasterVolAuto = Boolean(measureVols && measureVols.some(v => v !== 100 && v !== 75));
  const isMasterVolActive = hasMasterVolAuto && !isMasterVolumeBypassedHelper(isMasterVolumeBypassed, globalAutomationBypass);
  const hasAnyGlobalAuto = hasMasterVolAuto || hasTrackAuto;
  const masterContainerRef = useRef<HTMLDivElement>(null);
  const [isMasterCollapsed, setIsMasterCollapsed] = useState(isMobile);
  useMasterThemeTokens(masterContainerRef);

  const {
    vuMeterLeftRef, vuMeterRightRef, rmsVeilLeftRef, rmsVeilRightRef, peakLeftRef, peakRightRef,
    clipLeftRef, clipRightRef, grMeterRef, dbTextRef, clearMasterClipLeds,
  } = useMasterVuMeter({ isPlaying, isActive });

  const { masterFaderHandleRef, masterFaderTextRef, masterTravelRangeRef } = useMasterFaderAutomation({
    isPlaying, isMasterVolActive, isEcoMode, masterVol, totalMeasures, measureVols, measureVolTransitions,
  });

  return (
    <div ref={masterContainerRef} className={`${isMasterCollapsed ? 'w-[44px]' : 'w-[218px] md:w-[236px]'} shrink-0 h-full cordel-master-strip flex flex-col justify-between text-[var(--cordel-text)] z-20 transition-all duration-300 relative select-none`}>
      {isMasterCollapsed ? (
        <MasterCollapsedStrip
          lang={lang} isMasterMono={isMasterMono} onToggleMono={toggleMasterMono}
          onExpand={() => setIsMasterCollapsed(false)}
          vuMeterLeftRef={vuMeterLeftRef} vuMeterRightRef={vuMeterRightRef}
          rmsVeilLeftRef={rmsVeilLeftRef} rmsVeilRightRef={rmsVeilRightRef}
          peakLeftRef={peakLeftRef} peakRightRef={peakRightRef}
          clipLeftRef={clipLeftRef} clipRightRef={clipRightRef} onClearClip={clearMasterClipLeds}
        />
      ) : (
        <>
          <div className="bg-[var(--master-header-bg)] text-[var(--master-header-text)] p-1.5 text-center border-b-[3px] border-[var(--cordel-border)] flex items-center justify-between gap-1 shrink-0 min-h-[36px]">
            <button
              type="button" onClick={() => setIsMasterCollapsed(true)}
              className="text-[var(--master-header-text)]/80 hover:text-[var(--master-header-text)] p-0.5 rounded transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              title={lang === 'fr' ? 'Replier la tranche Master' : 'Recolher a faixa Master'}
            >
              <ChevronRight size={16} />
            </button>
            <div className="flex items-center justify-center gap-1.5 flex-1">
              <Sliders size={14} className="shrink-0" />
              <span className="font-cactus font-black text-base tracking-widest uppercase truncate">{t('masterTitle')}</span>
            </div>
            <div className="w-4 shrink-0" />
          </div>

          <div className="flex p-2 flex-col gap-2 flex-1 min-h-0 justify-between overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
            {hasAnyGlobalAuto && <MasterAutomationBypassBox lang={lang} />}
            <MixerMasterEffects
              t={t} lang={lang} isMobile={isMobile} isPracticeMode={isPracticeMode}
              masterEQ={masterEQ} onMasterEQChange={onMasterEQChange}
              masterCompressor={masterCompressor} onMasterCompressorChange={onMasterCompressorChange}
              masterEffectsActive={masterEffectsActive} onToggleEffect={toggleMasterEffectActive}
              onOpenStudioRack={onOpenStudioRack} grMeterRef={grMeterRef}
            />

            <div className="flex flex-col flex-1 min-h-[140px] justify-end mt-1 pt-1.5 border-t border-[var(--cordel-border)] overflow-hidden">
              <span className="font-cactus font-extrabold text-[9.5px] uppercase text-center mb-0.5 tracking-widest text-[var(--cordel-text)] opacity-90 shrink-0">
                {t('masterVol')}
              </span>
              <div className="flex items-center justify-center gap-3 flex-1 min-h-0 px-2 overflow-hidden">
                <div className="h-full flex-1 min-h-0 flex justify-center">
                  <MixerVolumeFader
                    isMaster={true} value={dbToFaderPosition(masterVol)}
                    onAudioDrag={(pos) => { if (masterVolumeNode?.gain) safeRampTo(masterVolumeNode.gain, faderPositionToGain(pos), 0.02, 0, 2); }}
                    onChange={(pos) => onMasterVolChange(faderPositionToDb(pos))}
                    faderHandleRef={masterFaderHandleRef} valueTextRefProp={masterFaderTextRef} travelRangeRef={masterTravelRangeRef}
                    hasVolAuto={hasMasterVolAuto} isVolActive={isMasterVolActive} onToggleVolBypass={toggleMasterVolumeBypass}
                  />
                </div>
                <MasterStereoMeter
                  lang={lang} dbTextRef={dbTextRef} vuMeterLeftRef={vuMeterLeftRef} vuMeterRightRef={vuMeterRightRef}
                  rmsVeilLeftRef={rmsVeilLeftRef} rmsVeilRightRef={rmsVeilRightRef}
                  peakLeftRef={peakLeftRef} peakRightRef={peakRightRef} clipLeftRef={clipLeftRef} clipRightRef={clipRightRef} onClearClip={clearMasterClipLeds}
                />
              </div>
              <div className="mt-2 pt-1.5 border-t border-[var(--cordel-border)]/45 shrink-0">
                <button
                  type="button" onClick={onOpenSaveTemplate}
                  className="w-full min-h-[40px] py-2.5 px-3 bg-[var(--cordel-parchment-bg)] text-[var(--cordel-ink-dark)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] shadow-[2px_2px_0px_var(--cordel-ink-dark)] rounded-[2px] font-cactus font-extrabold text-[11px] tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  title={lang === 'fr' ? 'Sauvegarder la disposition actuelle comme gabarit par défaut' : 'Salvar o layout atual como modelo padrão'}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                  <span className="truncate">{lang === 'fr' ? 'Gabarit du Baque' : 'Modelo do Baque'}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
