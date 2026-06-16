import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, Award, CheckCircle, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { QuizQuestion, quizQuestions } from '../data/quizQuestions';

interface QuizEngineProps {
  lang: 'fr' | 'pt';
  onExit: () => void;
  onSuccess?: () => void;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({ lang, onExit, onSuccess }) => {
  // Lists of questions
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>(quizQuestions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const [isFinished, setIsFinished] = useState<boolean>(false);

  useEffect(() => {
    if (isFinished) {
      const score = currentQuestions.reduce((acc, q) => {
        return acc + (userAnswers[q.id] === q.correctAnswer[lang] ? 1 : 0);
      }, 0);
      if (score === currentQuestions.length) {
        onSuccess?.();
      }
    }
  }, [isFinished, userAnswers, currentQuestions, lang, onSuccess]);
  
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount or index change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Stop audio whenever question changes
    stopAudio();
    setSelectedOption(userAnswers[currentQuestions[currentIndex]?.id] || null);
  }, [currentIndex, currentQuestions]);

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Ensure base URL prefix is present
    const baseUrl = (import.meta as any).env.BASE_URL || '/';
    const fullUrl = `${baseUrl}${url}`.replace(/\/+/g, '/'); // remove double slashes
    
    const audio = new Audio(fullUrl);
    audioRef.current = audio;
    setIsPlayingAudio(true);
    
    audio.play().catch((err) => {
      console.warn("Audio playback blocked or failed:", err);
      setIsPlayingAudio(false);
    });

