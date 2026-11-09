import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAuth } from '../contexts/AuthContext';
import { i18n } from '../data';
import { CloudRhythmSignal } from '../types';
import { SettingsHeader } from './settings/SettingsHeader';
import { SettingsClosingModal } from './settings/SettingsClosingModal';
import { BaqueLutherieBench } from './oficina/BaqueLutherieBench';
import { SettingsGrooveTab } from './settings/SettingsGrooveTab';
import { SettingsKitTab } from './settings/SettingsKitTab';
import { SettingsTemplatesTab } from './settings/SettingsTemplatesTab';
import { SettingsDesktopLayoutsTab } from './settings/SettingsDesktopLayoutsTab';
import { MidiManagerPanel } from './MidiManagerPanel';
import { SettingsSignalsTab } from './settings/SettingsSignalsTab';
import { SettingsPrensaTab } from './settings/SettingsPrensaTab';
import { SettingsEcoTab } from './settings/SettingsEcoTab';
import { SettingsAudioTab } from './settings/SettingsAudioTab';
import { SettingsHelpTab } from './settings/SettingsHelpTab';
import { useActiveStrokesByInstrument } from './settings/useActiveStrokesByInstrument';
import { getSettingsSections } from './settings/settingsSections';
import { OficinaSectionIcon } from './oficina/OficinaSectionIcons';
import { openAoVivoLabWithActiveTrack } from './AoVivo/aoVivoStrokeTester';

export { SettingsSignalThumb } from './settings/SettingsSignalThumb';

interface SettingsPageProps {
  mestreSignals?: CloudRhythmSignal[];
}

const ACCORDION_BANNER_IDLE =
  'border-2 border-[#1a1a1a] bg-[#e8dec5] text-[#1a1a1a] shadow-[3px_3px_0px_#8a7b65] hover:bg-[#dfd1b2] hover:shadow-[3px_3px_0px_#6e604c] dark:bg-[#1c1917] dark:text-[#f4ecd8] dark:border-[#d6cbb5]/65 dark:shadow-[3px_3px_0px_#4a433b] dark:hover:bg-[#2b2520] dark:hover:border-[#f4ecd8] dark:hover:shadow-[3px_3px_0px_#5c5248]';
const ACCORDION_BANNER_OPEN =
  'border-2 border-[#1a1a1a] bg-[#dfd1b2] text-[#1a1a1a] shadow-[3px_3px_0px_#6e604c] dark:bg-[#2b2520] dark:text-[#f4ecd8] dark:border-[#f4ecd8] dark:shadow-[3px_3px_0px_#5c5248]';

