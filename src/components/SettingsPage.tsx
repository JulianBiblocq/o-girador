import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSequencerSettingsStore, OficinaSectionId } from '../stores/useSequencerSettingsStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAuth } from '../contexts/AuthContext';
import { usePortalRoot, useWindow } from '../contexts/WindowContext';
import { isEditableTarget } from '../utils/crossRealmDom';
import { i18n } from '../data';
import { CloudRhythmSignal, Language } from '../types';
import { SettingsHeader } from './settings/SettingsHeader';
import { OficinaSidebarNav } from './settings/OficinaSidebarNav';
import { getOficinaDomains } from './settings/settingsSections';
import { OficinaSectionIcon } from './oficina/OficinaSectionIcons';
import { BaqueLutherieBench } from './oficina/BaqueLutherieBench';
import { SettingsGrooveTab } from './settings/SettingsGrooveTab';
import { SettingsKitTab } from './settings/SettingsKitTab';
import { SettingsTemplatesTab } from './settings/SettingsTemplatesTab';
import { SettingsDesktopLayoutsTab } from './settings/SettingsDesktopLayoutsTab';
import { MidiManagerPanel } from './MidiManagerPanel';
import { SettingsSignalsTab } from './settings/SettingsSignalsTab';
import { SettingsPrensaTab } from './settings/SettingsPrensaTab';
import { PaperWorkshopContent } from './paper/PaperWorkshopContent';
import { SettingsEcoTab } from './settings/SettingsEcoTab';
import { SettingsAudioTab } from './settings/SettingsAudioTab';
import { SettingsHelpTab } from './settings/SettingsHelpTab';
import { openAoVivoLabWithActiveTrack } from './AoVivo/aoVivoStrokeTester';

interface SettingsPageProps {
  mestreSignals?: CloudRhythmSignal[];
  refreshMestreSignals?: () => void | Promise<void>;
  embedded?: boolean;
}

const DEFAULT_METADATA = { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] };

