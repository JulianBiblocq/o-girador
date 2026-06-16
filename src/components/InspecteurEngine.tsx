import React, { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { Play, Square, ShieldAlert, Award, ArrowLeft, HelpCircle, UserX, Check } from 'lucide-react';

interface InspecteurEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  caixaParfaite: Tone.Sequence | undefined;
  caixaErreur: Tone.Sequence | undefined;
  onSuccess?: () => void;
}

interface Suspect {
  id: string;
  name: { fr: string; pt: string };
  description: { fr: string; pt: string };
  icon: string;
  isGuilty: boolean;
}

const suspects: Suspect[] = [
  {
    id: 'alfaia',
    name: { fr: 'Alfaia la Lourde', pt: 'Alfaia a Pesada' },
    description: {
      fr: 'Soupçonnée de jouer des coups décalés dans les basses.',
      pt: 'Suspeita de tocar batidas atrasadas nos graves.'
    },
    icon: 'icones/alfaia.svg',
    isGuilty: false
  },
  {
    id: 'caixa',
    name: { fr: 'Caixa la Tremblante', pt: 'Caixa a Trêmula' },
    description: {
      fr: 'Soupçonnée de perturber le roulement régulier avec des ratés.',
      pt: 'Suspeita de perturbar o toque contínuo com falhas rítmicas.'
    },
    icon: 'icones/caixa.svg',
    isGuilty: true // The target of the investigation!
  },
  {
    id: 'gongue',
    name: { fr: 'Gonguê le Métallique', pt: 'Gonguê o Metálico' },
    description: {
      fr: 'Soupçonné d\'émettre des coups ouverts hors tempo.',
      pt: 'Suspeito de emitir golpes abertos fora do tempo.'
    },
    icon: 'icones/gongue.svg',
    isGuilty: false
  },
  {
    id: 'agbe',
    name: { fr: 'Agbê la Perlée', pt: 'Agbê a Perlada' },
    description: {
      fr: 'Soupçonnée de saboter le contretemps avec des lancers manqués.',
      pt: 'Suspeita de sabotar o contratempo com lançamentos errados.'
    },
    icon: 'icones/agbe.svg',
    isGuilty: false
  }
];

