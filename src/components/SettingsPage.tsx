import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';
import { useSequencer } from '../contexts/SequencerContext';
import { i18n } from '../data';
import { CloudRhythmSignal } from '../types';
import { SettingsHeader } from './settings/SettingsHeader';
import { SettingsClosingModal } from './settings/SettingsClosingModal';
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

export { SettingsSignalThumb } from './settings/SettingsSignalThumb';

interface SettingsPageProps {
  mestreSignals?: CloudRhythmSignal[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ mestreSignals = [] }) => {
  const isSettingsOpen = useSequencerSettingsStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useSequencerSettingsStore((state) => state.setIsSettingsOpen);

  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('groove');

  const sequencer = useSequencer();
  const lang = sequencer?.lang || 'fr';
  const t = (key: string) => (i18n[lang] as any)?.[key] || key;

  const isDesktop = typeof window !== 'undefined' && (
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.screen.width >= 768
  );
  const activeStrokesByInstrument = useActiveStrokesByInstrument(lang, sequencer?.isLeftHanded || false);

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
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handleClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isSettingsOpen) return null;
  if (isClosing) return <SettingsClosingModal lang={lang} />;

  const sections = getSettingsSections(lang, isDesktop);

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-[#f4ecd8] border-4 border-black w-full md:w-[92vw] max-w-6xl h-[85vh] flex flex-col shadow-[8px_8px_0px_#000] relative overflow-hidden text-[#1a1a1a]">
        <SettingsHeader lang={lang} onSetLang={(l) => sequencer?.setLang?.(l)} onClose={handleClose} />
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar min-h-0 flex flex-col justify-start">
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 py-20">
              <span className="font-cactus font-bold text-lg tracking-wider animate-pulse">{lang === 'pt' ? 'Carregando A Oficina...' : "Chargement de l'Atelier..."}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-32">
              {sections.map((sec) => {
                const isOpen = activeSection === sec.id;
                return (
                  <div key={sec.id} className="border-t-2 border-b-4 border-l-3 border-r-2 border-black rounded-[4px_10px_6px_12px] bg-white shadow-[4px_4px_0px_#000] flex flex-col overflow-hidden">
                    <button onClick={() => setActiveSection(isOpen ? null : sec.id)} className="w-full text-left px-4 py-2.5 font-cactus font-bold text-xs md:text-sm uppercase flex justify-between items-center transition-colors bg-white hover:bg-black hover:text-white cursor-pointer select-none border-none outline-none">
                      <span className="flex items-center gap-2.5">
                        <OficinaSectionIcon sectionId={sec.id} className="w-4 h-4 shrink-0 text-current" />
                        <span>{sec.title}</span>
                      </span>
                      <span className="font-black text-lg transition-transform duration-200">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div className="p-5 border-t-2 border-black bg-[#fbf8f0] text-xs leading-relaxed font-sans text-left">
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
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
