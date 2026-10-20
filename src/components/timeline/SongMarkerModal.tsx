import React, { useState, useEffect } from 'react';
import { SongMarker, Language } from '../../types';

interface SongMarkerModalProps {
  isOpen: boolean; onClose: () => void; editingMarker: SongMarker | null;
  defaultMeasure: number; totalMeasures: number; lang: Language;
  onCreateMarker: (name: string, measure: number, color: string) => void;
  onUpdateMarker: (id: string, name: string, measure: number, color: string) => void;
}

const MARKER_COLORS = [
  { value: '#e08283', label: 'Rouge' }, { value: '#f19066', label: 'Orange' },
  { value: '#f5cd79', label: 'Jaune' }, { value: '#55efc4', label: "Vert d'eau" },
  { value: '#74b9ff', label: 'Bleu pastel' }, { value: '#a29bfe', label: 'Violet doux' },
  { value: '#eaddcf', label: 'Cordel beige' },
];

export const SongMarkerModal: React.FC<SongMarkerModalProps> = ({
  isOpen, onClose, editingMarker, defaultMeasure, totalMeasures, lang, onCreateMarker, onUpdateMarker,
}) => {
  const [markerFormName, setMarkerFormName] = useState<string>('');
  const [markerFormMeasure, setMarkerFormMeasure] = useState<number | string>(1);
  const [markerFormColor, setMarkerFormColor] = useState<string>('#f19066');

  useEffect(() => {
    if (!isOpen) return;
    if (editingMarker) {
      setMarkerFormName(editingMarker.name); setMarkerFormMeasure(editingMarker.measure + 1);
      setMarkerFormColor(editingMarker.color || '#f19066');
    } else {
      setMarkerFormName(lang === 'fr' ? 'Repère' : 'Marcador'); setMarkerFormMeasure(defaultMeasure);
      setMarkerFormColor('#f19066');
    }
  }, [isOpen, editingMarker, defaultMeasure, lang]);

  const handleSubmit = () => {
    if (!markerFormName.trim()) return;
    const val = Math.max(1, Math.min(totalMeasures, parseInt(String(markerFormMeasure)) || 1));
    if (editingMarker) onUpdateMarker(editingMarker.id, markerFormName, val - 1, markerFormColor);
    else onCreateMarker(markerFormName, val - 1, markerFormColor);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-[460px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-5 cordel-border-sm cordel-shadow flex flex-col gap-4 font-cactus">
        <h3 className="text-xl font-bold uppercase border-b border-[var(--cordel-border)] pb-2 text-[var(--cordel-text)]">
          {editingMarker ? (lang === 'fr' ? 'Modifier le Repère' : 'Editar Marcador') : (lang === 'fr' ? 'Créer un Repère' : 'Criar Marcador')}
        </h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Nom du repère' : 'Nome do marcador'}</label>
          <textarea
            rows={2} value={markerFormName} onChange={(e) => setMarkerFormName(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            placeholder={lang === 'fr' ? 'Ex: Introduction\nSolo Alfaia' : 'Ex: Introdução\nSolo Alfaia'}
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)] resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Mesure' : 'Compasso'}</label>
          <input
            type="number" min={1} max={totalMeasures} value={markerFormMeasure}
            onChange={(e) => setMarkerFormMeasure(e.target.value)}
            onBlur={() => setMarkerFormMeasure(Math.max(1, Math.min(totalMeasures, parseInt(String(markerFormMeasure)) || 1)))}
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1.5 text-sm font-bold outline-none rounded-none text-center text-[var(--cordel-text)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Couleur' : 'Cor'}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {MARKER_COLORS.map((c) => (
              <button
                key={c.value} type="button" onClick={() => setMarkerFormColor(c.value)}
                className={`w-7 h-7 rounded-full cursor-pointer cordel-border-sm transition-transform ${markerFormColor === c.value ? 'scale-115 ring-2 ring-[var(--cordel-text)]' : 'opacity-85'}`}
                style={{ backgroundColor: c.value }} title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 mt-2 border-t border-[var(--cordel-border)]/30 pt-3">
          <button type="button" onClick={onClose} className="px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button type="button" onClick={handleSubmit} className="px-4 py-1.5 bg-[var(--cordel-wood)] text-[#f4ecd8] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">
            {lang === 'fr' ? 'Valider' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};
