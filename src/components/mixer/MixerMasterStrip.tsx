/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tranche Master de la table de mixage (< 140 lignes).
 */
import React, { useRef, useState } from 'react';
import { XiloMestre, XiloScroll } from '../XiloIcons';
import { MixerVolumeFader } from '../MixerVolumeFader';
import { dbToFaderPosition, faderPositionToDb, faderPositionToGain } from '../../utils/audioMath';
import { masterVolumeNode } from '../../audio/effectsChain';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { MasterEqCompressorSection } from './MasterEqCompressorSection';
import { MasterStereoMeter } from './MasterStereoMeter';
import { MasterMonoCheckButton } from './MasterMonoCheckButton';
import { MasterAutomationBypassBox } from './master/MasterAutomationBypassBox';
import { isMasterVolumeBypassedHelper } from '../../utils/automationBypassHelper';
import { anyTrackHasRealAuto } from '../../utils/automationDetectHelper';
import { useMasterFaderAutomation } from './useMasterFaderAutomation';
import { useMasterVuMeter } from './useMasterVuMeter';
import { useMasterThemeTokens } from './useMasterThemeTokens';

interface MixerMasterStripProps {
  isMobile: boolean;
  isActive: boolean;
  isPlaying: boolean;
  lang: string;
  t: (key: string) => string;
  masterVol: number;
  onMasterVolChange: (db: number) => void;
  masterEQ: { low: number; mid: number; high: number };
  onMasterEQChange: (eq: { low: number; mid: number; high: number }) => void;
  masterCompressor: { threshold: number; ratio: number };
  onMasterCompressorChange: (comp: { threshold: number; ratio: number }) => void;
  onOpenSaveTemplate: () => void;
}

