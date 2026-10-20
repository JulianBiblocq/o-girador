/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, ChevronRight, UploadCloud, Sliders, FolderOpen } from 'lucide-react';

interface ContextHelpProps {
  currentStep: 1 | 2 | 3;
  onSetStep: (step: 1 | 2 | 3) => void;
  hasVocalRecording: boolean;
  tempRecording: any;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleOpenCalibration: () => void;
  lang: 'fr' | 'pt';
}

export const VocalWorkflowContextHelp: React.FC<ContextHelpProps> = ({
  currentStep,
  onSetStep,
  hasVocalRecording,
  tempRecording,
  isDragging,
  fileInputRef,
  handleFileImport,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleOpenCalibration,
  lang,
}) => {
  return (
    <div className="bg-[#fdfaf2] border border-[#1a1a1a]/20 p-2.5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
      <div className="flex items-start gap-2 flex-1">
        <Sparkles size={16} className="text-[#8b2a1a] shrink-0 mt-0.5" />
        <div className="text-[#333] leading-relaxed">
          {currentStep === 1 && (
            <span>
              {lang === 'fr'
                ? 'Saisis tes syllabes sur la grille, puis donne-leur une hauteur avec le clavier ou ton synthé pour poser ta voix guide de référence. (Un retour à cette étape ne supprime jamais ton audio chargé).'
                : 'Escreva suas sílabas na grade e defina as alturas com o teclado ou sintetizador como guia. (Voltar a este passo nunca apaga o áudio carregado).'}
            </span>
          )}
          {currentStep === 2 && (
            <span>
              {lang === 'fr'
                ? 'Exporte ton chant depuis ton DAW (Cubase, Ableton, Logic, Reaper...) au tempo de la séquence. Glisse-dépose le fichier (.wav / .ogg) ou sélectionne-le ci-contre.'
                : 'Exporte seu vocal da DAW (Cubase, Ableton, Logic...) no andamento da música. Arraste e solte o arquivo (.wav / .ogg) ou clique para selecionar.'}
            </span>
          )}
          {currentStep === 3 && (
            <span>
              {hasVocalRecording
                ? lang === 'fr'
                  ? "🎉 Chant importé et calé avec succès sur ce motif ! Tu peux réajuster l'anacrouse, le nudge ou remplacer le fichier audio."
                  : '🎉 Vocal importado e alinhado com sucesso! Você pode reajustar a anacruse, nudge ou substituir o arquivo.'
                : lang === 'fr'
                ? "Ajuste la position du chant avec la waveform, l'anacrouse et le nudge, écoute en boucle avec la Roda et valide définitivement."
                : 'Ajuste o alinhamento da voz na forma de onda, anacruse e nudge, ouça em loop com a Roda e confirme.'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
        {currentStep === 1 && (
          <button
            type="button"
            onClick={() => onSetStep(2)}
            className="px-3 py-1.5 bg-[#1a1a1a] text-[#f4ecd8] font-bold text-xs rounded-sm hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
          >
            <span>{lang === 'fr' ? "Passer à l'import audio" : 'Ir para importação'}</span>
            <ChevronRight size={14} />
          </button>
        )}

        {currentStep === 2 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border-2 transition-all ${
              isDragging ? 'border-[#8b2a1a] bg-[#8b2a1a]/15 scale-[1.02]' : 'border-dashed border-[#1a1a1a]/40 bg-[#1a1a1a]/5'
            }`}
          >
            <input type="file" ref={fileInputRef} accept="audio/*,.wav,.ogg,.mp3" className="hidden" onChange={handleFileImport} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-[#8b2a1a] hover:bg-[#702014] text-white font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
              title={lang === 'fr' ? 'Sélectionner ou déposer un fichier .wav / .ogg exporté au tempo' : 'Selecionar arquivo de áudio'}
            >
              <UploadCloud size={14} />
              <span>{lang === 'fr' ? '📁 Déposer ou Sélectionner .wav / .ogg' : '📁 Arrastar ou Selecionar .wav / .ogg'}</span>
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="flex items-center gap-2 flex-wrap">
            {(hasVocalRecording || tempRecording) && (
              <button
                type="button"
                onClick={handleOpenCalibration}
                className="px-3 py-1.5 bg-[#8b2a1a] hover:bg-[#702014] text-white font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
              >
                <Sliders size={13} />
                <span>{lang === 'fr' ? '🎚️ Ajuster le calage' : '🎚️ Ajustar alinhamento'}</span>
              </button>
            )}

            <input type="file" ref={fileInputRef} accept="audio/*,.wav,.ogg,.mp3" className="hidden" onChange={handleFileImport} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-[#ece4d0] hover:bg-[#e2d8be] text-[#1a1a1a] border border-[#1a1a1a] font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
              title={lang === 'fr' ? 'Remplacer par un autre fichier audio' : 'Substituir por outro áudio'}
            >
              <FolderOpen size={13} />
              <span>{lang === 'fr' ? 'Remplacer le fichier' : 'Substituir áudio'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
