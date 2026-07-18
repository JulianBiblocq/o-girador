import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Language } from '../../types';

export interface QuizQuestionStudio {
  id: string;
  type: 'image' | 'audio';
  questionTextFr: string;
  questionTextPt: string;
  mediaUrl: string;
  mediaFile: string; // Base64
  optionsFr: string[];
  optionsPt: string[];
  correctIndex: number;
  explanationFr: string;
  explanationPt: string;
}

interface QuizTabProps {
  lang: Language;
  quizTitle: string;
  setQuizTitle: (val: string) => void;
  quizRewardText: string;
  setQuizRewardText: (val: string) => void;
  quizQuestions: QuizQuestionStudio[];
  onLoadDraft: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addQuestion: () => void;
  removeQuestion: (index: number) => void;
  updateQuestionField: (index: number, field: keyof QuizQuestionStudio, value: any) => void;
  handleQuizMediaUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  updateQuestionOption: (index: number, optIdx: number, lang: 'fr' | 'pt', value: string) => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  lang,
  quizTitle,
  setQuizTitle,
  quizRewardText,
  setQuizRewardText,
  quizQuestions,
  onLoadDraft,
  addQuestion,
  removeQuestion,
  updateQuestionField,
  handleQuizMediaUpload,
  updateQuestionOption,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 border-b-2 border-dashed border-[var(--cordel-border)]/30 pb-4 mb-2">
        <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70 flex flex-col gap-1">
          <span>📂 Charger un exercice pour le modifier (.json)</span>
          <input type="file" accept=".json" onChange={onLoadDraft} className="text-[10px] cursor-pointer" />
        </label>
      </div>
      <div className="border-2 border-[var(--cordel-border)] p-4 bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4">
        <span className="font-cactus text-lg font-black text-[var(--cordel-wood)] border-b border-dashed border-[var(--cordel-border)]/30 pb-1">
          Paramètres du Livret
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Titre du Folheto</label>
            <input
              type="text"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Ex: Origines du Maracatu"
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Texte Récompense Déverrouillage</label>
            <input
              type="text"
              value={quizRewardText}
              onChange={(e) => setQuizRewardText(e.target.value)}
              placeholder="Ex: Vous avez débloqué le livret historique !"
              className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
            />
          </div>
        </div>
      </div>

