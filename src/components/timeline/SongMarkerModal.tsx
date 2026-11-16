import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { SongMarker, Language } from '../../types';

interface SongMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMarker: SongMarker | null;
  editingMarkerIdx?: number;
  defaultMeasure: number;
  totalMeasures: number;
  lang: Language;
  onCreateMarker: (name: string, measure: number, color: string) => void;
  onUpdateMarker: (id: string, name: string, measure: number, color: string, fallbackIdx?: number) => void;
  onDeleteMarker?: (marker: SongMarker, fallbackIdx?: number) => void;
}

const MARKER_SWATCHES = [
  { token: 'var(--cordel-status-danger)', label: 'Vermillon' },
  { token: 'var(--cordel-accent-readable)', label: 'Terre cuite' },
  { token: 'var(--cordel-gold)', label: 'Ocre doré' },
  { token: 'var(--cordel-status-success)', label: 'Sertão vert' },
  { token: 'var(--reverb-color)', label: 'Indigo' },
  { token: 'var(--disto-color)', label: 'Cuivre' },
  { token: 'var(--cordel-parchment-bg)', label: 'Parchemin' },
];

export const SongMarkerModal: React.FC<SongMarkerModalProps> = ({
  isOpen, onClose, editingMarker, editingMarkerIdx, defaultMeasure,
  totalMeasures, lang, onCreateMarker, onUpdateMarker, onDeleteMarker,
}) => {
  const [markerFormName, setMarkerFormName] = useState<string>('');
  const [markerFormMeasure, setMarkerFormMeasure] = useState<number | string>(1);
  const [markerFormColor, setMarkerFormColor] = useState<string>('var(--cordel-accent-readable)');

  useEffect(() => {
    if (!isOpen) return;
    if (editingMarker) {
      setMarkerFormName(editingMarker.name);
      setMarkerFormMeasure(editingMarker.measure + 1);
      setMarkerFormColor(editingMarker.color || 'var(--cordel-accent-readable)');
    } else {
      setMarkerFormName(lang === 'fr' ? 'Repère' : 'Marcador');
      setMarkerFormMeasure(defaultMeasure);
      setMarkerFormColor('var(--cordel-accent-readable)');
    }
  }, [isOpen, editingMarker, defaultMeasure, lang]);

  const handleSubmit = () => {
    if (!markerFormName.trim()) return;
    const val = Math.max(1, Math.min(totalMeasures, parseInt(String(markerFormMeasure), 10) || 1));
    if (editingMarker) onUpdateMarker(editingMarker.id, markerFormName, val - 1, markerFormColor, editingMarkerIdx);
    else onCreateMarker(markerFormName, val - 1, markerFormColor);
    onClose();
  };

  const handleDelete = () => {
    if (!editingMarker || !onDeleteMarker) return;
    onDeleteMarker(editingMarker, editingMarkerIdx);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--cordel-ink-dark)]/65 backdrop-blur-xs p-4">
      <div className="w-full max-w-[460px] bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-5 cordel-border-sm cordel-shadow flex flex-col gap-4 font-cactus">
        <h3 className="text-xl font-bold uppercase border-b border-[var(--cordel-border)] pb-2 text-[var(--cordel-text)]">
          {editingMarker ? (lang === 'fr' ? 'Modifier le Repère' : 'Editar Marcador') : (lang === 'fr' ? 'Créer un Repère' : 'Criar Marcador')}
        </h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Nom du repère' : 'Nome do marcador'}</label>
          <textarea
            rows={2}
            value={markerFormName}
            onChange={(e) => setMarkerFormName(e.target.value)}
            onKeyDown={(e) => { e.stopPropagation(); if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            placeholder={lang === 'fr' ? 'Ex: Convenção\nSolo Alfaia' : 'Ex: Convenção\nSolo Alfaia'}
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-3 py-1.5 text-sm font-bold outline-none rounded-none focus:bg-[var(--cordel-border)]/10 text-[var(--cordel-text)] resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Mesure' : 'Compasso'}</label>
          <input
            type="number"
            min={1}
            max={totalMeasures}
            value={markerFormMeasure}
            onChange={(e) => setMarkerFormMeasure(e.target.value)}
            onBlur={() => setMarkerFormMeasure(Math.max(1, Math.min(totalMeasures, parseInt(String(markerFormMeasure), 10) || 1)))}
            className="w-full bg-[var(--cordel-bg)] border-2 border-[var(--cordel-border)] px-2 py-1.5 text-sm font-bold outline-none rounded-none text-center text-[var(--cordel-text)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-[var(--cordel-text)]">{lang === 'fr' ? 'Couleur' : 'Cor'}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {MARKER_SWATCHES.map((c) => (
              <button
                key={c.token}
                type="button"
                onClick={() => setMarkerFormColor(c.token)}
                className={`w-7 h-7 rounded-full cursor-pointer cordel-border-sm transition-transform ${markerFormColor === c.token ? 'scale-115 ring-2 ring-[var(--cordel-text)]' : 'opacity-85'}`}
                style={{ backgroundColor: c.token }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 mt-2 border-t border-[var(--cordel-border)]/30 pt-3">
          <div>
            {editingMarker && onDeleteMarker && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 bg-[var(--cordel-status-danger)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border-strong)] font-bold text-xs uppercase cordel-border-sm cursor-pointer hover:opacity-90 flex items-center gap-1.5"
              >
                <Trash2 size={13} className="shrink-0" />
                <span>{lang === 'fr' ? 'Supprimer' : 'Excluir'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onClose} className="px-3 py-1.5 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]">
              {lang === 'fr' ? 'Annuler' : 'Cancelar'}
            </button>
            <button type="button" onClick={handleSubmit} className="px-4 py-1.5 bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border border-[var(--cordel-border)] font-bold text-xs cordel-border-sm cursor-pointer hover:bg-[var(--cordel-accent)]">
              {lang === 'fr' ? 'Valider' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
