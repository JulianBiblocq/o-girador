/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Square, Save, Loader2 } from 'lucide-react';
import { XiloLightning } from '../XiloIcons';
import { SpeedTrainerTab } from './SpeedTrainerHeader';

interface SpeedTrainerFooterProps {
  activeTab: SpeedTrainerTab;
  t: (key: string) => string;
  selectedTrackId?: number | null;
  onStartTrainingDirect?: () => void;
  onQuitOrCancelTraining?: () => void;
  tocarJuntoActive?: boolean;
  isActive: boolean;
  onStopAndRestore: () => void;
  onLaunch: () => void;
  activeTrainingSession: any;
  startBpm: number;
  targetBpm: number;
  isSaving: boolean;
  onSaveTraining: () => void;
  editingTrainingId: string | null;
}

export const SpeedTrainerFooter: React.FC<SpeedTrainerFooterProps> = ({
  activeTab,
  t,
  isActive,
  onStopAndRestore,
  onLaunch,
  activeTrainingSession,
  startBpm,
  targetBpm,
  isSaving,
  onSaveTraining,
  editingTrainingId,
}) => {
  return (
    <div className="p-3 sm:p-4 bg-[#ebe2cb] border-t-2 border-[#1a1a1a] flex items-center justify-between gap-2 shrink-0">
      {activeTab === 'speedTrainer' ? (
        isActive ? (
          <button
            type="button"
            onClick={onStopAndRestore}
            className="w-full py-2.5 px-4 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] hover:bg-[#722215] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            {t('speedTrainerStop')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onLaunch}
            className="w-full py-2.5 px-4 bg-amber-600 text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] hover:bg-amber-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <XiloLightning size={16} className="fill-current" />
            {activeTrainingSession
              ? `Lancer le Palier ${activeTrainingSession.stageIndex} (${startBpm} ➔ ${targetBpm} BPM)`
              : t('speedTrainerLaunch')}
          </button>
        )
      ) : (
        <button
          type="button"
          disabled={isSaving}
          onClick={onSaveTraining}
          className={`w-full py-2.5 px-4 text-[#f4ecd8] border-2 border-[#1a1a1a] font-cactus font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0px_#1a1a1a] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
            editingTrainingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {editingTrainingId ? t('speedTrainerUpdatingChallenge') : t('speedTrainerSavingChallenge')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {editingTrainingId ? t('speedTrainerUpdateChallenge') : t('speedTrainerSaveChallenge')}
            </>
          )}
        </button>
      )}
    </div>
  );
};
