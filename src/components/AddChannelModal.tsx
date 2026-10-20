/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Music, FolderOpen, Link, X } from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencer } from '../contexts/SequencerContext';
import { AddChannelAudioTab } from './add-channel/AddChannelAudioTab';
import { AddChannelSectionTab } from './add-channel/AddChannelSectionTab';
import { AddChannelLinkTab } from './add-channel/AddChannelLinkTab';
import { addChannelTranslations } from './add-channel/addChannelTranslations';

interface AddChannelModalProps {
  onClose: () => void;
}

export const AddChannelModal: React.FC<AddChannelModalProps> = ({ onClose }) => {
  const sequencer = useSequencer();
  const lang = useSequencerStore((state) => state.lang);
  const tracks = useSequencerStore((state) => state.tracks);
  const currentMeasure = useSequencerStore((state) => state.currentMeasure);
  const handleCreateCustomBus = useSequencerStore((state) => state.handleCreateCustomBus);
  const handleCreateCustomLinkGroup = useSequencerStore((state) => state.handleCreateCustomLinkGroup);

  const t = (key: string) => (addChannelTranslations[lang] || addChannelTranslations.fr)[key] || key;
  const [activeTab, setActiveTab] = useState<'audio' | 'section' | 'link'>('audio');

  const individualTracks = useMemo(() => tracks.filter((tr) => !tr.isBusFolder && !tr.isLinkFolder), [tracks]);
  const selectableTracks = useMemo(() => tracks.filter((tr) => !tr.isBusFolder || tr.isLinkFolder), [tracks]);

  return (
    <div className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border)] rounded-sm p-6 w-full max-w-2xl shadow-[8px_8px_0px_var(--cordel-border)] max-h-[90vh] overflow-y-auto flex flex-col relative transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-[var(--cordel-text)] hover:text-[var(--cordel-wood)] transition-colors hover:scale-110 duration-200 cursor-pointer"
        >
          <X size={24} />
        </button>

        <h2 className="font-cactus text-3xl font-bold uppercase tracking-wider mb-6 text-center select-none border-b-2 border-[var(--cordel-border)] pb-2 pr-8">
          {t('title')}
        </h2>

        <div className="flex gap-2 border-b border-[var(--cordel-border)]/20 pb-4 mb-6 overflow-x-auto select-none">
          {(['audio', 'section', 'link'] as const).map((tab) => {
            const Icon = tab === 'audio' ? Music : tab === 'section' ? FolderOpen : Link;
            const label = tab === 'audio' ? t('tabAudio') : tab === 'section' ? t('tabSection') : t('tabLink');
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase border-2 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] shadow-none translate-y-[2px]'
                    : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)] shadow-[3px_3px_0px_var(--cordel-border)]'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-grow flex flex-col min-h-0">
          {activeTab === 'audio' && (
            <AddChannelAudioTab
              searchPlaceholder={t('searchPlaceholder')}
              onSelectInstrument={(idx) => {
                sequencer.handleAddTrackInstrument(idx, currentMeasure);
                onClose();
              }}
            />
          )}

          {activeTab === 'section' && (
            <AddChannelSectionTab
              selectableTracks={selectableTracks}
              tracks={tracks}
              onCreateBus={(ids, name) => {
                handleCreateCustomBus(ids, name);
                onClose();
              }}
              lang={lang}
              t={t}
            />
          )}

          {activeTab === 'link' && (
            <AddChannelLinkTab
              individualTracks={individualTracks}
              tracks={tracks}
              onCreateLink={(mId, sIds, name) => {
                handleCreateCustomLinkGroup(mId, sIds, name);
                onClose();
              }}
              lang={lang}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
};