export const SettingsPage: React.FC<SettingsPageProps> = ({ mestreSignals = [] }) => {
  const isSettingsOpen = useSequencerSettingsStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useSequencerSettingsStore((state) => state.setIsSettingsOpen);
  const { currentUser, userProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('lutherie');

  const sequencer = useSequencer();
  const lang = sequencer?.lang || 'fr';
  const t = (key: string) => (i18n[lang] as any)?.[key] || key;

  const isDesktop = typeof window !== 'undefined' && (
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.screen.width >= 768
  );
  const activeStrokesByInstrument = useActiveStrokesByInstrument(lang, sequencer?.isLeftHanded || false);

  const userUid = currentUser?.uid || userProfile?.uid || '';
  const userEmail = (currentUser?.email || (userProfile as any)?.email || '').toLowerCase();
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const canSeeAoVivoLab = isLocalhost || userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' || userEmail === 'julian.biblocq@gmail.com';

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 85);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { setIsSettingsOpen(false); setIsClosing(false); }, 85);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); handleClose(); }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  if (!isSettingsOpen) return null;
  if (isClosing) return <SettingsClosingModal lang={lang} />;

  const sections = getSettingsSections(lang, isDesktop);

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-[var(--cordel-bg)] border-4 border-[var(--cordel-text)] w-full md:w-[92vw] max-w-6xl h-[85vh] flex flex-col shadow-[8px_8px_0px_var(--cordel-shadow-color)] relative overflow-hidden text-[var(--cordel-text)]">
        <SettingsHeader lang={lang} onSetLang={(l) => sequencer?.setLang?.(l)} onClose={handleClose} />
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar min-h-0 flex flex-col justify-start">
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 py-20">
              <span className="font-cactus font-bold text-lg tracking-wider animate-pulse">{lang === 'pt' ? 'Carregando A Oficina...' : "Chargement de l'Atelier..."}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 pb-32">
              {sections.map((sec) => {
                const isOpen = activeSection === sec.id;
                return (
                  <div key={sec.id} className={`rounded-[4px_10px_6px_12px] flex flex-col overflow-hidden transition-colors ${isOpen ? ACCORDION_BANNER_OPEN : ACCORDION_BANNER_IDLE}`}>
                    <button onClick={() => setActiveSection(isOpen ? null : sec.id)} className="w-full text-left px-4 py-2.5 font-cactus font-bold text-xs md:text-sm uppercase flex justify-between items-center transition-colors bg-transparent text-current cursor-pointer select-none border-none outline-none">
                      <span className="flex items-center gap-2.5">
                        <OficinaSectionIcon sectionId={sec.id} className="w-4 h-4 shrink-0 text-current" />
                        <span>{sec.title}</span>
                      </span>
                      <span className="font-black text-base transition-transform duration-200">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div className="p-5 border-t-2 border-[#1a1a1a] dark:border-[#d6cbb5]/50 bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs leading-relaxed font-sans text-left">
                        {sec.id === 'lutherie' && <BaqueLutherieBench lang={lang} mode="sequencer" />}
                        {sec.id === 'groove' && (
                          <div className="flex flex-col gap-6">
                            <SettingsGrooveTab lang={lang} />
                            <SettingsKitTab lang={lang} isLeftHanded={sequencer?.isLeftHanded || false} />
                          </div>
                        )}
                        {sec.id === 'gabarits' && <SettingsTemplatesTab lang={lang} confirmAsync={sequencer?.confirmAsync} onClose={handleClose} />}
                        {sec.id === 'desktopLayouts' && <SettingsDesktopLayoutsTab lang={lang} />}
                        {sec.id === 'midi' && <MidiManagerPanel />}
                        {sec.id === 'sinais' && <SettingsSignalsTab lang={lang} mestreSignals={mestreSignals} />}
                        {sec.id === 'prensa' && (
                          <SettingsPrensaTab
                            lang={lang}
                            metadata={sequencer?.metadata || { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] }}
                            letras={sequencer?.letras || ''}
                            onMetaChange={(f, v) => sequencer?.setMetadata?.({ ...sequencer.metadata, [f]: v })}
                            onLetrasChange={(v) => sequencer?.setLetras?.(v)}
                            measureBpms={sequencer?.measureBpms}
                          />
                        )}
                        {sec.id === 'performance' && <SettingsEcoTab lang={lang} confirmAsync={sequencer?.confirmAsync} alertAsync={sequencer?.alertAsync} />}
                        {sec.id === 'audio' && <SettingsAudioTab lang={lang} alertAsync={sequencer?.alertAsync} />}
                        {sec.id === 'ajuda' && <SettingsHelpTab lang={lang} t={t} activeStrokesByInstrument={activeStrokesByInstrument} />}
                      </div>
                    )}
                  </div>
                );
              })}

              {canSeeAoVivoLab && (
                <button
                  type="button"
                  onClick={() => { openAoVivoLabWithActiveTrack(); handleClose(); }}
                  className={`w-full rounded-[4px_10px_6px_12px] text-left px-4 py-2.5 font-cactus font-bold text-xs md:text-sm uppercase flex justify-between items-center transition-colors cursor-pointer select-none ${ACCORDION_BANNER_IDLE}`}
                >
                  <span className="flex items-center gap-2.5">
                    <OficinaSectionIcon sectionId="aovivo-lab" className="w-4 h-4 shrink-0 text-current" />
                    <span>{lang === 'pt' ? 'Labo Ao Vivo (Calibragem Baquetas & Mãos)' : 'Labo Ao Vivo (Calibrage Baguettes & Mains)'}</span>
                  </span>
                  <span className="font-black text-xs opacity-70">➔</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
