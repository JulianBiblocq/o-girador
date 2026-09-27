/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  PenLine, 
  Sliders, 
  Check, 
  ChevronRight,
  Sparkles,
  FolderOpen,
  UploadCloud
} from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { vocalEngineService } from '../audio/vocalEngineService';
import { CordelConfirmDialog } from './CordelConfirmDialog';
import * as Tone from 'tone';

interface VocalWorkflowStepperProps {
  patternId?: number;
  trackId?: number | string;
  isCoro?: boolean;
}

export const VocalWorkflowStepper: React.FC<VocalWorkflowStepperProps> = ({
  patternId,
  trackId,
  isCoro = false,
}) => {
  const lang = useSequencerStore((state) => state.lang);
  const pattern = useSequencerStore((state) => 
    state.tracks.flatMap(t => t.patterns).find(p => p.id === patternId)
  );
  const tempRecording = useAudioStore((state) => state.tempRecording);
  const hasVocalRecording = useAudioStore((state) => 
    Boolean(patternId && (state.vocalBlobs[patternId] || state.vocalBlobs[String(patternId)]))
  );

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAudioFile = async (file: File) => {
    if (!file || !patternId) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bufferToDecode = arrayBuffer.slice(0);

      const rawCtx = (Tone.getContext().rawContext || Tone.context) as AudioContext;
      if (rawCtx && rawCtx.state === 'suspended') {
        try {
          await rawCtx.resume();
        } catch (_) {}
      }

      const audioBuffer = await rawCtx.decodeAudioData(bufferToDecode);
      const blob = new Blob([arrayBuffer], { type: file.type || 'audio/wav' });

      useAudioStore.getState().setSelectedVocalPatternId(patternId);
      useAudioStore.getState().setTargetPatternId(patternId);

      const currentArmedMeasure = useAudioStore.getState().targetMeasureIdx;
      const assignedMeasure = (pattern?.measureAssignments && pattern.measureAssignments.indexOf(true) !== -1)
        ? pattern.measureAssignments.indexOf(true)
        : 0;
      const effectiveTargetMeasure = currentArmedMeasure !== null ? currentArmedMeasure : assignedMeasure;
      const resolvedTrackId = trackId ?? useSequencerStore.getState().tracks.find(t => t.patterns.some(p => p.id === patternId))?.id;

      useAudioStore.getState().setTempRecording({
        patternId,
        trackId: resolvedTrackId,
        blob,
        audioBuffer,
        isImported: true,
        targetMeasureIdx: effectiveTargetMeasure,
      });

      // Bascule automatique vers l'Étape 3 : Calage
      setCurrentStep(3);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMessage(lang === 'fr' ? "Erreur lors de l'import : " + err.message : "Erro ao importar: " + err.message);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAudioFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAudioFile(file);
    }
  };

  // Synchronisation lors du changement de motif
  useEffect(() => {
    if (hasVocalRecording) {
      setCurrentStep(3);
    } else {
      setCurrentStep(1);
    }
  }, [patternId, hasVocalRecording]);

  // Dès qu'une prise audio temporaire arrive, basculer immédiatement sur l'étape 3 (Calage)
  useEffect(() => {
    if (tempRecording && patternId && Number(tempRecording.patternId) === Number(patternId)) {
      setCurrentStep(3);
    }
  }, [tempRecording, patternId]);

  const accentColor = isCoro ? '#2a9d8f' : '#c25e38';

  // Réouverture de l'éditeur de calage pour un audio existant
  const handleOpenCalibration = async () => {
    if (!patternId) return;
    const pid = patternId;
    let blob: Blob | undefined = useAudioStore.getState().vocalBlobs[pid] || useAudioStore.getState().vocalBlobs[String(pid)];
    if (!blob) {
      const loaded = await vocalEngineService.loadVocalRecording(pid);
      if (loaded) blob = loaded;
    }
    if (blob) {
      const currentArmedMeasure = useAudioStore.getState().targetMeasureIdx;
      const assignedMeasure = (pattern?.measureAssignments && pattern.measureAssignments.indexOf(true) !== -1)
        ? pattern.measureAssignments.indexOf(true)
        : 0;
      const effectiveTargetMeasure = currentArmedMeasure !== null ? currentArmedMeasure : assignedMeasure;
      const resolvedTrackId = trackId ?? useSequencerStore.getState().tracks.find(t => t.patterns.some(p => p.id === pid))?.id;
      useAudioStore.getState().setTempRecording({
        patternId: pid,
        trackId: resolvedTrackId,
        blob,
        isImported: true,
        targetMeasureIdx: effectiveTargetMeasure
      });
      setCurrentStep(3);
    }
  };

  const stepsConfig = [
    {
      id: 1 as const,
      icon: PenLine,
      labelFr: '1. Paroles & Guide',
      labelPt: '1. Letra & Guia',
      isCompleted: currentStep > 1 || hasVocalRecording,
    },
    {
      id: 2 as const,
      icon: FolderOpen,
      labelFr: '2. Import Audio',
      labelPt: '2. Importar Áudio',
      isCompleted: currentStep > 2 || hasVocalRecording,
    },
    {
      id: 3 as const,
      icon: Sliders,
      labelFr: '3. Calage',
      labelPt: '3. Calagem & Ajuste',
      isCompleted: hasVocalRecording,
    },
  ];

  return (
    <div 
      className="bg-[#ece4d0] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] rounded-sm p-3 flex flex-col gap-2.5 text-[#1a1a1a] mb-2 select-none"
      data-testid="vocal-workflow-stepper"
    >
      {/* En-tête du parcours vocal épuré */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base" role="img" aria-label="mic">🎙️</span>
          <span 
            className="font-cactus font-black text-sm tracking-wider uppercase"
            style={{ color: accentColor }}
          >
            {lang === 'fr' ? 'Parcours Vocal (3 étapes)' : 'Percurso Vocal (3 passos)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          <span 
            className="px-2 py-0.5 rounded-xs border text-white font-mono uppercase"
            style={{ backgroundColor: accentColor, borderColor: '#1a1a1a' }}
          >
            {isCoro ? (lang === 'fr' ? 'Coro (Chœur)' : 'Coro (Coletivo)') : (lang === 'fr' ? 'Puxador (Solo)' : 'Puxador (Solo)')}
          </span>
        </div>
      </div>

      {/* Rangée des 3 pastilles d'étapes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {stepsConfig.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === currentStep;
          const isPassed = s.isCompleted && !isActive;

          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-sm transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-[#fdfaf2] border-2 shadow-[2px_2px_0px_#1a1a1a] font-bold scale-[1.01]'
                  : isPassed
                    ? 'bg-[#2a9d8f]/10 border border-[#2a9d8f]/40 text-[#2a9d8f] font-semibold hover:bg-[#2a9d8f]/15'
                    : 'bg-[#1a1a1a]/5 border border-[#1a1a1a]/15 text-[#666] opacity-75 hover:opacity-100 hover:bg-[#1a1a1a]/10'
              }`}
              style={{
                borderColor: isActive ? accentColor : undefined,
              }}
              title={lang === 'fr' ? `Aller à l'étape ${s.id}` : `Ir para o passo ${s.id}`}
            >
              <div 
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  isActive
                    ? 'text-white'
                    : isPassed
                      ? 'bg-[#2a9d8f] text-white'
                      : 'bg-[#1a1a1a]/15 text-[#555]'
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

      {/* Bandeau d'aide contextuelle et actions correspondantes */}
      <div className="bg-[#fdfaf2] border border-[#1a1a1a]/20 p-2.5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        {/* Descriptif d'aide selon l'étape */}
        <div className="flex items-start gap-2 flex-1">
          <Sparkles size={16} className="text-[#8b2a1a] shrink-0 mt-0.5" />
          <div className="text-[#333] leading-relaxed">
            {currentStep === 1 && (
              <span>
                {lang === 'fr' 
                  ? "Saisis tes syllabes sur la grille, puis donne-leur une hauteur avec le clavier ou ton synthé pour poser ta voix guide de référence. (Un retour à cette étape ne supprime jamais ton audio chargé)."
                  : "Escreva suas sílabas na grade e defina as alturas com o teclado ou sintetizador como guia. (Voltar a este passo nunca apaga o áudio carregado)."}
              </span>
            )}
            {currentStep === 2 && (
              <span>
                {lang === 'fr'
                  ? "Exporte ton chant depuis ton DAW (Cubase, Ableton, Logic, Reaper...) au tempo de la séquence. Glisse-dépose le fichier (.wav / .ogg) ou sélectionne-le ci-contre."
                  : "Exporte seu vocal da DAW (Cubase, Ableton, Logic...) no andamento da música. Arraste e solte o arquivo (.wav / .ogg) ou clique para selecionar."}
              </span>
            )}
            {currentStep === 3 && (
              <span>
                {hasVocalRecording
                  ? (lang === 'fr' 
                      ? "🎉 Chant importé et calé avec succès sur ce motif ! Tu peux réajuster l'anacrouse, le nudge ou remplacer le fichier audio."
                      : "🎉 Vocal importado e alinhado com sucesso! Você pode reajustar a anacruse, nudge ou substituir o arquivo.")
                  : (lang === 'fr'
                      ? "Ajuste la position du chant avec la waveform, l'anacrouse et le nudge, écoute en boucle avec la Roda et valide définitivement."
                      : "Ajuste o alinhamento da voz na forma de onda, anacruse e nudge, ouça em loop com a Roda e confirme.")}
              </span>
            )}
          </div>
        </div>

        {/* Boutons d'action contextuels */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          {currentStep === 1 && (
            <button
              onClick={() => setCurrentStep(2)}
              className="px-3 py-1.5 bg-[#1a1a1a] text-[#f4ecd8] font-bold text-xs rounded-sm hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
            >
              <span>{lang === 'fr' ? "Passer à l'import audio" : "Ir para importação"}</span>
              <ChevronRight size={14} />
            </button>
          )}

          {currentStep === 2 && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border-2 transition-all ${
                isDragging
                  ? 'border-[#8b2a1a] bg-[#8b2a1a]/15 scale-[1.02]'
                  : 'border-dashed border-[#1a1a1a]/40 bg-[#1a1a1a]/5'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*,.wav,.ogg,.mp3"
                className="hidden"
                onChange={handleFileImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-[#8b2a1a] hover:bg-[#702014] text-white font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
                title={lang === 'fr' ? "Sélectionner ou déposer un fichier .wav / .ogg exporté au tempo" : "Selecionar arquivo de áudio"}
              >
                <UploadCloud size={14} />
                <span>{lang === 'fr' ? "📁 Déposer ou Sélectionner .wav / .ogg" : "📁 Arrastar ou Selecionar .wav / .ogg"}</span>
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex items-center gap-2 flex-wrap">
              {(hasVocalRecording || tempRecording) && (
                <button
                  onClick={handleOpenCalibration}
                  className="px-3 py-1.5 bg-[#8b2a1a] hover:bg-[#702014] text-white font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
                >
                  <Sliders size={13} />
                  <span>{lang === 'fr' ? '🎚️ Ajuster le calage' : '🎚️ Ajustar alinhamento'}</span>
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*,.wav,.ogg,.mp3"
                className="hidden"
                onChange={handleFileImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-[#ece4d0] hover:bg-[#e2d8be] text-[#1a1a1a] border border-[#1a1a1a] font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                title={lang === 'fr' ? "Remplacer par un autre fichier audio" : "Substituir por outro áudio"}
              >
                <FolderOpen size={13} />
                <span>{lang === 'fr' ? 'Remplacer le fichier' : 'Substituir áudio'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogue Cordel d'Alerte / Erreur */}
      <CordelConfirmDialog
        isOpen={!!errorMessage}
        title={lang === 'fr' ? 'Attention (Import Audio)' : 'Atenção (Importação)'}
        subtitle="Literatura de Cordel"
        message={<p>{errorMessage}</p>}
        confirmText={lang === 'fr' ? 'Compris' : 'Entendido'}
        confirmVariant="warning"
        onConfirm={() => setErrorMessage(null)}
      />
    </div>
  );
};
