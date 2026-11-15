/**
 * VocalPaperSheetsBasket.tsx
 * Panier d'impression A4 Paysage N&B des 4 feuilles vocales (Toada) (< 115 lignes).
 */
import React from 'react';
import { Printer, Eye, X } from 'lucide-react';
import {
  printSequenciadorVocalCartBatch,
  wrapSequenciadorVocalPagesHTML,
  renderSequenciadorSingleVocalPageInner,
} from '../../utils/paper/vocalPaperSequenciadorHelper';

export type VocalCartState = { sequence: number; notes: number; rhythm: number; instructions: number };
export type VocalNumberingMode = 'blank' | 'continuous' | 'per_sheet';
export type VocalPreviewSheetId = 'sequence' | 'notes_1m' | 'rhythm_only' | 'instructions';

const VOCAL_SHEETS: Array<{ key: keyof VocalCartState; id: VocalPreviewSheetId; code: string; title: string; desc: string }> = [
  { key: 'sequence', id: 'sequence', code: 'CHANT-SEQ', title: 'Feuille 1 — Séquence (Pux / Cor)', desc: 'Grille large M1..M32 A4 Paysage sur 2 lignes (Pux / Cor) pour attribuer P1..Pn, X (Pause) et Unisson.' },
  { key: 'notes', id: 'notes_1m', code: 'CHANT-NOTES-1M', title: 'Feuille 2 — Patterns & Notes (Clavier + Syllabes)', desc: '3 systèmes A4 Paysage (8 temps libres) : Piano Roll A (en bas) -> G# (en haut), OCT (3/4/5) & SYLLABES ouverte.' },
  { key: 'rhythm', id: 'rhythm_only', code: 'CHANT-RYTHME', title: 'Feuille 3 — Paroles & Rythme seul', desc: '6 systèmes A4 Paysage (32 subdivisions) : bande TEMPS libre, bande RYTHME (5.5mm) + SYLLABES ouverte (11mm).' },
  { key: 'instructions', id: 'instructions', code: 'CHANT-GUIDE', title: 'Feuille 4 — Guide & Instructions', desc: 'Mémo illustré A4 Paysage : grille 8 temps libres, tirets "-" intra-mots, élisions "E\'O" et traits (───).' },
];

const NUMBERING_MODES: ReadonlyArray<readonly [VocalNumberingMode, string]> = [
  ['blank', 'Laisser [ P__ ] vierge (numérotation libre à la main)'],
  ['continuous', 'Numéroter en continu sur tout le lot (P1..Pn)'],
  ['per_sheet', 'Numéroter P1..P3 par feuille'],
];

interface VocalPaperSheetsBasketProps {
  title: string;
  bpm: number;
  cart: VocalCartState;
  numberingMode: VocalNumberingMode;
  previewSheet: VocalPreviewSheetId | null;
  onSetQty: (key: keyof VocalCartState, value: number) => void;
  onChangeNumberingMode: (mode: VocalNumberingMode) => void;
  onChangePreviewSheet: (sheet: VocalPreviewSheetId | null) => void;
}

export const VocalPaperSheetsBasket: React.FC<VocalPaperSheetsBasketProps> = ({
  title, bpm, cart, numberingMode, previewSheet, onSetQty, onChangeNumberingMode, onChangePreviewSheet,
}) => {
  const totalPages = cart.sequence + cart.notes + cart.rhythm + cart.instructions;

  return (
    <div className="space-y-2 text-[var(--cordel-text)]">
      <div className="p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
        {NUMBERING_MODES.map(([mode, label]) => (
          <label key={mode} className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--cordel-text)]">
            <input
              type="radio"
              name="seqPatNum"
              checked={numberingMode === mode}
              onChange={() => onChangeNumberingMode(mode)}
              className="accent-[var(--cordel-wood)]"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-1.5">
        {VOCAL_SHEETS.map((sh) => {
          const qty = cart[sh.key];
          const isPreviewActive = previewSheet === sh.id;
          return (
            <div key={sh.id} className={`p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] flex flex-wrap items-center justify-between gap-2 ${qty === 0 ? 'opacity-75' : ''}`}>
              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2 font-bold">
                  <span>{sh.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-accent-readable)]">[{sh.code}]</span>
                </div>
                <p className="text-[10.5px] text-[var(--cordel-text-muted)] mt-0.5">{sh.desc}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="inline-flex items-center border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]">
                  <button type="button" onClick={() => onSetQty(sh.key, qty - 1)} className="px-2 py-0.5 font-black hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer transition-colors">-</button>
                  <span className="w-7 text-center font-black">{qty}</span>
                  <button type="button" onClick={() => onSetQty(sh.key, qty + 1)} className="px-2 py-0.5 font-black hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer transition-colors">+</button>
                </div>
                {[0, 1, 3, 6].map((p) => (
                  <button key={p} type="button" onClick={() => onSetQty(sh.key, p)} className={`px-1.5 py-0.5 text-[10px] font-bold border border-[var(--cordel-border-strong)] cursor-pointer transition-colors ${qty === p ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:border-[var(--cordel-accent-readable)]'}`}>{p}</button>
                ))}
                <button type="button" onClick={() => onChangePreviewSheet(isPreviewActive ? null : sh.id)} className={`px-2 py-0.5 border border-[var(--cordel-border-strong)] font-bold flex items-center gap-1 cursor-pointer transition-colors ${isPreviewActive ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'}`}>
                  <Eye className="w-3 h-3" /><span>Aperçu</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewSheet && (
        <div className="p-2.5 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] text-[var(--cordel-text)] space-y-1.5">
          <div className="flex items-center justify-between font-bold text-[11px]">
            <span>Aperçu A4 Paysage — {previewSheet}</span>
            <button type="button" onClick={() => onChangePreviewSheet(null)} className="px-2 py-0.5 border border-[var(--cordel-border)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] flex items-center gap-1 cursor-pointer">
              <X className="w-3 h-3" /><span>Fermer</span>
            </button>
          </div>
          <iframe
            title="Aperçu A4 Paysage"
            srcDoc={wrapSequenciadorVocalPagesHTML(renderSequenciadorSingleVocalPageInner(previewSheet, { title, bpm, timeSignature: '4/4', blankPatternLabels: numberingMode === 'blank' }))}
            className="w-full h-56 border border-[var(--cordel-border)] bg-[var(--cordel-paper-surface)]"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-2 border-[var(--cordel-border)] bg-[var(--cordel-surface)] text-[var(--cordel-text)]">
        <span className="text-[11px] font-bold text-[var(--cordel-text-muted)]">Ouverture directe en A4 Paysage • 100 % N&amp;B monochrome</span>
        <button type="button" disabled={totalPages <= 0} onClick={() => printSequenciadorVocalCartBatch(cart, { title, bpm, timeSignature: '4/4', patternNumberingMode: numberingMode })} className="px-3.5 py-1.5 bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-[2px_2px_0_var(--cordel-shadow-color)] transition-colors">
          <Printer className="w-3.5 h-3.5" /><span>Imprimer le lot sélectionné ({totalPages} feuille{totalPages > 1 ? 's' : ''} A4 Paysage)</span>
        </button>
      </div>
    </div>
  );
};
