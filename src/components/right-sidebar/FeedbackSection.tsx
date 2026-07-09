import React, { useState, useRef } from 'react';
import { Share2 } from 'lucide-react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const MandacaruIcon: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full select-none pointer-events-none">
    {/* Soil / ground line at the bottom */}
    <path d="M 15 88 Q 50 85, 85 88" className="mandala-details" stroke="currentColor" strokeWidth="3" fill="none" />
    
    {/* Main cactus path (body + arms) */}
    <path 
      d="
        M 46 88 
        L 46 72 
        C 32 72, 26 65, 26 50 
        C 26 42, 32 42, 33 42 
        C 36 42, 36 48, 36 50 
        C 36 60, 40 64, 46 64 
        L 46 30 
        C 46 22, 54 22, 54 30 
        L 54 52 
        C 60 52, 64 48, 64 38 
        C 64 32, 70 32, 72 32 
        C 74 32, 74 38, 74 38 
        C 74 58, 68 62, 54 62 
        L 54 88 
        Z
      "
      className="mandala-bg"
    />
    
    {/* Inner ribs (lines following the contours of trunk and arms) */}
    {/* Main stem rib */}
    <path d="M 50 26 L 50 86" className="mandala-details" strokeDasharray="3 3" />
    {/* Left arm rib */}
    <path d="M 31 43 C 31 52, 33 62, 45 68" className="mandala-details" />
    {/* Right arm rib */}
    <path d="M 69 33 C 69 45, 68 53, 53 57" className="mandala-details" />

    {/* Thorns (small crossed strokes) */}
    {/* Top thorn */}
    <path d="M 50 18 L 50 22 M 48 20 L 52 20" className="mandala-details" />
    {/* Left arm thorns */}
    <path d="M 22 46 L 26 50 M 26 46 L 22 50" className="mandala-details" />
    <path d="M 28 60 L 32 64 M 32 60 L 28 64" className="mandala-details" />
    {/* Right arm thorns */}
    <path d="M 72 35 L 76 39 M 76 35 L 72 39" className="mandala-details" />
    <path d="M 68 47 L 72 51 M 72 47 L 68 51" className="mandala-details" />
    {/* Main trunk thorns */}
    <path d="M 40 40 L 44 44 M 44 40 L 40 44" className="mandala-details" />
    <path d="M 60 70 L 64 74 M 64 70 L 60 74" className="mandala-details" />
  </svg>
);

interface RatingGroupProps {
  label: string;
  onChange: (rating: number) => void;
}

const RatingGroup: React.FC<RatingGroupProps> = ({ label, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRatingRef = useRef<number>(0);

  const handleClick = (rating: number) => {
    currentRatingRef.current = rating;
    onChange(rating);
    const container = containerRef.current;
    if (container) {
      const mandalas = container.querySelectorAll('.xilo-mandala');
      mandalas.forEach((el) => {
        const idx = parseInt(el.getAttribute('data-index') || '0');
        if (idx <= rating) {
          el.classList.add('is-active');
        } else {
          el.classList.remove('is-active');
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-1.5 my-2">
      <span className="text-xs font-bold text-[var(--cordel-border,#1a1a1a)] font-cactus tracking-wide uppercase">
        {label}
      </span>
      {/* Reverse DOM order to allow pure CSS hover selectors to highlight previous siblings */}
      <div ref={containerRef} className="xilo-rating-group">
        {[5, 4, 3, 2, 1].map((num) => (
          <div
            key={num}
            data-index={num}
            onClick={() => handleClick(num)}
            className="xilo-mandala"
            title={`${num} / 5`}
          >
            <MandacaruIcon />
          </div>
        ))}
      </div>
    </div>
  );
};

export const FeedbackSection: React.FC = () => {
  const sequencer = useSequencer();
  const audio = useAudio();
  const { userProfile } = useAuth();
  
  const lang = sequencer.lang;
  const alertAsync = sequencer.alertAsync;
  const handleShare = audio.handleShare;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRatingRef = useRef<number>(0);
  const usabilityRatingRef = useRef<number>(0);

  // Localization dict
  const t = {
    fr: {
      title: "💬 Note & Avis",
      audioLabel: "Performance Audio",
      usabilityLabel: "Maniabilité",
      commentPlaceholder: "Votre avis, suggestions ou bugs rencontrés...",
      sendBtn: "Graver & Envoyer",
      sending: "Gravure en cours...",
      shareBtn: "Partager l'application",
      requiredRatings: "Veuillez évaluer les deux critères (Performance et Maniabilité).",
      success: "Merci beaucoup pour votre retour !",
      error: "Erreur lors de l'envoi du feedback. Veuillez réessayer.",
    },
    pt: {
      title: "💬 Nota & Opinião",
      audioLabel: "Performance Áudio",
      usabilityLabel: "Maniabilidade",
      commentPlaceholder: "Sua opinião, sugestões ou bugs encontrados...",
      sendBtn: "Gravar & Enviar",
      sending: "Gravando...",
      shareBtn: "Compartilhar o aplicativo",
      requiredRatings: "Por favor, avalie os dois critérios (Performance e Maniabilidade).",
      success: "Muito obrigado pelo seu feedback!",
      error: "Erro ao enviar o feedback. Tente novamente.",
    }
  }[lang === 'pt' ? 'pt' : 'fr'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const comment = textareaRef.current?.value || '';
    const audioRating = audioRatingRef.current;
    const usabilityRating = usabilityRatingRef.current;

    if (audioRating === 0 || usabilityRating === 0) {
      alertAsync(t.requiredRatings);
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        audioRating,
        usabilityRating,
        comment,
        createdAt: new Date().toISOString(),
        userId: userProfile?.uid || 'anonymous',
        userEmail: userProfile?.email || 'anonymous',
        userName: userProfile?.displayName || 'anonymous',
      });

      alertAsync(t.success);

      // Reset inputs & direct DOM states
      if (textareaRef.current) textareaRef.current.value = '';
      audioRatingRef.current = 0;
      usabilityRatingRef.current = 0;
      
      const activeMandalas = document.querySelectorAll('.xilo-mandala.is-active');
      activeMandalas.forEach((el) => el.classList.remove('is-active'));

    } catch (err) {
      console.error('Error submitting feedback:', err);
      alertAsync(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
      <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-2 shrink-0">
        {t.title}
      </span>
      
      <div className="xilo-feedback-container flex flex-col gap-3">
        {/* Rating groups with 0 React renders on select */}
        <RatingGroup 
          label={t.audioLabel} 
          onChange={(r) => { audioRatingRef.current = r; }} 
        />
        <RatingGroup 
          label={t.usabilityLabel} 
          onChange={(r) => { usabilityRatingRef.current = r; }} 
        />

        {/* Uncontrolled Textarea with paper bg & irregular border */}
        <div className="flex flex-col gap-1.5 mt-2">
          <textarea
            ref={textareaRef}
            placeholder={t.commentPlaceholder}
            rows={4}
            maxLength={1000}
            className="xilo-textarea"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3.5 mt-3">
          {/* Submit button: Wood block styling */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="xilo-submit-btn font-cactus font-bold"
          >
            <span>{isSubmitting ? t.sending : t.sendBtn}</span>
          </button>

          {/* Share button: Replicates the main menu's graphism (same red color & padding) */}
          <button
            onClick={() => { if (handleShare) handleShare(); }}
            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-[#8b2a1a] text-[#f4ecd8] cordel-border-sm text-xs font-bold font-cactus hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors cursor-pointer w-full"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t.shareBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
