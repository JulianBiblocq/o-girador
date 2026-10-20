/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PenLine, Sliders, Check, FolderOpen, LucideIcon } from 'lucide-react';

interface StepItem {
  id: 1 | 2 | 3;
  icon: LucideIcon;
  labelFr: string;
  labelPt: string;
  isCompleted: boolean;
}

interface StepButtonsProps {
  currentStep: 1 | 2 | 3;
  onSelectStep: (step: 1 | 2 | 3) => void;
  hasVocalRecording: boolean;
  accentColor: string;
  lang: 'fr' | 'pt';
}

export const VocalWorkflowStepButtons: React.FC<StepButtonsProps> = ({
  currentStep,
  onSelectStep,
  hasVocalRecording,
  accentColor,
  lang,
}) => {
  const stepsConfig: StepItem[] = [
    { id: 1, icon: PenLine, labelFr: '1. Paroles & Guide', labelPt: '1. Letra & Guia', isCompleted: currentStep > 1 || hasVocalRecording },
    { id: 2, icon: FolderOpen, labelFr: '2. Import Audio', labelPt: '2. Importar Áudio', isCompleted: currentStep > 2 || hasVocalRecording },
    { id: 3, icon: Sliders, labelFr: '3. Calage', labelPt: '3. Calagem & Ajuste', isCompleted: hasVocalRecording },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {stepsConfig.map((s) => {
        const Icon = s.icon;
        const isActive = s.id === currentStep;
        const isPassed = s.isCompleted && !isActive;

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectStep(s.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-sm transition-all cursor-pointer text-left ${
              isActive
                ? 'bg-[#fdfaf2] border-2 shadow-[2px_2px_0px_#1a1a1a] font-bold scale-[1.01]'
                : isPassed
                ? 'bg-[#2a9d8f]/10 border border-[#2a9d8f]/40 text-[#2a9d8f] font-semibold hover:bg-[#2a9d8f]/15'
                : 'bg-[#1a1a1a]/5 border border-[#1a1a1a]/15 text-[#666] opacity-75 hover:opacity-100 hover:bg-[#1a1a1a]/10'
            }`}
            style={{ borderColor: isActive ? accentColor : undefined }}
            title={lang === 'fr' ? `Aller à l'étape ${s.id}` : `Ir para o passo ${s.id}`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                isActive ? 'text-white' : isPassed ? 'bg-[#2a9d8f] text-white' : 'bg-[#1a1a1a]/15 text-[#555]'
              }`}
              style={{ backgroundColor: isActive ? accentColor : undefined }}
            >
              {isPassed ? <Check size={11} strokeWidth={3} /> : s.id}
            </div>
            <span className="text-[12px] font-mono tracking-tight truncate flex items-center gap-1.5">
              <Icon size={14} className="shrink-0" />
              {lang === 'fr' ? s.labelFr : s.labelPt}
            </span>
          </button>
        );
      })}
    </div>
  );
};
