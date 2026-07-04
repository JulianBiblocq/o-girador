import { useState, useEffect, useRef } from 'react';
import { QuizQuestion, quizQuestions } from '../data/quizQuestions';

interface UseQuizGameProps {
  lang: 'fr' | 'pt';
  onSuccess?: () => void;
  exerciseData?: any;
}

export function useQuizGame({ lang, onSuccess, exerciseData }: UseQuizGameProps) {
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>(() => {
    if (exerciseData && exerciseData.questions) {
      return exerciseData.questions;
    }
    return quizQuestions;
  });
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop audio and restore selected option when question changes
  useEffect(() => {
    stopAudio();
    setSelectedOption(userAnswers[currentQuestions[currentIndex]?.id] || null);
  }, [currentIndex, currentQuestions]);

  // Handle onSuccess trigger when quiz is finished
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

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const baseUrl = (import.meta as any).env.BASE_URL || '/';
    const fullUrl = `${baseUrl}${url}`.replace(/\/+/g, '/');
    
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

  return {
    currentQuestions,
    currentIndex,
    selectedOption,
    userAnswers,
    isFinished,
    isPlayingAudio,
    activeQuestion,
    playAudio,
    stopAudio,
    handleOptionSelect,
    handleNext,
    handleBack,
    getScore,
    getFailedQuestions,
    handleRetryErrors,
    handleRestartAll,
  };
}
