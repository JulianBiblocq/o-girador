
import React from 'react';
import { Language, PresetMetadata, CloudRhythmSignal } from '../types';
import { i18n } from '../data';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencer } from '../contexts/SequencerContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { LyricsAuthorshipModal } from './LyricsAuthorshipModal';
import { DescriptionModal } from './DescriptionModal';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { useRightSidebarKaraoke } from './right-sidebar/useRightSidebarKaraoke';
import { RightSidebarDropdown } from './right-sidebar/RightSidebarDropdown';
import { RightSidebarMetadataTab } from './right-sidebar/RightSidebarMetadataTab';
import { RightSidebarToadaTab } from './right-sidebar/RightSidebarToadaTab';
import { RightSidebarSignalsTab } from './right-sidebar/RightSidebarSignalsTab';

import { X } from 'lucide-react';

const ShortcutsGuide = lazyWithRetry(() => import('./right-sidebar/ShortcutsGuide').then(m => ({ default: m.ShortcutsGuide })), 'ShortcutsGuide');
const FeedbackSection = lazyWithRetry(() => import('./right-sidebar/FeedbackSection').then(m => ({ default: m.FeedbackSection })), 'FeedbackSection');

interface RightSidebarProps {
  activePanel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null;
  onTogglePanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais', force?: boolean) => void;
  isMobile: boolean; mestreSignals?: CloudRhythmSignal[]; refreshMestreSignals?: () => void;
  hideGlobalSignals?: boolean; onToggleHideGlobalSignals?: () => void;
  visible?: boolean; isDrawer?: boolean; onCloseDrawer?: () => void;
}

const EMPTY_ARRAY: any[] = [];

