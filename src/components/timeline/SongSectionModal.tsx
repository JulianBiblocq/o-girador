import React, { useState, useEffect } from 'react';
import { SongSection, Language } from '../../types';
import { SongSectionBoundsFields } from './SongSectionBoundsFields';

interface SongSectionModalProps {
  isOpen: boolean; onClose: () => void; editingSection: SongSection | null; totalMeasures: number;
  lang: Language; defaultMeasure?: number; defaultLevel?: number;
  onCreateSection: (name: string, start: number, end: number, color: string, repeat?: number, level?: number) => void;
  onUpdateSection: (id: string, name: string, start: number, end: number, color: string, level?: number) => void;
  onDeleteSection?: (id: string) => void;
  onSaveCloudSection?: (section: SongSection) => void;
  onLoadCloudSection?: (insertAtMeasure: number) => void;
}

const SECTION_COLORS = ['#f19066', '#f5cd79', '#546de5', '#e15f41', '#c44569', '#3dc1d3', '#574b90', '#786fa6'];

export const SongSectionModal: React.FC<SongSectionModalProps> = ({
  isOpen, onClose, editingSection, totalMeasures, lang, defaultMeasure = 1, defaultLevel = 0,
  onCreateSection, onUpdateSection, onDeleteSection,
}) => {
  const [name, setName] = useState('');
  const [startM, setStartM] = useState(1);
  const [endM, setEndM] = useState(4);
  const [color, setColor] = useState('#f19066');
  const [level, setLevel] = useState(0);
  const maxLimit = Math.max(64, totalMeasures);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSection) {
      setName(editingSection.name); setStartM(editingSection.startMeasure + 1);
      setEndM(editingSection.endMeasure + 1); setColor(editingSection.color || '#f19066');
      setLevel(editingSection.level || 0);
    } else {
      const s = Math.max(1, Math.min(maxLimit, defaultMeasure));
      setName(lang === 'fr' ? 'Partie A' : 'Parte A'); setStartM(s); setEndM(Math.min(maxLimit, s + 3));
      setColor('#f19066'); setLevel(defaultLevel ?? 0);
    }
  }, [isOpen, editingSection, lang, defaultMeasure, defaultLevel, maxLimit]);

  if (!isOpen) return null;

  const handleStartChange = (v: string) => {
    const val = parseInt(v, 10);
    if (isNaN(val)) return;
    const c = Math.max(1, Math.min(maxLimit, val));
    setStartM(c); if (c > endM) setEndM(c);
  };

  const handleEndChange = (v: string) => {
    const val = parseInt(v, 10);
    if (isNaN(val)) return;
    const c = Math.max(1, Math.min(maxLimit, val));
    setEndM(c); if (c < startM) setStartM(c);
  };

  const handleValidate = () => {
    if (!name.trim()) return;
    const s = Math.max(1, Math.min(maxLimit, startM)), e = Math.max(s, Math.min(maxLimit, endM));
    if (editingSection) onUpdateSection(editingSection.id, name, s - 1, e - 1, color, level);
    else onCreateSection(name, s - 1, e - 1, color, 1, level);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-[460px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-5 cordel-border-sm cordel-shadow flex flex-col gap-4 font-cactus">
        <h3 className="text-lg font-bold uppercase border-b border-[var(--cordel-border)] pb-2 flex items-center justify-between">
          <span>{editingSection ? (lang === 'fr' ? `MODIFIER LA SECTION (M. ${startM} - ${endM})` : `EDITAR SEÇÃO (C. ${startM} - ${endM})`) : (lang === 'fr' ? 'NOUVELLE SECTION DE MORCEAU' : 'NOVA SEÇÃO DE MÚSICA')}</span>
        </h3>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider block mb-1">{lang === 'fr' ? 'Nom de la section' : 'Nome da seção'}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="w-full bg-[var(--cordel-bg)] border border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[var(--cordel-border)]" />
        </div>
        <SongSectionBoundsFields startM={startM} endM={endM} maxLimit={maxLimit} lang={lang} onStartChange={handleStartChange} onEndChange={handleEndChange} onQuickDuration={(b) => setEndM(Math.min(maxLimit, startM + b - 1))} />
        <div>
          <label className="text-xs font-bold uppercase tracking-wider block mb-1">
            {lang === 'fr' ? 'Niveau de la section' : 'Nível da seção'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLevel(0)}
              className={`py-1.5 px-2 text-xs font-bold uppercase border-2 transition-all cursor-pointer text-center ${
                level === 0
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-[var(--cordel-text)] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)] opacity-70 hover:opacity-100'
              }`}
            >
              {lang === 'fr' ? 'Niveau 1 (Structure)' : 'Nível 1 (Estrutura)'}
            </button>
            <button
              type="button"
              onClick={() => setLevel(1)}
              className={`py-1.5 px-2 text-xs font-bold uppercase border-2 transition-all cursor-pointer text-center ${
                level === 1
                  ? 'bg-[var(--cordel-text)] text-[var(--cordel-bg)] border-[var(--cordel-text)] shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
                  : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)] opacity-70 hover:opacity-100'
              }`}
            >
              {lang === 'fr' ? 'Niveau 2 (Sous-section)' : 'Nível 2 (Subseção)'}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider block mb-1.5">{lang === 'fr' ? 'Couleur thématique' : 'Cor temática'}</label>
          <div className="flex gap-2 flex-wrap">
            {SECTION_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={`w-7 h-7 rounded-none border transition-all ${color === c ? 'border-[var(--cordel-text)] scale-110 shadow-md ring-2 ring-[var(--cordel-text)]/40' : 'border-black/20 hover:scale-105'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-[var(--cordel-border)]/40">
          {editingSection && onDeleteSection ? (
            <button type="button" onClick={() => { onDeleteSection(editingSection.id); onClose(); }} className="text-xs font-bold text-red-600 hover:text-red-700 underline cursor-pointer">{lang === 'fr' ? 'Supprimer' : 'Excluir'}</button>
          ) : <div />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-bold border border-[var(--cordel-border)] hover:bg-[var(--cordel-border)]/10 cursor-pointer">{lang === 'fr' ? 'Annuler' : 'Cancelar'}</button>
            <button type="button" onClick={handleValidate} className="px-4 py-1.5 text-xs font-bold bg-[var(--cordel-text)] text-[var(--cordel-bg)] border border-[var(--cordel-text)] hover:opacity-90 cursor-pointer shadow-sm">{editingSection ? (lang === 'fr' ? 'Mettre à jour' : 'Atualizar') : (lang === 'fr' ? 'Créer' : 'Criar')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
