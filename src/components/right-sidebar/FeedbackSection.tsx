/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Share2 } from 'lucide-react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAuth } from '../../contexts/AuthContext';
import { MandacaruRatingGroup } from './feedback/MandacaruRatingGroup';
import { useFeedbackSubmit } from './feedback/useFeedbackSubmit';

export const FeedbackSection: React.FC = () => {
  const sequencer = useSequencer();
  const { userProfile } = useAuth();

  const lang = sequencer.lang;
  const alertAsync = sequencer.alertAsync;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRatingRef = useRef<number>(0);
  const usabilityRatingRef = useRef<number>(0);

  const t = {
    fr: {
      title: '💬 Note & Avis',
      audioLabel: 'Performance Audio',
      usabilityLabel: 'Maniabilité',
      commentPlaceholder: 'Votre avis, suggestions ou bugs rencontrés...',
      sendBtn: 'Graver & Envoyer',
      sending: 'Gravure en cours...',
      shareBtn: "Partager l'application",
      requiredRatings: 'Veuillez évaluer les deux critères (Performance et Maniabilité).',
      success: 'Merci beaucoup pour votre retour !',
      error: "Erreur lors de l'envoi du feedback. Veuillez réessayer.",
    },
    pt: {
      title: '💬 Nota & Opinião',
      audioLabel: 'Performance Áudio',
      usabilityLabel: 'Maniabilidade',
      commentPlaceholder: 'Sua opinião, sugestões ou bugs encontrados...',
      sendBtn: 'Gravar & Enviar',
      sending: 'Gravando...',
      shareBtn: 'Compartilhar o aplicativo',
      requiredRatings: 'Por favor, avalie os dois critérios (Performance e Maniabilidade).',
      success: 'Muito obrigado pelo seu feedback!',
      error: 'Erro ao enviar o feedback. Tente novamente.',
    },
  }[lang === 'pt' ? 'pt' : 'fr'];

  const { isSubmitting, submitFeedback } = useFeedbackSubmit({
    lang,
    alertAsync,
    userProfile,
    t,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFeedback(
      textareaRef.current?.value || '',
      audioRatingRef.current,
      usabilityRatingRef.current,
      () => {
        if (textareaRef.current) textareaRef.current.value = '';
        audioRatingRef.current = 0;
        usabilityRatingRef.current = 0;
        const activeMandalas = document.querySelectorAll('.xilo-mandala.is-active');
        activeMandalas.forEach((el) => el.classList.remove('is-active'));
      }
    );
  };

  return (
    <div className="flex flex-col flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0">
      <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus mb-2 shrink-0">
        {t.title}
      </span>

      <div className="xilo-feedback-container flex flex-col gap-3">
        <MandacaruRatingGroup label={t.audioLabel} onChange={(r) => { audioRatingRef.current = r; }} />
        <MandacaruRatingGroup label={t.usabilityLabel} onChange={(r) => { usabilityRatingRef.current = r; }} />

        <div className="flex flex-col gap-1.5 mt-2">
          <textarea
            ref={textareaRef}
            placeholder={t.commentPlaceholder}
            rows={4}
            maxLength={1000}
            className="xilo-textarea"
          />
        </div>

        <div className="flex flex-col gap-3.5 mt-3">
          <button onClick={handleSubmit} disabled={isSubmitting} className="xilo-submit-btn font-cactus font-bold">
            <span>{isSubmitting ? t.sending : t.sendBtn}</span>
          </button>

          <button
            onClick={async () => {
              const textStr = lang === 'pt'
                ? 'Descubra O Girador, o sequenciador interativo de Maracatu! https://sequenciador.o-girador.com'
                : 'Découvrez O Girador, le séquenceur de Maracatu interactif ! https://sequenciador.o-girador.com';
              try {
                await navigator.clipboard.writeText(textStr);
                alertAsync(lang === 'pt' ? 'Link copiado para a área de transferência!' : 'Lien copié dans le presse-papier !');
              } catch (err) {
                console.error('Clipboard write failed:', err);
              }
            }}
            className="flex-1 px-3 py-2 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-[var(--cordel-border)] shadow-[3px_3px_0_var(--cordel-border)] text-[10px] md:text-xs font-bold font-cactus uppercase hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t.shareBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
