/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Language, PresetMetadata, CloudRhythmSignal } from '../../types';
import { UserProfile } from '../../contexts/AuthContext';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const PresetManagerSection = lazyWithRetry(
  () => import('./PresetManagerSection').then(m => ({ default: m.PresetManagerSection })),
  'PresetManagerSection'
);
const CloudLibraryTab = lazyWithRetry(
  () => import('./CloudLibraryTab').then(m => ({ default: m.CloudLibraryTab })),
  'CloudLibraryTab'
);

interface RightSidebarSignalsTabProps {
  metadata?: PresetMetadata;
  onMetadataChange?: (newMeta: PresetMetadata) => void;
  lang: Language;
  userProfile: UserProfile | null;
  mestreSignals?: CloudRhythmSignal[];
  refreshMestreSignals?: () => void;
  hideGlobalSignals?: boolean;
  onToggleHideGlobalSignals?: () => void;
}

export const RightSidebarSignalsTab: React.FC<RightSidebarSignalsTabProps> = ({
  metadata,
  onMetadataChange,
  lang,
  userProfile,
  mestreSignals = [],
  refreshMestreSignals,
  hideGlobalSignals,
  onToggleHideGlobalSignals,
}) => {
  return (
    <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0 flex flex-col gap-2">
      <div className="xilo-feedback-container flex flex-col gap-2">
        <span className="text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
          {lang === 'fr' ? 'Signes du rythme' : 'Sinais do ritmo'}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] text-[var(--cordel-text)] opacity-60 leading-tight">
            {lang === 'fr'
              ? 'Ces images s\'affichent en transparence dans la Roda et peuvent être assignées à des mesures dans la Timeline.'
              : 'Estas imagens aparecem em transparência na Roda e podem ser atribuídas a compassos na Timeline.'}
          </span>
          {onToggleHideGlobalSignals && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none mt-1">
              <input
                type="checkbox"
                checked={hideGlobalSignals || false}
                onChange={onToggleHideGlobalSignals}
                className="w-3 h-3 cursor-pointer"
              />
              <span className="text-[10px] text-[var(--cordel-text)] font-bold">
                {lang === 'fr' ? 'Masquer les signaux officiels globaux' : 'Ocultar sinais oficiais globais'}
              </span>
            </label>
          )}
        </div>
      </div>

      <React.Suspense fallback={null}>
        {metadata && onMetadataChange && (
          <PresetManagerSection
            metadata={metadata}
            onMetadataChange={onMetadataChange}
            lang={lang}
            userProfile={userProfile}
          />
        )}
      </React.Suspense>

      <React.Suspense fallback={null}>
        <CloudLibraryTab
          mestreSignals={mestreSignals}
          refreshMestreSignals={refreshMestreSignals}
          userProfile={userProfile}
          lang={lang}
        />
      </React.Suspense>
    </div>
  );
};
