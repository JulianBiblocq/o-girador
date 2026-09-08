/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GlobalSwing, Language } from '../types';
import { BalancoEditorPanel } from './balanco/BalancoEditorPanel';

interface GlobalSwingModalProps {
  globalSwing: GlobalSwing;
  setGlobalSwing: (gs: GlobalSwing) => void;
  onClose: () => void;
  lang: Language;
}

export const GlobalSwingModal: React.FC<GlobalSwingModalProps> = ({
  globalSwing,
  setGlobalSwing,
  onClose,
  lang
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#f4ecd8] border-2 border-[#1a1a1a] p-6 max-w-lg w-full rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-2">
          <h3 className="font-cactus text-3xl font-bold text-[#1a1a1a]">
            {lang === 'fr' ? 'Balanço Général' : 'Balanço Geral'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#1a1a1a] font-bold text-xl hover:text-[#8b2a1a] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <BalancoEditorPanel
          globalSwing={globalSwing}
          setGlobalSwing={setGlobalSwing}
          lang={lang}
        />
      </div>
    </div>
  );
};