    audio.onended = () => {
      setIsPlayingAudio(false);
    };
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  };

  const activeQuestion = currentQuestions[currentIndex];

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (!selectedOption || !activeQuestion) return;

    // Save answer
    setUserAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: selectedOption,
    }));

    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Score Calculation
  const getScore = () => {
    let score = 0;
    currentQuestions.forEach((q) => {
      const answer = userAnswers[q.id];
      const correct = q.correctAnswer[lang];
      if (answer === correct) {
        score++;
      }
    });
    return score;
  };

  const getFailedQuestions = () => {
    return currentQuestions.filter((q) => {
      const answer = userAnswers[q.id];
      const correct = q.correctAnswer[lang];
      return answer !== correct;
    });
  };

  const handleRetryErrors = () => {
    const failed = getFailedQuestions();
    if (failed.length > 0) {
      setCurrentQuestions(failed);
      setCurrentIndex(0);
      setSelectedOption(null);
      setUserAnswers({});
      setIsFinished(false);
    }
  };

  const handleRestartAll = () => {
    setCurrentQuestions(quizQuestions);
    setCurrentIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setIsFinished(false);
  };

  // Translations dictionary inside component for simple clean design
  const t = {
    fr: {
      quizTitle: "Testez votre oreille & vos yeux",
      questionLabel: "Question",
      of: "sur",
      next: "Suivant",
      back: "Retour",
      validate: "Terminer",
      listen: "Écouter le son",
      stop: "Arrêter",
      results: "Bilan du test",
      score: "Votre score",
      retryErrors: "Refaire les erreurs",
      restartAll: "Recommencer le quiz",
      returnToSeq: "Retour au séquenceur",
      correct: "Correct",
      incorrect: "Incorrect",
      yourAnswer: "Votre réponse :",
      correctAnswer: "Bonne réponse :",
      allCorrect: "Félicitations ! Aucun défaut dans votre maracatu !",
      someErrors: "Pas mal ! Encore un peu d'entraînement pour caler le rythme.",
      noErrorsToRetry: "Toutes les réponses sont correctes ! Vous pouvez recommencer le quiz complet.",
    },
    pt: {
      quizTitle: "Teste seu ouvido & seus olhos",
      questionLabel: "Pergunta",
      of: "de",
      next: "Seguinte",
      back: "Voltar",
      validate: "Terminar",
      listen: "Escutar o som",
      stop: "Parar",
      results: "Balanço do teste",
      score: "Seu placar",
      retryErrors: "Refazer erros",
      restartAll: "Recomeçar o quiz",
      returnToSeq: "Voltar ao sequenciador",
      correct: "Correto",
      incorrect: "Incorreto",
      yourAnswer: "Sua resposta:",
      correctAnswer: "Resposta correta:",
      allCorrect: "Parabéns! Nenhuma falha no seu maracatu!",
      someErrors: "Muito bem! Mais um pouco de treino para acertar o baque.",
      noErrorsToRetry: "Todas as respostas estão corretas! Você pode recomeçar o quiz completo.",
    }
  }[lang];

  // Render Finished/Bilan Screen
  if (isFinished) {
    const score = getScore();
    const total = currentQuestions.length;
    const failed = getFailedQuestions();
    
    return (
      <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4">
        {/* Banner header style cordel */}
        <div className="text-center py-4 border-b-4 border-[var(--cordel-border)]">
          <h2 className="font-cactus text-3xl uppercase tracking-wider text-[var(--cordel-text)] font-extrabold flex items-center justify-center gap-2">
            <Award className="w-8 h-8 text-[var(--cordel-wood)]" /> {t.results}
          </h2>
        </div>

        {/* Score display */}
        <div className="flex flex-col items-center justify-center p-6 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] cordel-border">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--cordel-text)]/70">{t.score}</span>
          <span className="font-cactus text-6xl font-black text-[var(--cordel-wood)] my-2">
            {score} / {total}
          </span>
          <p className="text-center font-cactus text-sm text-[var(--cordel-text)] mt-2">
            {score === total ? t.allCorrect : t.someErrors}
          </p>
        </div>

        {/* Answers detailed list */}
        <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
          {currentQuestions.map((q, idx) => {
            const userAnswer = userAnswers[q.id];
            const correctAnswer = q.correctAnswer[lang];
            const isCorrect = userAnswer === correctAnswer;
            
            return (
              <div 
                key={q.id}
                className={`p-3 border-2 border-[var(--cordel-border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[var(--cordel-bg)] relative ${
                  isCorrect ? 'border-green-600/50' : 'border-[var(--cordel-wood)]/50'
                }`}
              >
                {/* Visual stamp on the right */}
                <div className={`absolute top-2 right-2 md:relative md:top-0 md:right-0 px-2 py-0.5 text-[10px] font-bold uppercase border-2 rounded pointer-events-none rotate-[-4deg] ${
                  isCorrect 
                    ? 'border-green-600 text-green-600 bg-green-50/10' 
                    : 'border-[var(--cordel-wood)] text-[var(--cordel-wood)] bg-red-50/10'
                }`}>
                  {isCorrect ? t.correct : t.incorrect}
                </div>

                <div className="flex flex-col gap-1 pr-16 md:pr-0">
                  <span className="text-xs font-bold text-[var(--cordel-text)]/80">
                    Q{idx + 1}. {q.questionText[lang]}
                  </span>
                  <div className="text-xs flex flex-col gap-0.5">
                    <span>
                      {t.yourAnswer} <b className={isCorrect ? 'text-green-600' : 'text-[var(--cordel-wood)] font-bold'}>{userAnswer || '-'}</b>
                    </span>
                    {!isCorrect && (
                      <span className="text-[var(--cordel-text)]/70">
                        {t.correctAnswer} <b className="text-green-600">{correctAnswer}</b>
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional mini-play button for auditif review */}
                {q.type === 'audio' && (
                  <button 
                    onClick={() => playAudio(q.mediaUrl)}
                    className="p-2 border border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] rounded transition-colors self-end md:self-auto cursor-pointer"
                    title={t.listen}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t-2 border-[var(--cordel-border)]">
          {failed.length > 0 ? (
            <button
              onClick={handleRetryErrors}
              className="px-4 py-3 bg-[var(--cordel-wood)] text-white font-cactus text-sm font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 active:translate-y-0.5"
            >
              <RotateCcw className="w-4 h-4" /> {t.retryErrors} ({failed.length})
            </button>
          ) : (
            <div className="text-xs text-center text-[var(--cordel-text)]/60 p-3 border border-dashed border-[var(--cordel-border)]/30 flex items-center justify-center">
              {t.noErrorsToRetry}
            </div>
          )}

          <button
            onClick={handleRestartAll}
            className="px-4 py-3 bg-[var(--cordel-bg)] text-[var(--cordel-text)] font-cactus text-sm font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] active:translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" /> {t.restartAll}
          </button>

          <button
            onClick={onExit}
            className="px-4 py-3 bg-neutral-800 text-white font-cactus text-sm font-bold uppercase cordel-border cursor-pointer flex items-center justify-center gap-2 hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] active:translate-y-0.5"
          >
            {t.returnToSeq}
          </button>
        </div>
      </div>
    );
  }

  // Render Active Question Screen
  return (
    <div className="w-full max-w-xl mx-auto p-4 flex flex-col gap-6 cordel-bg select-none my-4">
      {/* Quiz Progress Header */}
      <div className="flex items-center justify-between border-b-4 border-[var(--cordel-border)] pb-3">
        <h2 className="font-cactus text-lg uppercase tracking-wide text-[var(--cordel-text)] font-bold">
          📖 {t.quizTitle}
        </h2>
        <span className="text-xs font-bold font-mono px-2 py-1 bg-[var(--cordel-text)] text-[var(--cordel-bg)] cordel-border-sm">
          {t.questionLabel} {currentIndex + 1} {t.of} {currentQuestions.length}
        </span>
      </div>

      {/* Main Question Display Box */}
      <div className="flex flex-col items-center justify-center p-6 border-3 border-[var(--cordel-border)] bg-[var(--cordel-bg)] cordel-border min-h-[180px] relative">
        <p className="text-center font-cactus text-base font-bold text-[var(--cordel-text)] mb-6 max-w-md">
          {activeQuestion.questionText[lang]}
        </p>

        {/* Question Content (Audio Player or Image Illustration) */}
        {activeQuestion.type === 'audio' ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => isPlayingAudio ? stopAudio() : playAudio(activeQuestion.mediaUrl)}
              className={`w-20 h-20 rounded-full border-4 border-[var(--cordel-border)] flex items-center justify-center shadow-[4px_4px_0_var(--cordel-border)] transition-transform duration-100 cursor-pointer ${
                isPlayingAudio 
                  ? 'bg-[var(--cordel-wood)] text-white animate-pulse' 
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
            >
              {isPlayingAudio ? (
                <Square className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--cordel-text)]/60 mt-1">
              {isPlayingAudio ? t.stop : t.listen}
            </span>
          </div>
        ) : (
          <div className="w-32 h-32 p-3 border-2 border-[var(--cordel-border)] bg-white/5 cordel-border-sm flex items-center justify-center overflow-hidden">
            <img
              src={`${(import.meta as any).env.BASE_URL || '/'}${activeQuestion.mediaUrl}`}
              alt="Question Illustration"
              className="w-full h-full object-contain filter invert opacity-90"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Choice Options Grid (Style Xilogravura / stamp inked) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeQuestion.options[lang].map((option, idx) => {
          const isSelected = selectedOption === option;
          
          return (
            <button
              key={idx}
              onClick={() => handleOptionSelect(option)}
              className={`relative overflow-hidden p-4 text-left font-cactus text-sm font-bold border-3 transition-all duration-150 cursor-pointer min-h-[70px] flex items-center justify-between ${
                isSelected
                  ? 'bg-[var(--cordel-wood)] text-white border-[var(--cordel-border)] rotate-[-1deg] scale-[0.98] shadow-none translate-x-[2px] translate-y-[2px]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cordel-border'
              }`}
            >
              <div className="flex items-center gap-3 z-10">
                <span className="text-xs px-2 py-0.5 border border-current rounded-sm">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </div>

              {/* Inked Stamp Overlay Badge */}
              {isSelected && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none select-none z-0 rotate-[-12deg] opacity-20 border-2 border-dashed border-white text-white rounded px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase">
                  {lang === 'fr' ? 'SÉLEC' : 'SELEC'}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="flex items-center justify-between border-t-2 border-[var(--cordel-border)] pt-4 mt-2">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="px-4 py-2 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] text-[var(--cordel-text)] text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] active:translate-y-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t.back}
        </button>

        <button
          onClick={handleNext}
          disabled={!selectedOption}
          className="px-5 py-2.5 bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-2 border-[var(--cordel-text)] text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-95 active:translate-y-0.5"
        >
          {currentIndex === currentQuestions.length - 1 ? t.validate : t.next} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