export const MixerMasterStrip: React.FC<MixerMasterStripProps> = ({
  isMobile, isActive, isPlaying, lang, t, masterVol, onMasterVolChange,
  masterEQ, onMasterEQChange, masterCompressor, onMasterCompressorChange, onOpenSaveTemplate,
}) => {
  const masterContainerRef = useRef<HTMLDivElement>(null);
  const [isMasterCollapsed, setIsMasterCollapsed] = useState(isMobile);

  const isEcoMode = useSequencerStore(state => state.isEcoMode);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const measureVols = useSequencerStore(state => state.measureVols);
  const measureVolTransitions = useSequencerStore(state => state.measureVolTransitions);
  const isMasterVolumeBypassed = useSequencerStore(state => state.isMasterVolumeBypassed);
  const toggleMasterVolumeBypass = useSequencerStore(state => state.toggleMasterVolumeBypass);
  const globalAutomationBypass = useSequencerStore(state => state.globalAutomationBypass);
  const isMasterMono = useSequencerStore(state => state.isMasterMono);
  const toggleMasterMono = useSequencerStore(state => state.toggleMasterMono);
  const tracks = useSequencerStore(state => state.tracks);

  const hasMasterVolAuto = measureVols && measureVols.some(v => v !== 100);
  const isMasterVolEffectiveBypassed = isMasterVolumeBypassedHelper(isMasterVolumeBypassed, globalAutomationBypass);
  const isMasterVolActive = !!hasMasterVolAuto && !isMasterVolEffectiveBypassed;
  const hasTrackAuto = anyTrackHasRealAuto(tracks) || hasMasterVolAuto;

  const { masterFaderHandleRef, masterFaderTextRef, masterTravelRangeRef } = useMasterFaderAutomation({
    isPlaying, isMasterVolActive, isEcoMode, masterVol, totalMeasures, measureVols, measureVolTransitions,
  });

  const { vuMeterLeftRef, vuMeterRightRef } = useMasterVuMeter({ isPlaying, isActive });
  useMasterThemeTokens(masterContainerRef);

  return (
    <div className="flex shrink-0 sticky right-0 z-20 items-stretch shadow-[-8px_0_16px_rgba(0,0,0,0.18)] ml-auto">
      <div
        ref={masterContainerRef}
        className={`flex flex-col cordel-master-strip shrink-0 text-[var(--cordel-text)] overflow-hidden pb-2 transition-all duration-300 border-2 border-[var(--master-border)] ${
          isMasterCollapsed ? 'w-[45px]' : 'w-[240px]'
        }`}
        style={{ '--fader-thumb-bg': 'var(--master-fader-thumb)', '--fader-thumb-border': 'var(--master-border)' } as React.CSSProperties}
      >
        <div className="relative px-3 py-1.5 flex justify-between items-center h-[42px] border-b-2 border-[var(--master-border)] bg-[var(--master-header-bg)] text-[var(--master-header-text)] w-full transition-colors">
          {!isMasterCollapsed ? (
            <>
              <span className="font-cactus font-black text-sm tracking-widest flex items-center gap-1.5 uppercase select-none">
                <XiloMestre size={14} className="shrink-0" /> MASTER
              </span>
              <button type="button" onClick={() => setIsMasterCollapsed(true)} className="w-6 h-6 border border-[var(--master-header-text)]/40 hover:border-[var(--master-header-text)] hover:bg-[var(--master-header-text)]/15 font-bold flex items-center justify-center rounded-[2px] cursor-pointer text-[10px]" title={lang === 'fr' ? 'Replier le Master' : 'Recolher o Master'}>►</button>
            </>
          ) : (
            <button type="button" onClick={() => setIsMasterCollapsed(false)} className="w-7 h-7 mx-auto border border-[var(--master-header-text)]/40 hover:border-[var(--master-header-text)] hover:bg-[var(--master-header-text)]/15 font-bold flex items-center justify-center rounded-[2px] cursor-pointer text-[10px]" title={lang === 'fr' ? 'Déplier le Master' : 'Expandir o Master'}>◄</button>
          )}
        </div>

        {!isMasterCollapsed ? (
          <>
            <div className="p-1.5 px-2 border-b-2 border-[var(--master-border)] bg-[var(--cordel-bg)] shrink-0 flex items-center gap-1.5">
              <button type="button" onClick={onOpenSaveTemplate} className="flex-1 py-1 px-1.5 bg-[#f4ecd8] text-[#1a1a1a] hover:bg-[#8b2a1a] hover:text-[#f4ecd8] cordel-border-sm cordel-button font-cactus font-bold text-[10px] uppercase flex items-center justify-center gap-1 transition-colors shadow-[1px_1px_0px_#1a1a1a] cursor-pointer truncate">
                <XiloScroll size={13} className="shrink-0" /><span className="truncate">{lang === 'pt' ? 'Modelo' : 'Gabarit'}</span>
              </button>
              <MasterMonoCheckButton isMasterMono={isMasterMono} onToggle={toggleMasterMono} lang={lang} />
            </div>
            {hasTrackAuto && (
              <div className="p-1.5 px-2 border-b border-[var(--master-border)]/40 bg-[var(--cordel-bg)] shrink-0">
                <MasterAutomationBypassBox lang={lang} />
              </div>
            )}
            <MasterEqCompressorSection t={t} lang={lang} masterEQ={masterEQ} onMasterEQChange={onMasterEQChange} masterCompressor={masterCompressor} onMasterCompressorChange={onMasterCompressorChange} />
            <div className="relative z-10 p-3 pt-2 flex justify-center items-stretch flex-grow flex-1 min-h-[140px] h-auto gap-7 overflow-hidden">
              <div className="flex flex-col items-center gap-1 h-full justify-end flex-1 min-w-0">
                <div className="flex items-center justify-between w-full px-1 shrink-0 h-4">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--cordel-text)]/60">Master</span>
                  {hasMasterVolAuto && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleMasterVolumeBypass(); }} className={`w-[18px] h-[18px] rounded-[3px] flex items-center justify-center font-bold text-[10px] cursor-pointer transition-all ${isMasterVolActive ? 'bg-[#8b2a1a] text-[#f4ecd8] border border-[#a83220]' : 'opacity-45 line-through bg-black/40 text-gray-400 border border-dashed border-gray-600'}`} title={isMasterVolActive ? 'Automation Master active (Clic: débrayer)' : 'Automation Master débrayée (Clic: réactiver)'}>A</button>
                  )}
                </div>
                <div className={`flex-grow flex-1 w-full flex items-center justify-center min-h-0 transition-opacity ${isMasterVolActive ? 'opacity-50 pointer-events-none' : ''}`}>
                  <MixerVolumeFader value={dbToFaderPosition(masterVol ?? 0)} defaultValue={75} thumbWidth={44} thumbHeight={24} fontSize="text-[10px]" isMaster={true} faderColor="var(--master-fader-thumb)" textColor="var(--cordel-cream, var(--cordel-bg))" faderHandleRef={masterFaderHandleRef} valueTextRefProp={masterFaderTextRef} travelRangeRef={masterTravelRangeRef} onChange={(val) => onMasterVolChange(faderPositionToDb(val))} onAudioDrag={(val) => { if (masterVolumeNode?.gain) masterVolumeNode.gain.rampTo(faderPositionToGain(val), 0.02); }} />
                </div>
              </div>
              <MasterStereoMeter vuMeterLeftRef={vuMeterLeftRef} vuMeterRightRef={vuMeterRightRef} />
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-between py-3 px-1 w-full gap-4 min-h-0 bg-[var(--master-header-bg)] text-[var(--master-header-text)] transition-colors">
            <div className="flex flex-col items-center gap-2">
              <MasterMonoCheckButton isMasterMono={isMasterMono} onToggle={toggleMasterMono} lang={lang} collapsed={true} />
            </div>
            <div className="flex-grow flex items-center justify-center select-none py-2 cursor-pointer" onClick={() => setIsMasterCollapsed(false)} title={lang === 'fr' ? 'Déplier le Master' : 'Expandir o Master'}>
              <span className="font-cactus font-black text-xs tracking-widest text-[var(--master-header-text)] opacity-85 hover:opacity-100 transition-opacity uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>MASTER</span>
            </div>
            <MasterStereoMeter vuMeterLeftRef={vuMeterLeftRef} vuMeterRightRef={vuMeterRightRef} labelColorClass="text-[var(--master-header-text)]/60" containerHeightClass="h-[280px] pb-2" />
          </div>
        )}
        <div className="w-4 shrink-0 bg-[var(--cordel-bg)] z-10 transition-colors" />
      </div>
    </div>
  );
};
