import React from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { TrainingProgram } from '../../types/trainings';

interface SpeedTrainerChallengeCardProps {
  lang: string;
  t: (key: string) => string;
  tr: TrainingProgram;
  isCurrentEditing: boolean;
  isDeleting: boolean;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onStartEdit: (tr: TrainingProgram) => void;
  onDelete: (id: string) => void;
}

export const SpeedTrainerChallengeCard: React.FC<SpeedTrainerChallengeCardProps> = ({
  lang,
  t,
  tr,
  isCurrentEditing,
  isDeleting,
  confirmDeleteId,
  setConfirmDeleteId,
  onStartEdit,
  onDelete,
}) => {
  const sBpm = tr.stages?.[0]?.startBpm;
  const tBpm = tr.stages?.[tr.stages.length - 1]?.targetBpm;

  return (
    <div
      data-training-card={tr.id}
      className={`p-2.5 rounded-xs border-2 transition-all flex items-center justify-between gap-2 shadow-[2px_2px_0px_#1a1a1a] ${
        isCurrentEditing ? 'border-amber-600 bg-amber-500/15' : 'border-[#1a1a1a] bg-[#fcf9f2] hover:bg-[#fffdf9]'
      }`}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-cactus font-bold text-sm text-[#1a1a1a] truncate">{tr.title}</span>
          {isCurrentEditing && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-600 text-[#f4ecd8] rounded-xs uppercase">
              {lang === 'fr' ? 'En cours' : 'Em edição'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] flex-wrap">
          <span className="font-bold text-[#1a1a1a]">m. {tr.startMeasure + 1} - {tr.endMeasure + 1}</span>
          <span>•</span>
          <span>{tr.stagesCount} {lang === 'fr' ? 'paliers' : 'etapas'}</span>
          {sBpm && tBpm && (
            <>
              <span>•</span>
              <span className="font-bold text-amber-900">{sBpm} {tBpm} BPM</span>
            </>
          )}
        </div>
      </div>

      {confirmDeleteId === tr.id ? (
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <button
            type="button"
            disabled={isDeleting}
            onClick={(e) => { e.stopPropagation(); if (tr.id) onDelete(tr.id); }}
            className="bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[#1a1a1a] px-2.5 py-1 text-xs font-bold uppercase cursor-pointer"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>{lang === 'fr' ? 'Supprimer' : 'Excluir'}</>}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
            className="bg-[#f4ecd8] text-[#1a1a1a] border-2 border-[#1a1a1a] px-2 py-1 text-xs font-bold uppercase cursor-pointer"
          >
            
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStartEdit(tr); }}
            title={t('speedTrainerEditChallenge')}
            className={`p-1.5 border border-[#1a1a1a] rounded-xs font-bold cursor-pointer ${
              isCurrentEditing ? 'bg-[#1a1a1a] text-[#f4ecd8]' : 'bg-[#f4ecd8] hover:bg-[#1a1a1a] hover:text-[#f4ecd8]'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={(e) => { e.stopPropagation(); if (tr.id) setConfirmDeleteId(tr.id); }}
            title={t('speedTrainerDeleteChallenge')}
            className="p-1.5 border border-[#1a1a1a] bg-[#f4ecd8] hover:bg-red-700 hover:text-white rounded-xs font-bold cursor-pointer"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
};