      {/* Questions Editor */}
      <div className="flex flex-col gap-8">
        {quizQuestions.map((q, idx) => (
          <div key={q.id} className="p-5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-bg)] cordel-border flex flex-col gap-4 relative">
            <div className="flex items-center justify-between border-b border-dashed border-[var(--cordel-border)]/30 pb-2">
              <span className="font-cactus text-base font-bold text-[var(--cordel-wood)]">
                Question #{idx + 1}
              </span>
              <div className="flex items-center gap-4">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestionField(idx, 'type', e.target.value as any)}
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 text-[10px] font-bold rounded"
                >
                  <option value="image">Question Visuelle (Xilo)</option>
                  <option value="audio">Question Auditive (Audio)</option>
                </select>
                {quizQuestions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(idx)}
                    className="p-1 text-[var(--cordel-wood)] hover:bg-[var(--cordel-wood)] hover:text-white rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Intitulé Question (FR)</label>
                <input
                  type="text"
                  value={q.questionTextFr}
                  onChange={(e) => updateQuestionField(idx, 'questionTextFr', e.target.value)}
                  placeholder="Ex: Quel est cet instrument ?"
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Intitulé Question (PT)</label>
                <input
                  type="text"
                  value={q.questionTextPt}
                  onChange={(e) => updateQuestionField(idx, 'questionTextPt', e.target.value)}
                  placeholder="Ex: Qual é esse instrumento ?"
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-xs font-bold w-full"
                />
              </div>
            </div>

            {/* Media uploads */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-dashed border-[var(--cordel-border)]/20 pt-4">
              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Upload Média (Image/Audio)</label>
                <input
                  type="file"
                  accept={q.type === 'image' ? 'image/*' : 'audio/*'}
                  onChange={(e) => handleQuizMediaUpload(idx, e)}
                  className="text-[10px] font-bold text-[var(--cordel-text)] cursor-pointer"
                />
                <input
                  type="text"
                  value={q.mediaUrl}
                  onChange={(e) => updateQuestionField(idx, 'mediaUrl', e.target.value)}
                  placeholder="Ou coller un lien URL direct..."
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/30 p-1.5 rounded text-[10px] focus:outline-none"
                />
              </div>
              <div className="flex flex-col items-center justify-center border-2 border-[var(--cordel-border)] p-2 bg-white text-black min-h-[90px] rounded">
                <span className="text-[8px] font-bold uppercase text-gray-400 mb-1">Aperçu Xilo / Audio</span>
                {q.type === 'image' && (q.mediaFile || q.mediaUrl) ? (
                  <img
                    src={q.mediaFile ? q.mediaFile : q.mediaUrl}
                    alt="xilo preview"
                    style={{ filter: 'contrast(300%) grayscale(100%)' }}
                    className="max-h-[60px] object-contain border border-black p-0.5"
                  />
                ) : q.type === 'audio' && (q.mediaFile || q.mediaUrl) ? (
                  <span className="text-[10px] text-green-700 font-bold">✓ Fichier Audio Raccordé</span>
                ) : (
                  <span className="text-[9px] text-gray-300">Aucun média</span>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="border-t border-dashed border-[var(--cordel-border)]/20 pt-4 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase text-[var(--cordel-text)]/70">Options de réponse (Cochez la bonne)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((optIdx) => (
                  <div key={optIdx} className="flex gap-2 items-start border border-[var(--cordel-border)]/20 p-2 bg-[var(--cordel-bg)]/20 rounded">
                    <input
                      type="radio"
                      name={`quiz_correct_${q.id}`}
                      checked={q.correctIndex === optIdx}
                      onChange={() => updateQuestionField(idx, 'correctIndex', optIdx)}
                      className="mt-2 accent-[var(--cordel-wood)] cursor-pointer"
                    />
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        type="text"
                        value={q.optionsFr[optIdx]}
                        onChange={(e) => updateQuestionOption(idx, optIdx, 'fr', e.target.value)}
                        placeholder={`Option ${optIdx + 1} (FR)`}
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 text-[10px] rounded focus:outline-none"
                      />
                      <input
                        type="text"
                        value={q.optionsPt[optIdx]}
                        onChange={(e) => updateQuestionOption(idx, optIdx, 'pt', e.target.value)}
                        placeholder={`Opção ${optIdx + 1} (PT)`}
                        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/40 p-1 text-[10px] rounded focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-dashed border-[var(--cordel-border)]/20 pt-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-[var(--cordel-text)]/60">Explication de la réponse (FR)</label>
                <input
                  type="text"
                  value={q.explanationFr}
                  onChange={(e) => updateQuestionField(idx, 'explanationFr', e.target.value)}
                  placeholder="Ex: L'Alfaia est un tambour en bois joué avec des mailloches..."
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-[10px] w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-[var(--cordel-text)]/60">Explicação da resposta (PT)</label>
                <input
                  type="text"
                  value={q.explanationPt}
                  onChange={(e) => updateQuestionField(idx, 'explanationPt', e.target.value)}
                  placeholder="Ex: A Alfaia é um tambor de madeira tocado com maçanetas..."
                  className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)]/50 p-2 rounded focus:outline-none text-[10px] w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {quizQuestions.length < 10 && (
        <button
          onClick={addQuestion}
          className="flex items-center justify-center gap-1.5 py-2 px-4 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border)] font-bold text-xs uppercase hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] transition-colors self-center cordel-button cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {lang === 'fr' ? 'Ajouter une question' : 'Adicionar pergunta'}
        </button>
      )}
    </div>
  );
};
