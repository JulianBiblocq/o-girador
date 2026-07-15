/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { AddChannelModal } from './AddChannelModal';

interface MixerAddChannelProps {
  isActive?: boolean;
}

export const MixerAddChannel: React.FC<MixerAddChannelProps> = ({ isActive = true }) => {
  const lang = useSequencerStore(state => state.lang);
  const [modalOpen, setModalOpen] = useState(false);

  if (!isActive) return null;

  const modalRoot = document.getElementById('modal-root') || document.body;

  return (
    <div
      className="flex flex-col bg-[var(--cordel-bg)]/40 w-[42px] h-full justify-between shrink-0 text-[var(--cordel-text)] overflow-visible relative transition-all duration-300 border-2 border-dashed border-[var(--cordel-border)]/40 hover:border-[var(--cordel-border)]/80 hover:bg-[var(--cordel-bg)]/60"
      style={{
        paddingTop: '3px',
        paddingBottom: '15px',
        marginRight: '16px',
        borderRadius: '3px',
      }}
    >
      {/* Top Section with + Button */}
      <div className="relative p-1 flex flex-col items-center border-b border-[var(--cordel-border)]/20 h-[76px] shrink-0 justify-center">
        <button
          onClick={() => setModalOpen(true)}
          className="w-7 h-7 bg-[var(--cordel-bg)] text-[var(--cordel-text)] cordel-border-sm cordel-button font-bold flex items-center justify-center hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer"
          title={lang === 'fr' ? 'Ajouter un canal' : 'Adicionar canal'}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Vertical Label Strip */}
      <div
        className="flex-grow flex items-center justify-center select-none"
        onClick={() => setModalOpen(true)}
      >
        <span
          className="font-cactus font-bold text-[10px] tracking-widest text-[var(--cordel-text)]/40 hover:text-[var(--cordel-text)]/80 transition-colors uppercase cursor-pointer"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {lang === 'fr' ? 'Nouveau' : 'Novo'}
        </span>
      </div>

      {/* Add Channel Modal Portal */}
      {modalOpen && createPortal(
        <AddChannelModal onClose={() => setModalOpen(false)} />,
        modalRoot
      )}
    </div>
  );
};