const RightSidebarComponent: React.FC<RightSidebarProps> = ({
  activePanel, onTogglePanel, isMobile, mestreSignals = [],
  refreshMestreSignals, hideGlobalSignals, onToggleHideGlobalSignals,
  visible = true, isDrawer = false, onCloseDrawer,
}) => {
  const sequencer = useSequencer();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const karaokeContainerRef = React.useRef<HTMLDivElement>(null);
  const tracks = useSequencerStore(state => visible ? state.tracks : EMPTY_ARRAY);
  const { userProfile } = useAuth();
  const [showAuthorshipModal, setShowAuthorshipModal] = React.useState(false);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = React.useState(false);
  const [subTab, setSubTab] = React.useState<'toada' | 'info' | 'legendes' | 'sinais' | 'feedback'>('info');
  useRightSidebarKaraoke(visible, subTab, karaokeContainerRef);
  const audio = useAudio();
  const { lang, letras, setLetras: onLetrasChange, metadata, handleExtractLyrics: onExtractLyrics } = sequencer;
  const { isPlaying = false } = audio;

  const onMetadataChange = (newMeta: PresetMetadata) => {
    sequencer.setMetadata(newMeta);
    if (newMeta.rhythmSignals !== sequencer.metadata?.rhythmSignals) {
      const validIds = new Set((newMeta.rhythmSignals || []).map(s => s.id));
      sequencer.setMeasureSignals((prev: (string | null)[]) => prev.map((id: string | null) => (id && validIds.has(id)) ? id : null));
    }
  };

  const getCurrentDescription = React.useCallback((meta?: PresetMetadata, currentLang: Language = lang) => {
    if (!meta) return '';
    return currentLang === 'pt' ? (meta.descriptionPt || meta.description || meta.descriptionFr || '') : (meta.descriptionFr || meta.descriptionPt || meta.description || '');
  }, [lang]);

  const handleSaveDescriptionFromModal = React.useCallback(({ descriptionPt, descriptionFr }: { descriptionPt: string; descriptionFr: string }) => {
    if (!metadata) return;
    const updatedMeta: PresetMetadata = { ...metadata, descriptionPt, descriptionFr, description: descriptionPt || descriptionFr || metadata.description || '' };
    onMetadataChange(updatedMeta);
    if (textareaRef.current) textareaRef.current.value = getCurrentDescription(updatedMeta, lang);
  }, [metadata, getCurrentDescription, lang]);

  const t = (key: string) => ((i18n[lang] as any)[key] || key);

  React.useEffect(() => {
    if (activePanel) {
      const map: Record<string, typeof subTab> = { legend: 'legendes', letras: 'toada', info: 'info', sinais: 'sinais', feedback: 'feedback' };
      if (map[activePanel]) setSubTab(map[activePanel]);
    }
  }, [activePanel]);

  if ((isMobile || isDrawer) && !visible) return null;

  const drawerClass = isDrawer
    ? "absolute right-0 top-0 bottom-0 z-40 w-[320px] max-w-[85vw] shadow-2xl"
    : "w-[320px] min-w-[320px] shrink-0 relative z-10";

  return (
    <>
      <div id="right-sidebar-panel" style={{ display: visible ? 'flex' : 'none' }} className={`${drawerClass} bg-[var(--cordel-bg)] cordel-bg border-l-[3px] border-[var(--cordel-border)] flex flex-col h-full text-[var(--cordel-text)]`}>
        <div className="absolute inset-0 pointer-events-none z-0 wallpaper-surface-bg" style={{ transform: 'translateZ(0)' }} />
        {isDrawer && onCloseDrawer && (
          <button type="button" onClick={onCloseDrawer} aria-label="Fermer" className="absolute top-2.5 right-2.5 z-20 w-6 h-6 border border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[#b94a2c] hover:text-[#f4ecd8] flex items-center justify-center cursor-pointer shadow-[1px_1px_0_#000]">
            <X size={13} />
          </button>
        )}
        <div className="flex flex-col p-5 h-full overflow-hidden relative z-[1]">
          <RightSidebarDropdown subTab={subTab} setSubTab={setSubTab} onTogglePanel={onTogglePanel} lang={lang} t={t} isMobile={isMobile} />

          {subTab === 'legendes' && (
            <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
              <React.Suspense fallback={null}><div className="xilo-feedback-container flex flex-col gap-2"><ShortcutsGuide lang={lang} t={t} /></div></React.Suspense>
            </div>
          )}

          {subTab === 'toada' && (
            <RightSidebarToadaTab lang={lang} t={t} letras={letras} onLetrasChange={onLetrasChange} onExtractLyrics={onExtractLyrics} onOpenAuthorshipModal={() => setShowAuthorshipModal(true)} tracks={tracks} karaokeContainerRef={karaokeContainerRef} />
          )}

          {subTab === 'info' && (
            metadata ? <RightSidebarMetadataTab metadata={metadata} onMetadataChange={onMetadataChange} lang={lang} t={t} textareaRef={textareaRef} getCurrentDescription={getCurrentDescription} onOpenDescriptionModal={() => setIsDescriptionModalOpen(true)} /> : <div className="text-[var(--cordel-text)] font-sans font-bold text-xs text-center mt-10 italic opacity-70">{lang === 'fr' ? 'Aucune métadonnée disponible pour ce rythme.' : 'Nenhuma informação disponível para este ritmo.'}</div>
          )}

          {subTab === 'sinais' && (
            <RightSidebarSignalsTab metadata={metadata} onMetadataChange={onMetadataChange} lang={lang} userProfile={userProfile} mestreSignals={mestreSignals} refreshMestreSignals={refreshMestreSignals} hideGlobalSignals={hideGlobalSignals} onToggleHideGlobalSignals={onToggleHideGlobalSignals} />
          )}

          {subTab === 'feedback' && <React.Suspense fallback={null}><FeedbackSection /></React.Suspense>}

          {/* Signature Créateur & Artiste */}
          <div className="pt-2 mt-auto border-t border-[var(--cordel-border)]/20 text-[9px] font-bold tracking-widest text-center opacity-60 select-none flex justify-center gap-1.5 leading-tight shrink-0">
            <span>{lang === 'pt' ? 'Criado por Julian Biblocq' : 'Créé par Julian Biblocq'}</span>
            <span className="opacity-40">|</span>
            <span>{lang === 'pt' ? 'Arte: Toni Braga' : 'Art: Toni Braga'}</span>
          </div>
        </div>
      </div>
      {metadata && (
        <DescriptionModal isOpen={isDescriptionModalOpen} onClose={() => setIsDescriptionModalOpen(false)} metadata={metadata} onSaveDescription={handleSaveDescriptionFromModal} lang={lang} isPlaying={isPlaying} />
      )}
      {showAuthorshipModal && <LyricsAuthorshipModal onClose={() => setShowAuthorshipModal(false)} />}
    </>
  );
};

export const RightSidebar = React.memo(RightSidebarComponent);
