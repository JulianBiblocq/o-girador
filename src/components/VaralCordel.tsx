import React, { useState, useEffect } from 'react';
import { Lock, LockOpen, Check, X, Award, HelpCircle, ExternalLink } from 'lucide-react';
import { folhetosData, Folheto } from '../data/cordelData';
import { useGameData } from '../contexts/GameDataContext';

interface VaralCordelProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  unlockedFolhetos: string[]; // List of unlocked booklet IDs
  justUnlockedBookletId: string | null; // ID of a booklet that was just unlocked
  onClearJustUnlocked: () => void; // Reset the justUnlocked state in App.tsx
}

// Rope Y calculation based on quadratic bezier curve (P0=11, P1=51, P2=11)
const getRopeY = (t: number) => {
  return 11 + 80 * t * (1 - t);
};

export const VaralCordel: React.FC<VaralCordelProps> = ({
  lang,
  onExit,
  unlockedFolhetos,
  justUnlockedBookletId,
  onClearJustUnlocked
}) => {
  const { varalConfig, customExercises } = useGameData();
  const [selectedFolheto, setSelectedFolheto] = useState<Folheto | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<{
    cordeIndex: number;
    oeuvreToniBraga: string;
    rewardData: string;
  } | null>(null);

  const [animatingUnlockId, setAnimatingUnlockId] = useState<string | null>(null);
  const [showGlowEffect, setShowGlowEffect] = useState<string | null>(null);

  // Trigger unlock animation when justUnlockedBookletId matches
  useEffect(() => {
    if (justUnlockedBookletId && folhetosData.some(f => f.id === justUnlockedBookletId)) {
      setAnimatingUnlockId(justUnlockedBookletId);

      // Finish stamp animation after 1.8 seconds, then show glow effect
      const stampTimer = setTimeout(() => {
        setAnimatingUnlockId(null);
        setShowGlowEffect(justUnlockedBookletId);
        onClearJustUnlocked();

        // Clear glow after 3 seconds
        const glowTimer = setTimeout(() => {
          setShowGlowEffect(null);
        }, 3000);
        return () => clearTimeout(glowTimer);
      }, 1800);

      return () => clearTimeout(stampTimer);
    }
  }, [justUnlockedBookletId]);

  const getBookletsForCorde = (cordeIndex: number): Folheto[] => {
    const gameIds = ['quiz', 'dictee', 'inspecteur', 'mestre', 'rythmelive'];
    const gameId = gameIds[cordeIndex - 1];
    const defaultBaseBooklet = folhetosData.find(f => f.associatedGameId === gameId);

    const targetedExercises = customExercises.filter(ex => ex.corde_cible === cordeIndex);

    if (targetedExercises.length === 0) {
      return defaultBaseBooklet ? [defaultBaseBooklet] : [];
    }

    return targetedExercises.map((customEx) => {
      const customModuleMap: Record<string, string> = {
        'quiz': 'quiz',
        'dictee': 'dictee',
        'inspecteur': 'inspecteur',
        'sablier_mestre': 'mestre',
        'rythme_live': 'rythmelive'
      };
      const baseGameId = customModuleMap[customEx.module] || gameId;
      const baseBooklet = folhetosData.find(f => f.associatedGameId === baseGameId) || defaultBaseBooklet || folhetosData[0];

      let culturalContentFr = '';
      let culturalContentPt = '';

      if (customEx.module === 'quiz') {
        culturalContentFr = `Cet exercice de Quiz personnalisé a été importé par le Mestre.\n\nQuestions du Quiz :\n`;
        culturalContentPt = `Este exercício de Quiz personalizado foi importado pelo Mestre.\n\nQuestões do Quiz :\n`;
        customEx.questions?.forEach((q: any, qIdx: number) => {
          culturalContentFr += `\n${qIdx + 1}. ${q.questionText?.fr || q.questionText?.pt}`;
          culturalContentPt += `\n${qIdx + 1}. ${q.questionText?.pt || q.questionText?.fr}`;
        });
      } else if (customEx.module === 'dictee') {
        culturalContentFr = `Cet exercice de Dictée de blocs personnalisé à ${customEx.bpm || 83} BPM a été importé par le Mestre.\n\nBlocs rythmiques à réordonner :\n`;
        culturalContentPt = `Este exercício de Ditado de blocos personalizado a ${customEx.bpm || 83} BPM foi importado pelo Mestre.\n\nBlocos rítmicos a reordenar :\n`;
        customEx.blocs_a_ordonner?.forEach((b: any) => {
          culturalContentFr += `\n- ${b.label}`;
          culturalContentPt += `\n- ${b.label}`;
        });
      } else if (customEx.module === 'inspecteur') {
        culturalContentFr = `Cet exercice d'Inspecteur personnalisé à ${customEx.bpm || 83} BPM a été importé par le Mestre.\n\nDescription : ${customEx.description || 'Trouvez le coupable.'}\nInstrument saboté : ${customEx.instrument_coupable || 'Caixa'}.`;
        culturalContentPt = `Este exercício de Inspetor personalizado a ${customEx.bpm || 83} BPM foi importado pelo Mestre.\n\nDescrição : ${customEx.description || 'Encontre o culpado.'}\nInstrumento sabotado : ${customEx.instrument_coupable || 'Caixa'}.`;
      } else if (customEx.module === 'sablier_mestre') {
        culturalContentFr = `Cet exercice de Sablier du Mestre personnalisé à ${customEx.bpm || 83} BPM a été importé par le Mestre.\n\nDurée du sablier : ${customEx.sablier_mesures || 2} mesure(s).\nÉtat audio attendu en succès : ${customEx.etat_audio_succes || 'variation'}.`;
        culturalContentPt = `Este exercício de Ampulheta do Mestre personalizado a ${customEx.bpm || 83} BPM foi importado pelo Mestre.\n\nDuração da ampulheta : ${customEx.sablier_mesures || 2} compasso(s).\nEstado de áudio esperado em sucesso : ${customEx.etat_audio_succes || 'variation'}.`;
      } else if (customEx.module === 'rythme_live') {
        culturalContentFr = `Cet exercice d'Examen de Rythme Live à ${customEx.bpm || 83} BPM a été importé par le Mestre.\n\nInstrument joué par l'élève : ${customEx.instrument_eleve || 'Alfaia'}\nNombre de boucles requises : ${customEx.boucles_requises || 2}\nTolérance de précision : +/- ${customEx.tolerance_ms || 80} ms.`;
        culturalContentPt = `Este exercício de Exame de Ritmo Live a ${customEx.bpm || 83} BPM foi importado pelo Mestre.\n\nInstrumento tocado pelo aluno : ${customEx.instrument_eleve || 'Alfaia'}\nNúmero de repetições exigidas : ${customEx.boucles_requises || 2}\nTolerância de precisão : +/- ${customEx.tolerance_ms || 80} ms.`;
      }

      return {
        ...baseBooklet,
        id: customEx.id || `custom_${customEx.module}_${Math.random()}`,
        associatedGameId: baseGameId,
        title: {
          fr: customEx.folheto_titre || baseBooklet.title.fr,
          pt: customEx.folheto_titre || baseBooklet.title.pt,
        },
        shortDescription: {
          fr: `Exercice personnalisé importé (${customEx.module})`,
          pt: `Exercício personalizado importado (${customEx.module})`,
        },
        culturalContent: {
          fr: culturalContentFr || baseBooklet.culturalContent.fr,
          pt: culturalContentPt || baseBooklet.culturalContent.pt,
        }
      };
    });
  };

  const getRewardForCorde = (cordeIndex: number, defaultReward: string): string => {
    const gameIds = ['quiz', 'dictee', 'inspecteur', 'mestre', 'rythmelive'];
    const gameId = gameIds[cordeIndex - 1];
    const customModuleMap: Record<string, string> = {
      'quiz': 'quiz',
      'dictee': 'dictee',
      'inspecteur': 'inspecteur',
      'mestre': 'sablier_mestre',
      'rythmelive': 'rythme_live'
    };
    const customModule = customModuleMap[gameId];
    const customEx = customExercises.find(ex => ex.module === customModule);

    if (customEx) {
      if (customModule === 'quiz') return customEx.recompense_texte || defaultReward;
      if (customModule === 'dictee') return customEx.recompense_video_url || defaultReward;
      if (customModule === 'inspecteur') return customEx.description || defaultReward;
      if (customModule === 'sablier_mestre') return customEx.recompense_video_url || defaultReward;
      if (customModule === 'rythme_live') return customEx.recompense_diplome_signataire || defaultReward;
    }
    return defaultReward;
  };

  const handleCardClick = (folheto: Folheto) => {
    const baseGameBooklet = folhetosData.find(f => f.associatedGameId === folheto.associatedGameId);
    const unlockIdToCheck = baseGameBooklet ? baseGameBooklet.id : folheto.id;

    const isUnlocked = unlockedFolhetos.includes(unlockIdToCheck) || justUnlockedBookletId === unlockIdToCheck;
    if (isUnlocked && !animatingUnlockId) {
      setSelectedFolheto(folheto);
    }
  };

  const handleArtworkClick = (cordeIdx: number, image: string, reward: string, isUnlocked: boolean) => {
    if (isUnlocked && !animatingUnlockId) {
      setSelectedArtwork({
        cordeIndex: cordeIdx,
        oeuvreToniBraga: image,
        rewardData: reward
      });
    }
  };

  if (!varalConfig || !varalConfig.cordes || varalConfig.cordes.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] cordel-bg select-none my-4 overflow-hidden relative">
        <svg className="hidden">
          <defs>
            <filter id="woodcut-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
        <div className="absolute inset-4 border-4 border-dashed border-[var(--cordel-border)]/45 pointer-events-none rounded-sm" />
        <div 
          className="border-4 border-[var(--cordel-border)] p-8 text-center bg-[#fdfaf2] shadow-[8px_8px_0_var(--cordel-border)] max-w-md relative flex flex-col items-center gap-4"
          style={{ filter: 'url(#woodcut-grain)' }}
        >
          <svg className="w-16 h-16 text-[var(--cordel-wood)] animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M30,20 H70" strokeWidth="4" />
            <path d="M30,80 H70" strokeWidth="4" />
            <path d="M35,20 C35,45 65,45 65,80" />
            <path d="M65,20 C65,45 35,45 35,80" />
            <line x1="50" y1="35" x2="50" y2="70" strokeDasharray="3 3" />
          </svg>
          <h2 className="font-cactus text-lg md:text-xl font-black uppercase text-[var(--cordel-wood)] tracking-wide">
            {lang === 'fr' ? 'La Valise du Mestre' : 'A Mala do Mestre'}
          </h2>
          <p className="text-sm italic font-semibold text-[var(--cordel-text)] leading-relaxed">
            {lang === 'fr'
              ? 'Le Mestre prépare les prochains défis...'
              : 'O Mestre está preparando os próximos desafios...'}
          </p>
          <button
            onClick={onExit}
            className="mt-4 px-4 py-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cordel-button"
          >
            {lang === 'fr' ? 'Retour' : 'Voltar'}
          </button>
        </div>
      </div>
    );
  }

  const t = {
    fr: {
      title: "La Corde à Linge (Varal)",
      subtitle: "Votre progression & livrets culturels",
      instructions: "Obtenez un score parfait dans les mini-jeux pour déverrouiller et suspendre les livrets de littérature de Cordel ainsi que les œuvres d'art !",
      unlockedStamp: "DÉVERROUILLÉ !",
      lockedLabel: "Verrouillé",
      readBtn: "Lire le livret",
      closeBtn: "Décrocher le livret",
      exitBtn: "Retour",
      stampCarimbo: "APROUVÉ !",
      viewArt: "Voir l'œuvre",
      artTitle: "Illustration Toni Braga",
      diplomaLabel: "Certificat de Corde",
      viewVideo: "Voir la vidéo"
    },
    pt: {
      title: "Varal de Cordel",
      subtitle: "Sua progressão & folhetos culturais",
      instructions: "Obtenha uma pontuação perfeita nos jogos para desbloquear e pendurar os folhetos de literatura de Cordel e as obras de arte !",
      unlockedStamp: "DESBLOQUEADO !",
      lockedLabel: "Bloqueado",
      readBtn: "Ler o folheto",
      closeBtn: "Despendurar folheto",
      exitBtn: "Voltar",
      stampCarimbo: "APROVADO !",
      viewArt: "Ver a obra",
      artTitle: "Ilustração Toni Braga",
      diplomaLabel: "Certificado de Corda",
      viewVideo: "Ver vídeo"
    }
  }[lang];

  // Helper to render inline SVG woodcut (xilogravura) illustrations based on booklet ID
  const renderWoodcutIllustration = (id: string, isBig: boolean = false) => {
    const sizeClass = isBig ? "w-40 h-40 md:w-56 md:h-56" : "w-20 h-20";
    const strokeWidth = isBig ? "2" : "1.5";

    switch (id) {
      case 'folheto_quiz': // Crown and Sun
        return (
          <svg className={`${sizeClass} text-[var(--cordel-border)]`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
            <circle cx="50" cy="50" r="14" strokeDasharray="3 2" />
            <circle cx="50" cy="50" r="10" fill="currentColor" fillOpacity="0.1" />
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * Math.PI) / 6;
              const x1 = 50 + 17 * Math.cos(angle);
              const y1 = 50 + 17 * Math.sin(angle);
              const x2 = 50 + 26 * Math.cos(angle);
              const y2 = 50 + 26 * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
            <path d="M 32,70 L 36,45 L 45,55 L 50,42 L 55,55 L 64,45 L 68,70 Z" fill="currentColor" fillOpacity="0.2" />
            <line x1="30" y1="70" x2="70" y2="70" strokeWidth="2.5" />
            <circle cx="50" cy="38" r="2.5" fill="currentColor" />
            <circle cx="36" cy="41" r="2" fill="currentColor" />
            <circle cx="64" cy="41" r="2" fill="currentColor" />
            <line x1="25" y1="78" x2="75" y2="78" strokeDasharray="2 2" />
            <line x1="30" y1="83" x2="70" y2="83" strokeDasharray="4 2" />
          </svg>
        );

      case 'folheto_dictee': // Drum (Alfaia)
        return (
          <svg className={`${sizeClass} text-[var(--cordel-border)]`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
            <rect x="34" y="38" width="32" height="32" rx="1" fill="currentColor" fillOpacity="0.1" />
            <ellipse cx="50" cy="38" rx="16" ry="4" fill="currentColor" fillOpacity="0.1" />
            <ellipse cx="50" cy="38" rx="16" ry="4" />
            <ellipse cx="50" cy="70" rx="16" ry="4" />
            <path d="M 34,38 L 42,70 L 50,38 L 58,70 L 66,38" />
            <path d="M 34,70 L 42,38 L 50,70 L 58,38 L 66,70" strokeDasharray="2 2" />
            <path d="M 22,35 L 14,30 L 20,42" />
            <path d="M 78,35 L 86,30 L 80,42" />
            <path d="M 18,55 L 8,55" strokeWidth="2" />
            <path d="M 82,55 L 92,55" strokeWidth="2" />
          </svg>
        );

      case 'folheto_inspecteur': // Gonguê bell, Agbê shaker
        return (
          <svg className={`${sizeClass} text-[var(--cordel-border)]`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
            <path d="M 30,72 L 44,28 L 54,28 L 42,72 Z" fill="currentColor" fillOpacity="0.15" />
            <line x1="44" y1="28" x2="54" y2="28" strokeWidth="2" />
            <path d="M 62,72 C 54,72 54,54 62,48 C 65,45 65,34 70,34 C 75,34 75,45 78,48 C 86,54 86,72 78,72 Z" fill="currentColor" fillOpacity="0.1" />
            <circle cx="70" cy="56" r="1.5" fill="currentColor" />
            <circle cx="64" cy="62" r="1.5" fill="currentColor" />
            <circle cx="76" cy="62" r="1.5" fill="currentColor" />
            <circle cx="70" cy="68" r="1.5" fill="currentColor" />
            <line x1="22" y1="36" x2="36" y2="62" strokeWidth="2.5" />
            <circle cx="22" cy="36" r="2" fill="currentColor" />
          </svg>
        );

      case 'folheto_mestre': // Whistle (Apito)
        return (
          <svg className={`${sizeClass} text-[var(--cordel-border)]`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
            <path d="M 40,46 H 64 V 58 H 40 Z" fill="currentColor" fillOpacity="0.2" />
            <path d="M 30,48 H 40 V 56 H 30 Z" />
            <circle cx="26" cy="52" r="4" />
            <rect x="46" y="42" width="6" height="5" fill="currentColor" />
            <path d="M 68,42 L 78,32" strokeWidth="2" />
            <path d="M 72,52 L 86,52" strokeWidth="2.5" />
            <path d="M 68,62 L 78,72" strokeWidth="2" />
          </svg>
        );

      case 'folheto_rythmelive': // Parade Standard
        return (
          <svg className={`${sizeClass} text-[var(--cordel-border)]`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
            <line x1="35" y1="18" x2="35" y2="82" strokeWidth="2" />
            <circle cx="35" cy="16" r="2.5" fill="currentColor" />
            <path d="M 35,24 H 75 V 60 L 55,50 L 35,60 Z" fill="currentColor" fillOpacity="0.15" />
            <path d="M 35,24 H 75 V 60 L 55,50 L 35,60 Z" />
            <path d="M 55,32 L 57,37 H 62 L 58,40 L 60,45 L 55,42 L 50,45 L 52,40 L 48,37 H 53 Z" fill="currentColor" />
            <path d="M 75,28 Q 80,36 78,44" />
            <path d="M 75,34 Q 84,42 80,50" />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4 overflow-hidden h-full">
      {/* SVG handcarved paper noise filter */}
      <svg className="hidden">
        <defs>
          <filter id="woodcut-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* CSS Styles */}
      <style>{`
        .cordel-folheto-card {
          filter: url(#woodcut-grain);
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease;
        }
        .cordel-folheto-card:hover {
          transform: translateY(-4px) rotate(1.5deg);
          box-shadow: 6px 10px 0 var(--cordel-border);
        }
        
        @keyframes carimbo-slam {
          0% { opacity: 0; transform: scale(4) rotate(-45deg); }
          40% { opacity: 0.9; transform: scale(1.05) rotate(-15deg); }
          50% { opacity: 1; transform: scale(1) rotate(-12deg); }
          100% { opacity: 1; transform: scale(1) rotate(-12deg); }
        }
        .animate-carimbo {
          animation: carimbo-slam 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes paper-unlock-glow {
          0% { box-shadow: 0 0 0px transparent; transform: scale(1); }
          50% { box-shadow: 0 0 20px var(--cordel-border); transform: scale(1.04); }
          100% { box-shadow: 0 0 0px transparent; transform: scale(1); }
        }
        .animate-glow-unlock {
          animation: paper-unlock-glow 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            🪢 {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase flex items-center gap-1 cursor-pointer cordel-button"
        >
          {t.exitBtn}
        </button>
      </div>

      {/* Info Box */}
      <div className="p-3 border-2 border-dashed border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-center">
        <p className="text-[11px] text-[var(--cordel-text)]/80 leading-relaxed font-cactus">
          ℹ️ {t.instructions}
        </p>
      </div>

      {/* 5 Stacked horizontal ropes container */}
      <div className="flex-grow flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-16">
        {varalConfig.cordes.map((corde) => {
          const booklets = getBookletsForCorde(corde.cordeIndex);
          if (booklets.length === 0) return null;

          const numItems = booklets.length + 1; // booklets + 1 artwork
          
          // Calcul dynamique de la largeur du fil en fonction du nombre de livrets + padding
          const calculatedWidth = (numItems * 180) + 100;
          const windowWidth = typeof window !== 'undefined' ? window.innerWidth - 60 : 800;
          const lineWidth = Math.max(windowWidth, calculatedWidth);

          const artworkFraction = numItems / (numItems + 1);
          const artworkX = artworkFraction * lineWidth;
          const artworkY = getRopeY(artworkFraction);

          // We check the artwork unlock status based on the first booklet on this rope (usually they share the same game)
          const baseGameBookletArt = folhetosData.find(f => f.associatedGameId === booklets[0].associatedGameId);
          const unlockIdToCheckArt = baseGameBookletArt ? baseGameBookletArt.id : booklets[0].id;
          const isArtworkUnlocked = unlockedFolhetos.includes(unlockIdToCheckArt) || animatingUnlockId === unlockIdToCheckArt;

          return (
            <div 
              key={corde.cordeIndex} 
              className="flex flex-col gap-2 border-2 border-[var(--cordel-border)]/20 p-4 bg-[var(--cordel-bg)]/20 rounded relative w-full"
            >
              {/* Corde Label Header */}
              <div className="flex justify-between items-center border-b border-dashed border-[var(--cordel-border)]/15 pb-1">
                <span className="font-cactus text-xs font-black text-[var(--cordel-wood)] uppercase tracking-wider">
                  {lang === 'fr' ? `Corde ${corde.cordeIndex} : ` : `Corda ${corde.cordeIndex} : `}
                  {corde.cordeIndex === 1 ? 'Quiz Pédagogique' :
                   corde.cordeIndex === 2 ? 'Dictée de Blocs' :
                   corde.cordeIndex === 3 ? "L'Inspecteur" :
                   corde.cordeIndex === 4 ? 'Sablier du Mestre' :
                   'Rythme Live'}
                </span>
                <span className="text-[9px] font-bold text-[var(--cordel-text)]/50 tracking-wider">
                  {lang === 'fr' ? `Validation: ${corde.requiredCount} score parfait` : `Validação: ${corde.requiredCount} score perfeito`}
                </span>
              </div>

              {/* Individual Scroll Container for this corde */}
              <div 
                className="w-full overflow-x-auto overflow-y-visible py-4 flex justify-start md:justify-center scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* Dynamic width rope area */}
                <div 
                  className="h-[180px] relative overflow-visible shrink-0 mx-auto"
                  style={{ width: `${lineWidth}px` }}
                >
                  {/* SVG Rope Line */}
                  <svg className="absolute top-4 left-0 h-16 w-full overflow-visible pointer-events-none" viewBox={`0 0 ${lineWidth} 50`} preserveAspectRatio="none">
                    <path d={`M 0,11 Q ${lineWidth/2},51 ${lineWidth},11`} fill="none" stroke="black" strokeWidth="3" strokeOpacity="0.1" />
                    <path d={`M 0,10 Q ${lineWidth/2},50 ${lineWidth},10`} fill="none" stroke="var(--cordel-border)" strokeWidth="2" />
                    <path d={`M 0,11 Q ${lineWidth/2},51 ${lineWidth},11`} fill="none" stroke="var(--cordel-bg)" strokeWidth="1" strokeDasharray="3 3" />
                  </svg>

                  {/* Hanging BOOKLETS (Folhetos) */}
                  {booklets.map((booklet, index) => {
                    const fraction = (index + 1) / (numItems + 1);
                    const bookletX = fraction * lineWidth;
                    const bookletY = getRopeY(fraction);

                    const baseGameBooklet = folhetosData.find(f => f.associatedGameId === booklet.associatedGameId);
                    const unlockIdToCheck = baseGameBooklet ? baseGameBooklet.id : booklet.id;

                    const isUnlocked = unlockedFolhetos.includes(unlockIdToCheck);
                    const isAnimating = animatingUnlockId === unlockIdToCheck;
                    const isGlowing = showGlowEffect === unlockIdToCheck;
                    const activeUnlocked = isUnlocked || isAnimating;

                    return (
                      <div
                        key={booklet.id}
                        style={{
                          position: 'absolute',
                          left: `${bookletX - 55}px`, // Center the 110px wide card
                          top: `${bookletY}px`,
                          width: '110px'
                        }}
                        className="flex flex-col items-center overflow-visible z-10"
                      >
                        {/* Pegador */}
                        <svg className="w-3.5 h-6 text-[#a67c52] filter drop-shadow-[1px_1.5px_1px_rgba(0,0,0,0.3)] z-20 pointer-events-none" viewBox="0 0 10 24">
                          <rect x="3.5" y="0" width="3" height="22" fill="currentColor" rx="0.5" />
                          <circle cx="5" cy="10" r="2" fill="none" stroke="#555" strokeWidth="0.8" />
                        </svg>

                        {/* Booklet Card */}
                        <div
                          onClick={() => handleCardClick(booklet)}
                          className={`w-28 h-36 border-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-2 flex flex-col items-center justify-between relative shadow-[3px_3px_0_var(--cordel-border)] rounded-sm cursor-pointer cordel-folheto-card -mt-1 ${
                            isGlowing ? 'animate-glow-unlock' : ''
                          } ${
                            activeUnlocked 
                              ? 'border-[var(--cordel-border)] opacity-100' 
                              : 'border-[var(--cordel-border)]/40 opacity-40 hover:opacity-50'
                          }`}
                          style={{
                            backgroundColor: activeUnlocked ? '#faf6eb' : 'rgba(100,100,100,0.1)'
                          }}
                        >
                          <div className="absolute inset-1 border border-dashed border-current opacity-20 pointer-events-none" />

                          {/* Stamp animation */}
                          {isAnimating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--cordel-wood)]/5 pointer-events-none z-30 overflow-hidden">
                              <div className="border-2 border-double border-[var(--cordel-wood)] text-[var(--cordel-wood)] font-cactus font-black text-center text-[8px] px-1 py-0.5 rotate-[-12deg] bg-white shadow-lg animate-carimbo">
                                {t.stampCarimbo}
                              </div>
                            </div>
                          )}

                          <span className="font-cactus text-[7px] font-extrabold uppercase text-center tracking-wider line-clamp-2 leading-tight">
                            {booklet.title[lang]}
                          </span>

                          <div className="flex items-center justify-center my-0.5">
                            {activeUnlocked ? (
                              renderWoodcutIllustration(booklet.id, false)
                            ) : (
                              <div className="w-12 h-12 rounded-full border border-dashed border-[var(--cordel-border)]/20 flex items-center justify-center bg-black/5">
                                <Lock className="w-4 h-4 text-[var(--cordel-text)]/40" />
                              </div>
                            )}
                          </div>

                          {activeUnlocked ? (
                            <span className="text-[6px] uppercase tracking-widest font-black text-[var(--cordel-wood)] font-mono animate-pulse">
                              {t.readBtn}
                            </span>
                          ) : (
                            <span className="text-[6px] uppercase tracking-widest font-bold text-[var(--cordel-text)]/40 font-mono">
                              {t.lockedLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Hanging ARTWORK (OeuvreToniBraga) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${artworkX - 55}px`, // Center the 110px wide card
                      top: `${artworkY}px`,
                      width: '110px'
                    }}
                    className="flex flex-col items-center overflow-visible z-10"
                  >
                    {/* Pegador */}
                    <svg className="w-3.5 h-6 text-[#a67c52] filter drop-shadow-[1px_1.5px_1px_rgba(0,0,0,0.3)] z-20 pointer-events-none" viewBox="0 0 10 24">
                      <rect x="3.5" y="0" width="3" height="22" fill="currentColor" rx="0.5" />
                      <circle cx="5" cy="10" r="2" fill="none" stroke="#555" strokeWidth="0.8" />
                    </svg>

                    {/* Artwork Card */}
                    <div
                      onClick={() => handleArtworkClick(corde.cordeIndex, corde.oeuvreToniBraga, getRewardForCorde(corde.cordeIndex, corde.rewardData), isArtworkUnlocked)}
                      className={`w-28 h-36 border-2 bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-2 flex flex-col items-center justify-between relative shadow-[3px_3px_0_var(--cordel-border)] rounded-sm cursor-pointer cordel-folheto-card -mt-1 ${
                        (showGlowEffect === unlockIdToCheckArt) ? 'animate-glow-unlock' : ''
                      } ${
                        isArtworkUnlocked 
                          ? 'border-[var(--cordel-border)] opacity-100' 
                          : 'border-[var(--cordel-border)]/40 opacity-40 hover:opacity-50'
                      }`}
                      style={{
                        backgroundColor: isArtworkUnlocked ? '#fdfaf2' : 'rgba(100,100,100,0.1)'
                      }}
                    >
                      <div className="absolute inset-1 border border-dashed border-current opacity-20 pointer-events-none" />

                      <span className="font-cactus text-[7px] font-extrabold uppercase text-center tracking-wider leading-tight">
                        {t.artTitle}
                      </span>

                      <div className="flex items-center justify-center my-0.5">
                        {isArtworkUnlocked ? (
                          corde.oeuvreToniBraga ? (
                            <img
                              src={corde.oeuvreToniBraga}
                              alt="toni braga reward art"
                              style={{ filter: 'contrast(300%) grayscale(100%)' }}
                              className="w-14 h-14 object-contain border border-[var(--cordel-border)]/30 p-0.5 bg-white"
                            />
                          ) : (
                            <div className="w-14 h-14 border border-dashed border-[var(--cordel-border)]/20 flex items-center justify-center bg-black/5">
                              <HelpCircle className="w-5 h-5 text-[var(--cordel-text)]/40" />
                            </div>
                          )
                        ) : (
                          <div className="w-12 h-12 rounded-full border border-dashed border-[var(--cordel-border)]/20 flex items-center justify-center bg-black/5">
                            <Lock className="w-4 h-4 text-[var(--cordel-text)]/40" />
                          </div>
                        )}
                      </div>

                      {isArtworkUnlocked ? (
                        <span className="text-[6px] uppercase tracking-widest font-black text-[var(--cordel-wood)] font-mono animate-pulse">
                          {t.viewArt}
                        </span>
                      ) : (
                        <span className="text-[6px] uppercase tracking-widest font-bold text-[var(--cordel-text)]/40 font-mono">
                          {t.lockedLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Screen Open Booklet Modal (FolhetoDetail) */}
      {selectedFolheto && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-4 select-text">
          <div 
            className="w-full max-w-2xl bg-[#f4ecd8] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0_#1a1a1a] rounded-sm flex flex-col relative overflow-hidden max-h-[90vh] md:max-h-[85vh] p-4 md:p-6"
            style={{
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.01) 15%, transparent 15%)',
              backgroundSize: '4px 4px',
              filter: 'url(#woodcut-grain)'
            }}
          >
            <div className="absolute inset-2 border-2 border-[#1a1a1a] pointer-events-none" />
            <div className="absolute inset-3 border border-dashed border-[#1a1a1a]/30 pointer-events-none" />

            <div className="flex flex-col items-center justify-center text-center mt-2 border-b-2 border-dashed border-[#1a1a1a]/60 pb-3 z-10">
              <span className="text-[9px] uppercase tracking-widest font-black text-[#8b2a1a] mb-1">
                📖 Literatura de Cordel
              </span>
              <h1 className="font-cactus text-lg md:text-xl font-black uppercase text-[#1a1a1a] max-w-md">
                {selectedFolheto.title[lang]}
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto my-4 pr-2 flex flex-col md:flex-row gap-6 z-10 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
              <div className="flex flex-col items-center justify-center md:w-1/3 shrink-0 py-2">
                <div className="p-3 border-3 border-[#1a1a1a] bg-[#fdfaf2] shadow-[4px_4px_0_#1a1a1a]">
                  {renderWoodcutIllustration(selectedFolheto.id, true)}
                </div>
                <span className="text-[8px] italic uppercase text-[#1a1a1a]/60 mt-3 text-center leading-normal">
                  Xilogravura artesanal <br />
                  O Girador Coleção
                </span>
              </div>

              <div className="flex-1 text-[#1a1a1a] font-serif text-xs md:text-sm leading-relaxed text-justify flex flex-col gap-3">
                {selectedFolheto.culturalContent[lang].split('\n\n').map((paragraph, pIdx) => {
                  if (pIdx === 0) {
                    return (
                      <p key={pIdx} className="first-letter:font-cactus first-letter:text-4xl first-letter:font-black first-letter:float-left first-letter:mr-2 first-letter:text-[#8b2a1a] first-letter:leading-none">
                        {paragraph}
                      </p>
                    );
                  }
                  return <p key={pIdx}>{paragraph}</p>;
                })}
              </div>
            </div>

            <div className="flex justify-center border-t-2 border-dashed border-[#1a1a1a]/60 pt-3 z-10">
              <button
                onClick={() => setSelectedFolheto(null)}
                className="px-6 py-2 bg-[#1a1a1a] text-[#f4ecd8] hover:bg-[#8b2a1a] font-cactus text-xs font-black uppercase border-2 border-[#1a1a1a] transition-all cursor-pointer hover:shadow-inner"
              >
                🪢 {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Open Artwork Reward Modal */}
      {selectedArtwork && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-4 select-text">
          <div 
            className="w-full max-w-lg bg-[#f4ecd8] text-[#1a1a1a] border-4 border-[#1a1a1a] shadow-[8px_8px_0_#1a1a1a] rounded-sm flex flex-col items-center relative overflow-hidden p-6"
            style={{
              backgroundImage: 'radial-gradient(rgba(0,0,0,0.01) 15%, transparent 15%)',
              backgroundSize: '4px 4px',
              filter: 'url(#woodcut-grain)'
            }}
          >
            <div className="absolute inset-2 border-2 border-[#1a1a1a] pointer-events-none" />
            
            <span className="text-[9px] uppercase tracking-widest font-black text-[#8b2a1a] mb-1 mt-2 z-10">
              🎨 {t.artTitle}
            </span>
            <h1 className="font-cactus text-lg font-black uppercase text-[#1a1a1a] text-center mb-4 z-10">
              {lang === 'fr' ? `Récompense de la Corde ${selectedArtwork.cordeIndex}` : `Recompensa da Corda ${selectedArtwork.cordeIndex}`}
            </h1>

            {/* Artwork Image View */}
            <div className="p-4 border-3 border-[#1a1a1a] bg-white shadow-[4px_4px_0_#1a1a1a] mb-6 z-10">
              <img
                src={selectedArtwork.oeuvreToniBraga}
                alt="toni braga high resolution reward"
                className="max-w-[220px] max-h-[220px] object-contain"
              />
            </div>

            {/* Reward data handler (YouTube link, signatory or text) */}
            <div className="z-10 flex flex-col items-center gap-4 w-full">
              {selectedArtwork.rewardData.startsWith('http') ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Vidéo Musicale de Récompense</span>
                  <a
                    href={selectedArtwork.rewardData}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 bg-red-700 text-white font-cactus text-xs font-black uppercase border-2 border-[#1a1a1a] hover:bg-red-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t.viewVideo}
                  </a>
                </div>
              ) : selectedArtwork.cordeIndex === 5 ? (
                /* Diploma signatory style */
                <div className="border-2 border-dashed border-[#1a1a1a] p-4 bg-[#fdfaf2] text-center max-w-sm flex flex-col items-center gap-1">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">📜 {t.diplomaLabel}</span>
                  <p className="font-cactus text-sm text-[#8b2a1a] font-bold leading-normal">
                    Diplôme de Mestre de Bateria <br />
                    validé par
                  </p>
                  <span className="font-cactus text-base font-black text-[#1a1a1a] border-t border-dashed border-[#1a1a1a] pt-1 mt-1 px-4 italic">
                    {selectedArtwork.rewardData}
                  </span>
                </div>
              ) : (
                /* Text reward */
                <div className="border-2 border-dashed border-[#1a1a1a] p-4 bg-[#fdfaf2] text-center max-w-sm">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block mb-1">Message d'Honneur</span>
                  <p className="font-serif text-xs leading-relaxed text-[#8b2a1a] font-bold">
                    "{selectedArtwork.rewardData}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal close */}
            <button
              onClick={() => setSelectedArtwork(null)}
              className="mt-6 px-6 py-2 bg-[#1a1a1a] text-[#f4ecd8] hover:bg-[#8b2a1a] font-cactus text-xs font-black uppercase border-2 border-[#1a1a1a] transition-all cursor-pointer hover:shadow-inner z-10"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