export const InspecteurEngine: React.FC<InspecteurEngineProps> = ({
  lang,
  onExit,
  caixaParfaite,
  caixaErreur,
  onSuccess
}) => {
  // Game state
  const [accusedState, setAccusedState] = useState<Record<string, 'guilty' | 'innocent' | null>>({});
  const [isCorrected, setIsCorrected] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(true);

  // Success handler
  useEffect(() => {
    if (isCorrected) {
      onSuccess?.();
    }
  }, [isCorrected, onSuccess]);

  // Monitor the actual Tone.Transport status
  useEffect(() => {
    setIsPlayingAudio(Tone.Transport.state === 'started');
    
    // Auto unmute error and mute perfect on start/restart
    if (caixaErreur) caixaErreur.mute = false;
    if (caixaParfaite) caixaParfaite.mute = true;
    
    return () => {
      // Restore defaults on leave
      if (caixaErreur) caixaErreur.mute = false;
      if (caixaParfaite) caixaParfaite.mute = true;
    };
  }, [caixaParfaite, caixaErreur]);

  const togglePlayback = () => {
    if (Tone.Transport.state === 'started') {
      Tone.Transport.pause();
      setIsPlayingAudio(false);
    } else {
      Tone.Transport.start();
      setIsPlayingAudio(true);
    }
  };

  const handleAccuse = (suspect: Suspect) => {
    if (isCorrected) return; // Already won

    if (suspect.isGuilty) {
      // 🎯 SUCCESS!
      // Instantly mute the error sequence and unmute the perfect sequence
      if (caixaErreur) {
        caixaErreur.mute = true;
      }
      if (caixaParfaite) {
        caixaParfaite.mute = false;
      }

      setAccusedState((prev) => ({
        ...prev,
        [suspect.id]: 'guilty'
      }));
      setIsCorrected(true);
    } else {
      // ❌ WRONG SUSPECT
      setAccusedState((prev) => ({
        ...prev,
        [suspect.id]: 'innocent'
      }));
    }
  };

  const t = {
    fr: {
      title: "L'Inspecteur du Baque",
      subtitle: "Trouvez l'intrus rythmique !",
      wantedPoster: "AVIS DE RECHERCHE",
      reward: "RÉCOMPENSE : 1000 COCOS",
      description: "Une erreur s'est glissée dans le mix rythmique du Maracatu ! Écoutez attentivement le son global, et cliquez sur l'instrument coupable de saboter le tempo.",
      innocentLabel: "Innocent",
      guiltyLabel: "Coupable !",
      correctedStamp: "CORRIGÉ !",
      btnPlay: "Écouter",
      btnStop: "Pause",
      btnExit: "Retour",
      successMsg: "Excellent travail d'oreille ! La Caixa jouait effectivement à contre-temps. La piste a été corrigée en temps réel !",
      solvedTitle: "RÉSOLU",
      tip: "Astuce : Mettez un casque pour bien isoler la stéréo des instruments et localiser la faille rythmique."
    },
    pt: {
      title: "O Inspetor do Baque",
      subtitle: "Ache o sabotador do ritmo !",
      wantedPoster: "PROCURADO",
      reward: "RECOMPENSA: 1000 COCOS",
      description: "Um erro entrou no mix do Maracatu! Escute atentamente o som global, e clique no instrumento culpado por sabotar o tempo.",
      innocentLabel: "Inocente",
      guiltyLabel: "Culpado !",
      correctedStamp: "CORRIGIDO !",
      btnPlay: "Escutar",
      btnStop: "Pausa",
      btnExit: "Voltar",
      successMsg: "Excelente trabalho de ouvido! A Caixa estava realmente tocando errado. A faixa foi corrigida em tempo real!",
      solvedTitle: "RESOLVIDO",
      tip: "Dica: Use fones de ouvido para isolar o estéreo dos instrumentos e localizar o erro rítmico."
    }
  }[lang];

  return (
    <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-5 cordel-bg select-none my-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            🔍 {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t.btnExit}
        </button>
      </div>

      {/* WANTED / PROCURADO Board Title */}
      <div className="text-center py-2 border-y-2 border-dashed border-[var(--cordel-border)]/30">
        <span className="font-cactus text-lg font-bold tracking-widest text-[var(--cordel-wood)] uppercase animate-pulse">
          🚨 {t.wantedPoster} 🚨
        </span>
        <div className="text-[10px] font-bold tracking-wider text-[var(--cordel-text)]/80 mt-0.5">
          {t.reward}
        </div>
      </div>

      {/* Game Instruction Description */}
      <p className="text-xs text-[var(--cordel-text)]/80 leading-relaxed font-cactus text-center max-w-lg mx-auto">
        {t.description}
      </p>

      {/* Main Playback Controller */}
      <div className="flex justify-center items-center gap-3 py-1">
        <button
          onClick={togglePlayback}
          className={`px-5 py-2.5 font-cactus text-xs font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-2 transition-all duration-100 ${
            isPlayingAudio 
              ? 'bg-[var(--cordel-wood)] text-white hover:opacity-90' 
              : 'bg-yellow-600 text-white hover:opacity-95'
          }`}
        >
          {isPlayingAudio ? (
            <><Square className="w-3.5 h-3.5 fill-current" /> {t.btnStop}</>
          ) : (
            <><Play className="w-3.5 h-3.5 fill-current" /> {t.btnPlay}</>
          )}
        </button>
      </div>

      {/* Grid of Suspects ("Avis de recherche") */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {suspects.map((suspect) => {
          const state = accusedState[suspect.id];
          const isInnocent = state === 'innocent';
          const isGuilty = state === 'guilty';
          
          return (
            <button
              key={suspect.id}
              disabled={isInnocent || isCorrected}
              onClick={() => handleAccuse(suspect)}
              className={`relative flex flex-col items-center p-3 border-3 bg-[var(--cordel-bg)] text-left transition-all duration-150 overflow-hidden min-h-[220px] ${
                isInnocent
                  ? 'border-red-800/40 opacity-45 cursor-not-allowed bg-red-950/5'
                  : isGuilty
                    ? 'border-green-600 bg-green-500/5 rotate-[-1deg] scale-[1.02]'
                    : 'border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cordel-border hover:-translate-y-0.5 cursor-pointer'
              }`}
            >
              {/* Instrument Icon */}
              <div className={`w-16 h-16 p-2 border border-[var(--cordel-border)]/30 rounded bg-white/5 flex items-center justify-center mb-3 ${
                isGuilty ? 'border-green-600' : ''
              }`}>
                <img
                  src={`${(import.meta as any).env.BASE_URL || '/'}${suspect.icon}`}
                  alt={suspect.name[lang]}
                  className={`w-full h-full object-contain filter invert opacity-80 ${
                    isGuilty ? 'invert-0 text-green-600' : ''
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Suspect Info */}
              <div className="text-center flex flex-col gap-1 w-full mt-auto">
                <span className="font-cactus text-xs font-black uppercase tracking-wider block truncate">
                  {suspect.name[lang]}
                </span>
                <p className="text-[9px] leading-tight text-[var(--cordel-text)]/70 font-sans h-[36px] overflow-hidden">
                  {suspect.description[lang]}
                </p>
              </div>

              {/* Innocent Visual Stamp */}
              {isInnocent && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/15 pointer-events-none select-none z-10">
                  {/* Diagonal cross bar */}
                  <div className="w-[120%] h-1 bg-red-700/80 rotate-[35deg] absolute"></div>
                  <div className="border-3 border-red-700 text-red-700 font-cactus font-extrabold text-xs px-2 py-1 uppercase tracking-widest rotate-[-10deg] bg-[var(--cordel-bg)] mt-4">
                    {t.innocentLabel}
                  </div>
                </div>
              )}

              {/* Guilty / Solved Visual Stamp */}
              {isGuilty && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-600/10 pointer-events-none select-none z-10">
                  <div className="border-4 border-dashed border-green-600 text-green-600 font-cactus font-black text-sm px-4 py-2 uppercase tracking-widest rotate-[-15deg] bg-[var(--cordel-bg)] shadow-lg animate-bounce">
                    {t.correctedStamp}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tip Box */}
      <div className="flex gap-2 items-start text-[10px] text-[var(--cordel-text)]/60 leading-normal p-2 border border-dashed border-[var(--cordel-border)]/25 bg-black/5">
        <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{t.tip}</span>
      </div>

      {/* Success Notification */}
      {isCorrected && (
        <div className="p-4 border-3 border-green-600 bg-green-500/10 text-green-700 text-center flex flex-col items-center justify-center relative rotate-[-0.5deg]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] text-8xl font-black opacity-10 pointer-events-none font-cactus">
            {t.solvedTitle}
          </div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <span className="font-cactus font-bold text-sm max-w-md">
              {t.successMsg}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
