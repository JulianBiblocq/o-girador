
import { useState } from 'react';

interface FeedbackSubmitParams {
  lang: 'fr' | 'pt';
  alertAsync: (msg: string) => Promise<void> | void;
  userProfile: any;
  t: {
    requiredRatings: string;
    success: string;
    error: string;
  };
}

export function useFeedbackSubmit({ lang, alertAsync, userProfile, t }: FeedbackSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitFeedback = async (
    comment: string,
    audioRating: number,
    usabilityRating: number,
    onSuccess: () => void
  ) => {
    if (audioRating === 0 || usabilityRating === 0) {
      alertAsync(t.requiredRatings);
      return;
    }

    const lastSubmit = localStorage.getItem('ogirador_last_feedback_date');
    const today = new Date().toISOString().split('T')[0];
    if (lastSubmit === today) {
      alertAsync(lang === 'pt' ? 'Você já enviou um feedback hoje. Obrigado!' : "Vous avez déjà envoyé un feedback aujourd'hui. Merci !");
      return;
    }

    setIsSubmitting(true);
    try {
      const globalRating = Math.min(audioRating, usabilityRating);
      const collectionType = globalRating >= 4 ? 'review' : 'ticket';

      const payload = {
        collectionType,
        data: {
          appSource: 'sequenceur',
          appVersion: '4.0.5',
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          audioRating,
          usabilityRating,
          globalRating,
          comment,
          createdAt: new Date().toISOString(),
          userId: userProfile?.uid || 'anonymous',
          userEmail: userProfile?.email || 'anonymous',
          userName: userProfile?.displayName || 'anonymous',
        },
      };

      const hubUrl = import.meta.env.VITE_OGIRADOR_HUB_URL;
      if (!hubUrl) {
        throw new Error("Impossible d'envoyer le feedback : l'URL du Hub n'est pas configurée.");
      }
      const apiKey = import.meta.env.VITE_OGIRADOR_HUB_API_KEY || '';

      const response = await fetch(hubUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Hub API request failed');

      localStorage.setItem('ogirador_last_feedback_date', today);
      alertAsync(t.success);
      onSuccess();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alertAsync(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submitFeedback };
}
