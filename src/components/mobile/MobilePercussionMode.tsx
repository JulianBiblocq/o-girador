/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { MobileTopHeader } from './MobileTopHeader';
import { MobileTransportHero } from './MobileTransportHero';
import { MobileSongPickerModal } from './MobileSongPickerModal';
import { MobileMenuSheet } from './MobileMenuSheet';
import { Drum } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: (opts?: any) => void;
  onStop: () => void;
  masterEQ: { low: number; mid: number; high: number };
  setMasterEQ: (eq: { low: number; mid: number; high: number }) => void;
  cloudPresets: any[];
  localPresets: any[];
  onPresetChange: (val: string) => void;
  activePreset: string;
  onToggleStudio: () => void;
  onOpenPaperWorkshop: (tab?: 'sheets' | 'scanner' | 'reserve') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenLyricsVideo?: () => void;
}

const PERC_FAMILIES = [
  { id: 'alfaias', label: 'ALFAIAS', icon: '🥁', instIds: ['marcante', 'meiao', 'repique'] },
  { id: 'caixas', label: 'CAIXAS', icon: '🥁', instIds: ['caixa', 'tarol'] },
  { id: 'gongue', label: 'GONGUÊ', icon: '🔔', instIds: ['gongue'] },
  { id: 'agbe', label: 'AGBÊ', icon: '🪘', instIds: ['agbe', 'mineiro'] },
];

export const MobilePercussionMode: React.FC<Props> = (props) => {
  const { lang, setLang, bpm, setBpm, metadata } = useSequencer();
  const [selectedFamily, setSelectedFamily] = useState<string>('alfaias');
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tracks = useSequencerStore((s) => s.tracks);
  const setTracks = useSequencerStore((s) => s.setTracks);
  const loopMode = useSequencerStore((s) => s.loopMode ?? 'infinite');
  const setLoopMode = useSequencerStore((s) => s.setLoopMode);
  const isLoopExitRequested = useSequencerStore((s) => s.isLoopExitRequested);
  const requestLoopExit = useSequencerStore((s) => s.requestLoopExit);

  const handleSoloFamily = (famId: string) => {
    setSelectedFamily(famId);
    const fam = PERC_FAMILIES.find((f) => f.id === famId);
    if (!fam) return;
    setTracks((prev) =>
      prev.map((t) => {
        const iId = instrumentsConfig[t.instrumentIdx]?.id;
        const belongs = iId && fam.instIds.includes(iId);
        return { ...t, isSolo: Boolean(belongs) };
      })
    );
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-[#121212] text-[var(--cordel-text)] overflow-hidden select-none font-sans relative">
      <MobileTopHeader
        songTitle={metadata?.toada || props.activePreset}
        onOpenSongPicker={() => setIsSongPickerOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        lang={lang}
      />

      <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-2 border-b border-[var(--cordel-border)] pb-2">
          <Drum className="text-[#b94a2c]" size={18} />
          <span className="font-cactus font-bold text-sm uppercase tracking-wider text-[var(--cordel-text)]">
            {lang === 'pt' ? 'Treino Percussão Focado' : 'Entraînement Percussion'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PERC_FAMILIES.map((fam) => {
            const isSelected = selectedFamily === fam.id;
            return (
              <button
                key={fam.id}
                onClick={() => handleSoloFamily(fam.id)}
                className={`p-3 cordel-border flex flex-col items-center justify-center gap-1 font-cactus font-bold uppercase transition-all shadow-[2px_2px_0_var(--cordel-border)] ${
                  isSelected ? 'bg-[#b94a2c] text-[#f4ecd8]' : 'bg-[#1a1a1a] text-[var(--cordel-text)] hover:border-[#b94a2c]'
                }`}
              >
                <span className="text-xl leading-none">{fam.icon}</span>
                <span className="text-xs tracking-wider">{fam.label}</span>
                <span className="text-[9px] font-mono opacity-70">
                  {isSelected ? (lang === 'pt' ? 'SOLO ATIVO' : 'SOLO ACTIF') : 'ISOLER'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <MobileTransportHero
        isPlaying={props.isPlaying}
        isLoading={props.isLoading}
        onTogglePlay={props.onTogglePlay}
        onStop={props.onStop}
        bpm={bpm}
        onChangeBpm={(delta) => setBpm(Math.max(40, Math.min(240, bpm + delta)))}
        onResetBpm={() => setBpm(useSequencerStore.getState().measureBpms?.[0] || 90)}
        loopMode={loopMode}
        onChangeLoopMode={setLoopMode}
        isLoopExitRequested={isLoopExitRequested}
        onRequestLoopExit={requestLoopExit}
      />

      <MobileSongPickerModal
        isOpen={isSongPickerOpen}
        onClose={() => setIsSongPickerOpen(false)}
        localPresets={props.localPresets}
        cloudPresets={props.cloudPresets}
        activePreset={props.activePreset}
        onPresetChange={props.onPresetChange}
        lang={lang}
      />

      <MobileMenuSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        masterEQ={props.masterEQ}
        setMasterEQ={props.setMasterEQ}
        onOpenPaperWorkshop={props.onOpenPaperWorkshop}
        onOpenPhotoBooth={() => {}}
        onOpenLyricsVideo={props.onOpenLyricsVideo || (() => {})}
        lang={lang}
        onToggleLang={() => setLang(lang === 'pt' ? 'fr' : 'pt')}
        isDarkMode={props.isDarkMode || true}
        onToggleDarkMode={props.onToggleDarkMode || (() => {})}
        onToggleStudio={props.onToggleStudio}
      />
    </div>
  );
};
