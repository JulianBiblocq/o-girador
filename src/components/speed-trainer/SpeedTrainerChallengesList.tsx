import React from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { TrainingProgram } from '../../types/trainings';
import { SpeedTrainerChallengeCard } from './SpeedTrainerChallengeCard';

interface SpeedTrainerChallengesListProps {
  lang: string;
  t: (key: string) => string;
  existingTrainings: TrainingProgram[];
  isLoadingTrainings: boolean;
  editingTrainingId: string | null;
  onCancelEdit: () => void;
  onStartEdit: (tr: TrainingProgram) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  isDeletingId: string | null;
}

export const SpeedTrainerChallengesList: React.FC<SpeedTrainerChallengesListProps> = ({
  lang,
  t,
  existingTrainings,
  isLoadingTrainings,
  editingTrainingId,
  onCancelEdit,
  onStartEdit,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
  isDeletingId,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="font-cactus font-bold text-xs uppercase tracking-wider text-[#666] flex items-center gap-1.5">
          • {t('speedTrainerExistingChallenges')}
          {existingTrainings.length > 0 && (
            <span className="px-1.5 py-0.2 bg-[#1a1a1a] text-[#f4ecd8] rounded-xs text-[10px]">
              {existingTrainings.length}
            </span>
          )}
        </label>
        {editingTrainingId && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[11px] font-bold text-[#8b2a1a] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            {t('speedTrainerNewChallenge')}
          </button>
        )}
      </div>

      {isLoadingTrainings ? (
        <div className="p-4 bg-[#fcf9f2] border-2 border-[#1a1a1a] rounded-xs flex items-center justify-center gap-2 text-xs text-[#666] shadow-[2px_2px_0px_#1a1a1a]">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>{lang === 'fr' ? 'Chargement des défis...' : 'Carregando desafios...'}</span>
        </div>
      ) : existingTrainings.length === 0 ? (
        <div className="p-3 bg-[#fcf9f2] border-2 border-[#1a1a1a]/40 border-dashed rounded-xs text-center text-xs text-[#777] italic">
          {t('speedTrainerNoChallenges')}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-0.5">
          {existingTrainings.map((tr) => (
            <SpeedTrainerChallengeCard
              key={tr.id}
              lang={lang}
              t={t}
              tr={tr}
              isCurrentEditing={editingTrainingId === tr.id}
              isDeleting={isDeletingId === tr.id}
              confirmDeleteId={confirmDeleteId}
              setConfirmDeleteId={setConfirmDeleteId}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
