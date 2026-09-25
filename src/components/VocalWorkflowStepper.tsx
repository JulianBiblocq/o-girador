/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PenLine, 
  Headphones, 
  Mic, 
  Sliders, 
  Check, 
  RefreshCw, 
  Play, 
  Square, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useAudio } from '../contexts/AudioContext';
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
  const recordingStatus = useAudioStore((state) => state.recordingStatus);
  const tempRecording = useAudioStore((state) => state.tempRecording);
  const hasVocalRecording = useAudioStore((state) => 
    Boolean(patternId && state.vocalBlobs[patternId])
  );
  const selectedDeviceId = useAudioStore((state) => state.selectedDeviceId);
  const { isPlaying, handleTogglePlay, handleStop } = useAudio();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [showNewRecordingConfirm, setShowNewRecordingConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronisation lors du changement de motif
  useEffect(() => {
    if (hasVocalRecording) {
      setCurrentStep(4);
    } else {
      setCurrentStep(1);
    }
  }, [patternId, hasVocalRecording]);

  // Dès qu'une prise audio temporaire arrive, basculer immédiatement sur l'étape 4 (Calage)
  useEffect(() => {
    if (tempRecording && patternId && Number(tempRecording.patternId) === Number(patternId)) {
      setCurrentStep(4);
    }
  }, [tempRecording, patternId]);

  // Si l'enregistrement audio démarre, s'assurer que le stepper est sur l'étape 3
  useEffect(() => {
    if (recordingStatus === 'countdown' || recordingStatus === 'recording') {
      setCurrentStep(3);
    }
  }, [recordingStatus]);

  const accentColor = isCoro ? '#2a9d8f' : '#c25e38';

  // Lancement de l'enregistrement micro avec Tone.js context resume
  const handleStartRecording = async () => {
    if (!patternId) return;
    try {
      if (Tone.context && Tone.context.state !== 'running') {
        await Tone.context.resume();
      }
      await Tone.start();
    } catch (_) {}

    if (isPlaying) {
      handleStop();
    }

    useAudioStore.getState().setSelectedVocalPatternId(patternId);

    vocalEngineService.startRecording(patternId, {
      deviceId: selectedDeviceId || undefined,
      onStartSequencer: (targetMeasure?: number) => {
        if (!isPlaying) {
          handleTogglePlay({ skipPreRoll: true, targetMeasure });
        }
      },
      onStopSequencer: () => {
        handleStop();
      },
      onError: (err) => {
        setErrorMessage(lang === 'fr' 
          ? "Erreur d'accès au micro : " + err.message 
          : "Erro de acesso ao microfone: " + err.message
        );
      }
    });
  };

  // Arrêt de la prise en cours
  const handleStopRecording = () => {
    vocalEngineService.stopRecording();
    handleStop();
  };

  // Réouverture de l'éditeur de calage pour un audio existant
  const handleOpenCalibration = async () => {
    if (!patternId) return;
    const pid = patternId;
    let blob: Blob | undefined = useAudioStore.getState().vocalBlobs[pid];
    if (!blob) {
      const loaded = await vocalEngineService.loadVocalRecording(pid);
      if (loaded) blob = loaded;
    }
    if (blob) {
      useAudioStore.getState().setTempRecording({ patternId: pid, blob });
    }
  };

  // Demande d'une nouvelle prise via dialogue Cordel
  const handleNewRecording = () => {
    setShowNewRecordingConfirm(true);
  };

  const confirmNewRecording = () => {
    setShowNewRecordingConfirm(false);
    if (isPlaying) handleStop();
    setCurrentStep(3);
  };

  const stepsConfig = [
    {
      id: 1 as const,
      icon: PenLine,
      labelFr: '1. Mots & Mélodie',
      labelPt: '1. Letra e Melodia',
      isCompleted: currentStep > 1 || hasVocalRecording,
    },
    {
      id: 2 as const,
      icon: Headphones,
      labelFr: '2. Répétition',
      labelPt: '2. Ensaio',
      isCompleted: currentStep > 2 || hasVocalRecording,
    },
    {
      id: 3 as const,
      icon: Mic,
      labelFr: '3. Prise',
      labelPt: '3. Gravação',
      isCompleted: currentStep > 3 || hasVocalRecording,
    },
    {
      id: 4 as const,
      icon: Sliders,
      labelFr: '4. Calage',
      labelPt: '4. Ajuste',
      isCompleted: hasVocalRecording,
    },
  ];

  return (
    <div 
      className="bg-[#ece4d0] border-2 border-[#1a1a1a] shadow-[2px_2px_0px_#1a1a1a] rounded-sm p-3 flex flex-col gap-2.5 text-[#1a1a1a] mb-2 select-none"
      data-testid="vocal-workflow-stepper"
    >
      {/* En-tête du stepper didactique */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a]/15 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base" role="img" aria-label="mic">🎙️</span>
          <span 
            className="font-cactus font-black text-sm tracking-wider uppercase"
            style={{ color: accentColor }}
          >
            {lang === 'fr' ? 'Parcours Vocal : Poser sa voix' : 'Percurso Vocal : Gravar sua voz'}
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

      {/* Rangée des 4 pastilles d'étapes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stepsConfig.map((s) => {
          const Icon = s.icon;
          const isActive = s.id === currentStep;
          const isPassed = s.isCompleted && !isActive;

          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(s.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-sm transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-[#fdfaf2] border-2 shadow-[2px_2px_0px_#1a1a1a] font-bold scale-[1.01]'
                  : isPassed
                    ? 'bg-[#2a9d8f]/10 border border-[#2a9d8f]/40 text-[#2a9d8f] font-semibold'
                    : 'bg-[#1a1a1a]/5 border border-[#1a1a1a]/15 text-[#666] opacity-65 hover:opacity-100'
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
              <span className="text-[11px] font-mono tracking-tight truncate">
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
                  ? "Écris d'abord tes syllabes sur la grille, puis donne-leur une hauteur avec le clavier ou ton synthé. Astuce : utilise Ctrl+D pour prolonger une voyelle tenue !"
                  : "Escreva primeiro suas sílabas na grade e, em seguida, defina as notas com o teclado ou sintetizador. Dica: use Ctrl+D para prolongar a nota!"}
              </span>
            )}
            {currentStep === 2 && (
              <span>
                {lang === 'fr'
                  ? "Lance la lecture pour vérifier ta mélodie. Le synthétiseur chante la ligne pour t'aider à caler ton souffle et tes appuis rythmiques."
                  : "Inicie a reprodução para conferir a melodia. O sintetizador canta a linha vocal para ajudar na respiração e no ritmo."}
              </span>
            )}
            {currentStep === 3 && (
              <span>
                {lang === 'fr'
                  ? "Mets ton casque (obligatoire pour isoler la voix). Décompte de 4 temps, puis chante dès le départ de la phrase."
                  : "Coloque seus fones de ouvido (obrigatório para isolar a voz). Contagem de 4 tempos e cante no início da frase."}
              </span>
            )}
            {currentStep === 4 && (
              <span>
                {hasVocalRecording
                  ? (lang === 'fr' 
                      ? "🎉 Prise vocale enregistrée et calée avec succès sur ce motif ! Tu peux réajuster le calage ou faire une nouvelle prise."
                      : "🎉 Gravação vocal salva e alinhada com sucesso neste padrão! Você pode reajustar o alinhamento ou gravar novamente.")
                  : (lang === 'fr'
                      ? "Vérifie l'alignement de ta voix avec les notes du patron, ajuste le décalage (Nudge) et valide."
                      : "Verifique o alinhamento da sua voz com as notas do padrão, ajuste o deslocamento (Nudge) e valide.")}
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
              <span>{lang === 'fr' ? 'Passer à la répétition' : 'Ir para o ensaio'}</span>
              <ChevronRight size={14} />
            </button>
          )}

          {currentStep === 2 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleTogglePlay}
                className={`px-2.5 py-1.5 font-bold text-xs rounded-sm transition-colors border border-[#1a1a1a] cursor-pointer flex items-center gap-1.5 ${
                  isPlaying 
                    ? 'bg-[#8b2a1a] text-[#f4ecd8]' 
                    : 'bg-[#ece4d0] text-[#1a1a1a] hover:bg-[#e2d8be]'
                }`}
                title={lang === 'fr' ? 'Lancer / Arrêter la lecture' : 'Iniciar / Parar reprodução'}
              >
                {isPlaying ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                <span>
                  {isPlaying 
                    ? (lang === 'fr' ? 'Pause' : 'Pausar') 
                    : (lang === 'fr' ? 'Écouter la ligne' : 'Ouvir a linha')}
                </span>
              </button>

              <button
                onClick={() => {
                  if (isPlaying) handleStop();
                  setCurrentStep(3);
                }}
                className="px-3 py-1.5 bg-[#8b2a1a] text-white font-bold text-xs rounded-sm hover:bg-[#702014] transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
              >
                <span>● {lang === 'fr' ? 'Prêt pour la prise ➔' : 'Pronto para gravar ➔'}</span>
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex items-center gap-2">
              {recordingStatus === 'inactive' && (
                <button
                  onClick={handleStartRecording}
                  className="px-3 py-1.5 bg-[#8b2a1a] text-white font-bold text-xs rounded-sm hover:bg-[#702014] transition-colors cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#1a1a1a] animate-pulse"
                >
                  <Mic size={14} />
                  <span>{lang === 'fr' ? "Lancer l'enregistrement" : 'Iniciar gravação'}</span>
                </button>
              )}

              {recordingStatus === 'countdown' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-black font-bold text-xs rounded-sm animate-pulse">
                  <span>⏳</span>
                  <span>{lang === 'fr' ? 'Décompte 4 temps...' : 'Contagem 4 tempos...'}</span>
                </div>
              )}

              {recordingStatus === 'recording' && (
                <button
                  onClick={handleStopRecording}
                  className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-sm hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#1a1a1a] animate-bounce"
                >
                  <Square size={13} fill="currentColor" />
                  <span>{lang === 'fr' ? 'Arrêter la prise' : 'Parar gravação'}</span>
                </button>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasVocalRecording && (
                <button
                  onClick={handleOpenCalibration}
                  className="px-2.5 py-1.5 bg-[#ece4d0] hover:bg-[#e2d8be] text-[#1a1a1a] border border-[#1a1a1a] font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sliders size={13} />
                  <span>{lang === 'fr' ? 'Ajuster le calage' : 'Ajustar alinhamento'}</span>
                </button>
              )}

              <button
                onClick={handleNewRecording}
                className="px-2.5 py-1.5 bg-[#1a1a1a] text-[#f4ecd8] hover:bg-[#333] font-bold text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#1a1a1a]"
              >
                <RefreshCw size={13} />
                <span>{lang === 'fr' ? 'Nouvelle prise' : 'Nova gravação'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogue Cordel de Confirmation pour Nouvelle Prise */}
      <CordelConfirmDialog
        isOpen={showNewRecordingConfirm}
        title={lang === 'fr' ? 'Nouvelle Prise Vocale' : 'Nova Gravação Vocal'}
        subtitle={pattern?.name ? `Patron : ${pattern.name}` : 'Literatura de Cordel'}
        icon={<RefreshCw size={18} className="text-[#8b2a1a]" />}
        message={
          <div className="flex flex-col gap-2">
            <p>
              {lang === 'fr'
                ? 'Voulez-vous réaliser une nouvelle prise pour ce motif ?'
                : 'Deseja realizar uma nova gravação para este padrão?'}
            </p>
            <p className="text-xs text-[#8b2a1a] font-bold">
              {lang === 'fr'
                ? '⚠️ L’enregistrement vocal précédent de ce motif sera remplacé.'
                : '⚠️ A gravação vocal anterior deste padrão será substituída.'}
            </p>
          </div>
        }
        confirmText={lang === 'fr' ? 'Oui, nouvelle prise' : 'Sim, nova gravação'}
        cancelText={lang === 'fr' ? 'Annuler' : 'Cancelar'}
        confirmVariant="primary"
        onConfirm={confirmNewRecording}
        onCancel={() => setShowNewRecordingConfirm(false)}
      />

      {/* Dialogue Cordel d'Alerte / Erreur */}
      <CordelConfirmDialog
        isOpen={!!errorMessage}
        title={lang === 'fr' ? 'Attention (Microphone)' : 'Atenção (Microfone)'}
        subtitle="Literatura de Cordel"
        message={<p>{errorMessage}</p>}
        confirmText={lang === 'fr' ? 'Compris' : 'Entendido'}
        confirmVariant="warning"
        onConfirm={() => setErrorMessage(null)}
      />
    </div>
  );
};
