import React from 'react';
import { Square, X, Save, Loader2 } from 'lucide-react';
import { XiloLightning } from '../XiloIcons';
import { CordelTarget } from '../ui/CordelTarget';
import { SpeedTrainerTab } from './SpeedTrainerHeader';

interface SpeedTrainerFooterProps {
  activeTab: SpeedTrainerTab;
  t: (key: string) => string;
  selectedTrackId: number | null;
  onStartTrainingDirect: () => void;
  onQuitOrCancelTraining: () => void;
  tocarJuntoActive: boolean;
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
  selectedTrackId,
  onStartTrainingDirect,
  onQuitOrCancelTraining,
  tocarJuntoActive,
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
      {activeTab === 'tocarJunto' ? (
        <>
          <button
            type="button"
            disabled={selectedTrackId === null}
            onClick={onStartTrainingDirect}
            className="flex-1 py-2.5 px-4 bg-[#c25e38] hover:bg-[#a84c2a] disabled:opacity-40 text-white font-cactus font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] cursor-pointer"
          >
            <CordelTarget size={16} className="text-white shrink-0" />
            <span>{t('startTrainingButton')}</span>
          </button>
          <button
            type="button"
            onClick={onQuitOrCancelTraining}
            className="py-2.5 px-4 bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] hover:bg-[#e8dcbe] font-cactus font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {tocarJuntoActive ? (
              <>
                <X size={14} className="shrink-0" />
                <span>{t('quitTrainingButton')}</span>
              </>
            ) : (
              <span>{t('cancel')}</span>
            )}
          </button>
        </>
      ) : activeTab === 'speedTrainer' ? (
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
            {activeTrainingSession ? `⚡ Lancer le Palier ${activeTrainingSession.stageIndex} (${startBpm} ➔ ${targetBpm} BPM)` : t('speedTrainerLaunch')}
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