export const SettingsPage: React.FC<SettingsPageProps> = ({ mestreSignals = [], refreshMestreSignals, embedded = false }) => {
  const isSettingsOpen = useSequencerSettingsStore((s) => s.isSettingsOpen);
  const setIsSettingsOpen = useSequencerSettingsStore((s) => s.setIsSettingsOpen);
  const activeSection = useSequencerSettingsStore((s) => s.activeSection);
  const setActiveSection = useSequencerSettingsStore((s) => s.setActiveSection);
  const { currentUser, userProfile } = useAuth();
  const sequencer = useSequencer();
  const hostWin = useWindow();
  const portalRoot = usePortalRoot();

  const lang: Language = sequencer?.lang === 'pt' ? 'pt' : 'fr';
  const t = (key: string) => (i18n[lang] as Record<string, string>)?.[key] || key;
  const isDesktop = embedded || (typeof window !== 'undefined' && (
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.screen.width >= 768
  ));

  const userUid = currentUser?.uid || userProfile?.uid || '';
  const userEmail = (currentUser?.email || (userProfile as { email?: string })?.email || '').toLowerCase();
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const canSeeAoVivoLab = isLocalhost || userUid === 'iA0SweEHyOPzAPGIDVZdeKAV2mk1' || userEmail === 'julian.biblocq@gmail.com';
  const handleClose = () => { if (!embedded) setIsSettingsOpen(false); };

  useEffect(() => {
    if (embedded || !isSettingsOpen) return;
    const hostDoc = hostWin?.document || document;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (hostDoc.querySelector('.z-\\[100030\\], .z-\\[100035\\], .z-\\[100040\\], .z-\\[100045\\], .z-\\[100050\\]')) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      setIsSettingsOpen(false);
    };
    hostWin.addEventListener('keydown', handleKeyDown);
    return () => hostWin.removeEventListener('keydown', handleKeyDown);
  }, [embedded, isSettingsOpen, setIsSettingsOpen, hostWin]);

  const domains = useMemo(() => getOficinaDomains(lang, isDesktop, canSeeAoVivoLab), [lang, isDesktop, canSeeAoVivoLab]);
  if (!embedded && !isSettingsOpen) return null;

  const resolvedSection: OficinaSectionId =
    (!isDesktop && activeSection === 'desktopLayouts') || activeSection === 'aovivo-lab' ? 'lutherie' : activeSection;
  const activeDomain = domains.find((d) => d.items.some((i) => i.id === resolvedSection)) ?? domains[0];
  const activeItem = activeDomain?.items.find((i) => i.id === resolvedSection);

  const handleSelectSection = (secId: OficinaSectionId) => {
    if (secId === 'aovivo-lab') {
      openAoVivoLabWithActiveTrack();
      setIsSettingsOpen(false);
      return;
    }
    setActiveSection(secId);
  };

  const oficinaPanel = (
    <div
      data-testid={embedded ? 'oficina-embedded' : 'oficina-modal'}
      className={embedded ? 'w-full h-full bg-[var(--cordel-bg)] text-[var(--cordel-text)] flex flex-col overflow-hidden' : 'w-full md:w-[94vw] max-w-6xl h-[90vh] md:h-[86vh] border-[3px] border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] flex flex-col overflow-hidden'}
    >
      <SettingsHeader lang={lang} onSetLang={(l) => sequencer?.setLang?.(l)} onClose={handleClose} hideCloseButton={embedded} />
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <OficinaSidebarNav domains={domains} activeSection={resolvedSection} onSelectSection={handleSelectSection} />
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[var(--cordel-bg)]">
          <div className="px-4 md:px-6 py-2.5 border-b border-[var(--cordel-border)]/50 bg-[var(--cordel-surface-muted)] flex items-center justify-between gap-2 shrink-0 select-none">
            <div className="flex items-center gap-2 min-w-0">
              <OficinaSectionIcon sectionId={resolvedSection} className="w-4 h-4 shrink-0 text-[var(--cordel-accent-readable)]" />
              <span className="font-cactus font-black text-xs md:text-sm uppercase tracking-wider truncate">{activeItem?.title}</span>
            </div>
            <span className="text-[9px] font-cactus font-bold uppercase tracking-widest text-[var(--cordel-text-muted)] shrink-0">{activeDomain?.label}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 custom-scrollbar text-xs leading-relaxed font-sans text-left">
            {resolvedSection === 'lutherie' && <BaqueLutherieBench lang={lang} />}
            {resolvedSection === 'groove' && <SettingsGrooveTab lang={lang} />}
            {resolvedSection === 'kit' && <SettingsKitTab lang={lang} isLeftHanded={Boolean(sequencer?.isLeftHanded)} />}
            {resolvedSection === 'prensa' && <SettingsPrensaTab lang={lang} metadata={sequencer?.metadata || DEFAULT_METADATA} letras={sequencer?.letras || ''} onMetaChange={(f, v) => sequencer?.setMetadata?.({ ...sequencer.metadata, [f]: v })} onLetrasChange={(v) => sequencer?.setLetras?.(v)} measureBpms={sequencer?.measureBpms} />}
            {resolvedSection === 'papier' && <PaperWorkshopContent embedded onClose={handleClose} />}
            {resolvedSection === 'sinais' && <SettingsSignalsTab lang={lang} mestreSignals={mestreSignals} refreshMestreSignals={refreshMestreSignals} />}
            {resolvedSection === 'gabarits' && <SettingsTemplatesTab lang={lang} confirmAsync={sequencer?.confirmAsync} onClose={handleClose} />}
            {resolvedSection === 'audio' && <SettingsAudioTab lang={lang} alertAsync={sequencer?.alertAsync} />}
            {resolvedSection === 'midi' && <MidiManagerPanel />}
            {resolvedSection === 'desktopLayouts' && <SettingsDesktopLayoutsTab lang={lang} />}
            {resolvedSection === 'performance' && <SettingsEcoTab lang={lang} confirmAsync={sequencer?.confirmAsync} alertAsync={sequencer?.alertAsync} />}
            {resolvedSection === 'ajuda' && <SettingsHelpTab lang={lang} t={t} isLeftHanded={Boolean(sequencer?.isLeftHanded)} />}
          </div>
        </main>
      </div>
    </div>
  );

  if (embedded) return oficinaPanel;

  const modalContent = (
    <div data-testid="oficina-backdrop" className="fixed inset-0 z-[100010] bg-[var(--cordel-ink-dark)]/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      {oficinaPanel}
    </div>
  );

  return portalRoot ? createPortal(modalContent, portalRoot) : modalContent;
};
