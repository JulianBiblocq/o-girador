import React, { useMemo, useState, useEffect } from 'react';
import { useGameData } from '../contexts/GameDataContext';
import { Lock, Play, CheckCircle, Award } from 'lucide-react';
import { DiplomaOverlay } from './DiplomaOverlay';
import confetti from 'canvas-confetti';

interface VaralCordelProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  unlockedFolhetos?: string[];
  justUnlockedBookletId?: string | null;
  onClearJustUnlocked?: () => void;
  onLaunchExercise?: (exerciseData: any, cordeIndex: number) => void;
}

export const VaralCordel: React.FC<VaralCordelProps> = ({ lang, onExit, onLaunchExercise }) => {
  const { 
    activeVarals,
    varalConfig, 
    completedExerciseIds, 
    pendingVaralUpdate,
    applyPendingVaralUpdate,
    ignorePendingVaralUpdate,
    setSelectedVaral
  } = useGameData();

  const [viewingList, setViewingList] = useState<boolean>(() => activeVarals.length > 1 && !localStorage.getItem('oGirador_selected_varal_id'));
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDiploma, setShowDiploma] = useState(false);
  const [hasShownDiploma, setHasShownDiploma] = useState(false);
  const [previouslyCompletedCordes, setPreviouslyCompletedCordes] = useState<number[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (activeVarals.length > 1 && !localStorage.getItem('oGirador_selected_varal_id')) {
      setViewingList(true);
    }
  }, [activeVarals]);
  
  // To avoid scrolling repeatedly on the same view, we do it once
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  const isVaralFullyCompleted = useMemo(() => {
    if (!varalConfig?.cordes || varalConfig.cordes.length === 0) return false;
    return varalConfig.cordes.every(corde => {
      const exercises = corde.games && corde.games.length > 0 
        ? corde.games 
        : [{ id: `default_${corde.cordeIndex}` }];
      return exercises.every(ex => completedExerciseIds.includes(ex.id));
    });
  }, [varalConfig, completedExerciseIds]);

  // Trigger confettis and diploma automatically
  useEffect(() => {
    if (!varalConfig?.cordes) return;

    const newlyCompletedCordes: number[] = [];
    varalConfig.cordes.forEach((corde, i) => {
      const exercises = corde.games && corde.games.length > 0 ? corde.games : [{ id: `default_${corde.cordeIndex}` }];
      const isCordeCompleted = exercises.every(ex => completedExerciseIds.includes(ex.id));
      if (isCordeCompleted && !previouslyCompletedCordes.includes(corde.cordeIndex)) {
        newlyCompletedCordes.push(corde.cordeIndex);
      }
    });

    if (newlyCompletedCordes.length > 0) {
      // Fire confetti!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e67e22', '#2ecc71', '#3498db', '#f1c40f']
      });

      setPreviouslyCompletedCordes(prev => [...prev, ...newlyCompletedCordes]);
    }

    if (isVaralFullyCompleted && !hasShownDiploma) {
      setShowDiploma(true);
      setHasShownDiploma(true);
    }
  }, [varalConfig, completedExerciseIds, previouslyCompletedCordes, isVaralFullyCompleted, hasShownDiploma]);

  // Auto-scroll to first unlocked/uncompleted game
  useEffect(() => {
    if (hasAutoScrolled || !containerRef.current) return;
    
    // Slight delay to allow DOM to render
    const timer = setTimeout(() => {
      const firstActiveElement = containerRef.current?.querySelector('.cordel-folheto-card:not(.locked):not(.completed-card)');
      if (firstActiveElement) {
        firstActiveElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      setHasAutoScrolled(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [hasAutoScrolled, completedExerciseIds]);

  if (!varalConfig || !varalConfig.cordes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] cordel-bg text-[var(--cordel-text)]">
        <h2 className="font-cactus text-xl">Loading...</h2>
        <button onClick={onExit} className="mt-4 px-4 py-2 cordel-button">Retour</button>
      </div>
    );
  }

  const t = {
    fr: {
      title: "La Corde à Linge (Varal)",
      subtitle: "Votre progression & défis",
      locked: "Verrouillé",
      play: "Jouer",
      completed: "Complété",
      exitBtn: "Retour"
    },
    pt: {
      title: "Varal de Cordel",
      subtitle: "Sua progressão & desafios",
      locked: "Bloqueado",
      play: "Jogar",
      completed: "Completado",
      exitBtn: "Voltar"
    }
  }[lang];

  if (viewingList && activeVarals.length > 1) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none h-full overflow-y-auto pb-16 custom-scrollbar">
        <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3 shrink-0">
          <div className="flex flex-col">
            <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
              🪢 {lang === 'fr' ? 'Choisissez votre parcours' : 'Escolha seu percurso'}
            </h2>
            <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">
              {lang === 'fr' ? 'Sélectionnez un Varal disponible' : 'Selecione um Varal disponível'}
            </span>
          </div>
          <button
            onClick={onExit}
            className="px-3 py-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase cursor-pointer cordel-button"
          >
            {lang === 'fr' ? 'Retour' : 'Voltar'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
          {activeVarals.map((v) => {
            const ropesCount = v.cordes?.length || 0;
            return (
              <div
                key={v.id || v.name}
                onClick={() => {
                  setSelectedVaral(v);
                  setViewingList(false);
                }}
                className="p-6 border-4 border-[var(--cordel-border)] bg-[#fdfaf2] shadow-lg cursor-pointer transform hover:scale-[1.02] hover:-translate-y-1 transition duration-200 flex flex-col justify-between h-48"
              >
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase font-bold text-[var(--cordel-wood)]">
                    {lang === 'fr' ? 'Parcours' : 'Percurso'}
                  </span>
                  <h3 className="font-cactus text-2xl font-black text-[var(--cordel-text)] line-clamp-2">
                    {v.name || (lang === 'fr' ? 'Varal sans nom' : 'Varal sem nome')}
                  </h3>
                </div>
                <div className="flex justify-between items-center border-t border-dashed border-[var(--cordel-border)]/20 pt-3 mt-auto">
                  <span className="text-xs font-bold opacity-70">
                    🪢 {ropesCount} {ropesCount > 1 ? (lang === 'fr' ? 'Cordes' : 'Cordas') : (lang === 'fr' ? 'Corde' : 'Corda')}
                  </span>
                  <span className="text-xs font-black text-[#e67e22] uppercase tracking-wider">
                    {lang === 'fr' ? 'Commencer' : 'Começar'} →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-5xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none h-full overflow-y-auto pb-16 custom-scrollbar">
      {/* SVG handcarved paper noise filter */}
      <svg className="hidden">
        <defs>
          <filter id="woodcut-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <style>{`
        .cordel-folheto-card {
          filter: url(#woodcut-grain);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cordel-folheto-card:hover:not(.locked) {
          transform: translateY(-4px) rotate(1.5deg);
          box-shadow: 6px 10px 0 var(--cordel-border);
        }
        .cordel-folheto-card.locked {
          opacity: 0.6;
          filter: grayscale(100%) url(#woodcut-grain);
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3 shrink-0">
        <div className="flex flex-col">
          <h2 className="font-cactus text-xl uppercase tracking-wide text-[var(--cordel-text)] font-bold">
            🪢 {t.title}
          </h2>
          <span className="text-[10px] text-[var(--cordel-text)]/70 font-semibold">{t.subtitle}</span>
        </div>
        <div className="flex items-center gap-4">
          {isVaralFullyCompleted && (
            <button
              onClick={() => setShowDiploma(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#e67e22] text-white font-bold text-xs uppercase cursor-pointer cordel-border-sm shadow hover:bg-orange-600 transition animate-pulse"
            >
              <Award className="w-4 h-4" />
              {lang === 'fr' ? 'Mon Diplôme' : 'Meu Diploma'}
            </button>
          )}
          {activeVarals.length > 1 && (
            <button
              onClick={() => setViewingList(true)}
              className="px-3 py-1.5 border-2 border-[var(--cordel-wood)] bg-[var(--cordel-bg)] text-[var(--cordel-wood)] text-xs font-bold uppercase cursor-pointer cordel-button mr-2"
            >
              {lang === 'fr' ? 'Changer de Varal' : 'Mudar de Varal'}
            </button>
          )}
          <button
            onClick={onExit}
            className="px-3 py-1.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase cursor-pointer cordel-button"
          >
            {t.exitBtn}
          </button>
        </div>
      </div>

      {/* Update Banner */}
      {pendingVaralUpdate && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 shrink-0 flex justify-between items-center shadow-md">
          <div>
            <p className="font-bold">{lang === 'fr' ? 'Nouveau parcours disponible !' : 'Novo percurso disponível!'}</p>
            <p className="text-sm">{lang === 'fr' ? 'Votre Mestre a publié une mise à jour.' : 'Seu Mestre publicou uma atualização.'}</p>
          </div>
          <button 
            onClick={() => setShowUpdateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition"
          >
            {lang === 'fr' ? 'Voir les options' : 'Ver opções'}
          </button>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#fdfaf2] border-4 border-[var(--cordel-border)] p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-cactus text-xl font-bold mb-4">
              {lang === 'fr' ? 'Mise à jour du Varal' : 'Atualização do Varal'}
            </h3>
            <p className="mb-6 text-sm opacity-80">
              {lang === 'fr' 
                ? "Votre Mestre a publié un nouveau parcours. Si vous le mettez à jour, votre progression actuelle sera effacée."
                : "Seu Mestre publicou um novo percurso. Se você atualizá-lo, seu progresso atual será apagado."}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  applyPendingVaralUpdate();
                  setShowUpdateModal(false);
                }}
                className="w-full py-3 bg-[#e67e22] text-white font-bold uppercase border-2 border-[var(--cordel-border)] hover:bg-[#d35400] transition"
              >
                {lang === 'fr' ? 'Mettre à jour et recommencer' : 'Atualizar e recomeçar'}
              </button>
              <button 
                onClick={() => {
                  ignorePendingVaralUpdate();
                  setShowUpdateModal(false);
                }}
                className="w-full py-3 bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-bold uppercase border-2 border-[var(--cordel-border)] hover:bg-gray-200 transition"
              >
                {lang === 'fr' ? 'Finir ma progression (Ignorer pour l\'instant)' : 'Terminar meu progresso (Ignorar por enquanto)'}
              </button>
              <button 
                onClick={() => setShowUpdateModal(false)}
                className="mt-2 text-sm underline opacity-60 hover:opacity-100"
              >
                {lang === 'fr' ? 'Fermer' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cordes */}
      <div className="flex-grow flex flex-col gap-6">
        {varalConfig.cordes.map((corde) => {
          // Fallback to 1 default game if games array is empty or undefined
          const exercises = corde.games && corde.games.length > 0 
            ? corde.games 
            : [{
                id: `default_${varalConfig.id || varalConfig.name || 'default'}_${corde.cordeIndex}`,
                module: corde.gameType || 'quiz',
                folheto_titre: `Défi par défaut Corde ${corde.cordeIndex}`
              }];

          const isCordeCompleted = exercises.every(ex => completedExerciseIds.includes(ex.id));

          return (
            <div key={corde.cordeIndex} className="flex flex-col gap-2 border-2 border-[var(--cordel-border)]/20 p-4 bg-[var(--cordel-bg)]/20 rounded relative w-full">
              <div className="flex justify-between items-center border-b border-dashed border-[var(--cordel-border)]/15 pb-1">
                <span className="font-cactus text-sm font-black text-[var(--cordel-wood)] uppercase tracking-wider">
                  {lang === 'fr' ? `Corde ${corde.cordeIndex}` : `Corda ${corde.cordeIndex}`}
                </span>
                {isCordeCompleted && (
                  <span className="text-[10px] font-bold text-green-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {t.completed}
                  </span>
                )}
              </div>

              {/* Ligne pointillée horizontale simulant la corde */}
              <div className="absolute top-[80px] left-0 right-0 h-0 border-t-2 border-dashed border-[var(--cordel-border)]/40 pointer-events-none" />

              <div className="flex items-center gap-8 overflow-x-auto py-6 scrollbar-thin scrollbar-thumb-[var(--cordel-wood)] px-4">
                {exercises.map((ex, idx) => {
                  const isCompleted = completedExerciseIds.includes(ex.id);
                  // L'exercice est débloqué si c'est le premier (idx=0) ou si le précédent est complété
                  const prevExId = idx > 0 ? exercises[idx-1].id : null;
                  const isUnlocked = idx === 0 || (prevExId && completedExerciseIds.includes(prevExId));
                  const isLocked = !isUnlocked;

                  return (
                    <div 
                      key={ex.id}
                      onClick={() => {
                        if (isUnlocked && onLaunchExercise) {
                          onLaunchExercise(ex, corde.cordeIndex);
                        }
                      }}
                      className={`cordel-folheto-card w-40 h-48 shrink-0 flex flex-col items-center justify-center p-3 border-4 border-[var(--cordel-border)] relative cursor-pointer z-10
                        ${isCompleted ? 'completed-card bg-[#fdfaf2]' : isLocked ? 'locked bg-[#e0dcd3]' : 'bg-[#fdfaf2] shadow-lg border-[var(--cordel-wood)] animate-pulse-slow'}
                      `}
                    >
                      {/* Rope string attachment point */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-6 border-2 border-[var(--cordel-border)] rounded-full border-b-0" />
                      
                      <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
                        {isCompleted ? (
                          <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                        ) : isLocked ? (
                          <Lock className="w-8 h-8 text-[var(--cordel-border)]/50 mb-2" />
                        ) : (
                          <Play className="w-8 h-8 text-[var(--cordel-wood)] mb-2" />
                        )}
                        
                        <h3 className="font-cactus font-bold text-sm text-[var(--cordel-text)] uppercase leading-tight line-clamp-3">
                          {ex.folheto_titre || `Exercice ${idx + 1}`}
                        </h3>
                        <div className="mt-1 text-[10px] uppercase font-bold opacity-50 bg-[var(--cordel-text)] text-[var(--cordel-bg)] px-1">
                          {ex.module.replace('_', ' ')}
                        </div>
                        
                        <div className="mt-auto pt-2 text-[10px] font-bold opacity-80">
                          {isCompleted ? (
                             <span className="text-green-700">{t.completed}</span>
                          ) : isLocked ? (
                             <span className="text-red-800">{t.locked}</span>
                          ) : (
                             <span className="text-[#e67e22] animate-pulse">{t.play}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Reward / Art at the end of the corde */}
                {(corde.reward || corde.oeuvreToniBraga) && (
                  <div 
                    onClick={() => {
                      if (!isCordeCompleted) return;
                      const reward = corde.reward;
                      if (!reward) {
                        // Legacy
                        if (corde.rewardData?.startsWith('http')) window.open(corde.rewardData, '_blank');
                        return;
                      }

                      if (reward.type === 'video' || reward.type === 'pdf') {
                        if (reward.url) window.open(reward.url, '_blank');
                      } else if (reward.type === 'json') {
                        // Téléchargement du JSON
                        if (reward.jsonContent) {
                          const blob = new Blob([JSON.stringify(reward.jsonContent, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `recompense_corde_${corde.cordeIndex}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }
                      }
                    }}
                    className={`cordel-folheto-card w-40 h-48 shrink-0 p-1 border-4 border-[var(--cordel-border)] relative z-10 ${isCordeCompleted ? 'cursor-pointer bg-[#fdfaf2]' : 'locked bg-[#e0dcd3] cursor-not-allowed'}`}
                  >
                     {/* Rope string attachment point */}
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-6 border-2 border-[var(--cordel-border)] rounded-full border-b-0" />
                     
                     <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden border-2 border-dashed border-[var(--cordel-border)]/20 p-1 text-center">
                       {isCordeCompleted ? (
                         <>
                           {(!corde.reward || corde.reward.type === 'image') && (corde.reward?.base64 || corde.oeuvreToniBraga) ? (
                             <img src={corde.reward?.base64 || corde.oeuvreToniBraga} alt="Oeuvre" className="w-full h-full object-cover" />
                           ) : corde.reward?.type === 'video' ? (
                             <div className="flex flex-col items-center text-[var(--cordel-wood)]">
                               <Play className="w-8 h-8 mb-2" />
                               <span className="text-[10px] font-bold uppercase">{lang === 'fr' ? 'Voir la vidéo' : 'Ver vídeo'}</span>
                             </div>
                           ) : corde.reward?.type === 'pdf' ? (
                             <div className="flex flex-col items-center text-[var(--cordel-wood)]">
                               <CheckCircle className="w-8 h-8 mb-2" />
                               <span className="text-[10px] font-bold uppercase">{lang === 'fr' ? 'Ouvrir PDF' : 'Abrir PDF'}</span>
                             </div>
                           ) : corde.reward?.type === 'json' ? (
                             <div className="flex flex-col items-center text-[var(--cordel-wood)]">
                               <CheckCircle className="w-8 h-8 mb-2" />
                               <span className="text-[10px] font-bold uppercase">{lang === 'fr' ? 'Télécharger JSON' : 'Baixar JSON'}</span>
                             </div>
                           ) : (
                             <div className="flex flex-col items-center text-[var(--cordel-wood)]">
                               <CheckCircle className="w-8 h-8 mb-2" />
                               <span className="text-[10px] font-bold uppercase">{lang === 'fr' ? 'Récompense' : 'Recompensa'}</span>
                             </div>
                           )}
                         </>
                       ) : (
                         <div className="flex flex-col items-center opacity-50">
                           <Lock className="w-6 h-6 mb-2" />
                           <span className="text-[10px] font-bold uppercase text-center">{lang === 'fr' ? 'Récompense Bloquée' : 'Recompensa Bloqueada'}</span>
                         </div>
                       )}
                     </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showDiploma && (
        <DiplomaOverlay lang={lang} onClose={() => setShowDiploma(false)} />
      )}
    </div>
  );
};
