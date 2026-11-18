/**
 * OficinaLoopLabPanel.tsx — Panneau pliable Cordel « Labo Boucles (Barulhos & Apito L) » dans A Oficina (< 138 lignes).
 * - Sélecteur des 10 instruments (`9 Barulhos B/b` + `Apito L`) avec badge `[ STUDIO ]` / `[ PROVISOIRE ]`.
 * - Forme d'onde temps réel, 3 boutons de test, 4 curseurs (pas `5 ms`), `[ Réinitialiser ]` et `[ Copier JSON ]`.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Play, RotateCcw, Square, Volume2 } from 'lucide-react';
import { BarulhoLoopPointsMs, LOOP_LAB_INSTRUMENTS, LoopLabInstrumentId } from '../../audio/engine/barulhoLoopRegistry';
import { LoopWaveformCanvas } from './LoopWaveformCanvas';
import { useOficinaLoopLabAudio } from './useOficinaLoopLabAudio';

export interface OficinaLoopLabPanelProps { lang: string; }

const LOOP_INSTRUMENT_LABELS: Record<LoopLabInstrumentId, string> = {
  marcante: 'Marcante (B)', meiao: 'Meião (B)', repique: 'Repique (B)', gongue: 'Gonguê (B)',
  caixa: 'Caixa (B)', tarol: 'Tarol (B)', timbal: 'Timbal (B)', agbe: 'Agbê (B)', mineiro: 'Mineiro (B)', apito: 'Apito (L)',
};

export const OficinaLoopLabPanel: React.FC<OficinaLoopLabPanelProps> = React.memo(({ lang }) => {
  const isFr = lang === 'fr';
  const [isOpen, setIsOpen] = useState(false);
  const {
    selectedId, setSelectedId, audioBuffer, points, playMode, copiedFeedback, bankTier,
    startAttack, startSoft, stopPreview, updatePointField, handleReset, handleCopyJson, getPlayheadMs,
  } = useOficinaLoopLabAudio();

  const handleToggleOpen = () => { if (isOpen && playMode !== 'none') stopPreview(); setIsOpen((prev) => !prev); };

  const totalMs = audioBuffer ? Math.round(audioBuffer.duration * 1000) : 4000;
  const maxStartMs = Math.max(50, Math.floor((points.loopEndMs - points.crossfadeMs - 35) / 5) * 5);
  const minEndMs = Math.min(totalMs - 10, Math.ceil((points.loopStartMs + points.crossfadeMs + 35) / 5) * 5);
  const maxEndMs = Math.max(minEndMs + 5, Math.floor((totalMs - 10) / 5) * 5);
  const maxSoftMs = Math.max(points.loopStartMs, Math.floor((points.loopEndMs - points.crossfadeMs - 10) / 5) * 5);

  const sliders: Array<{ key: keyof BarulhoLoopPointsMs; labelFr: string; labelPt: string; min: number; max: number }> = [
    { key: 'loopStartMs', labelFr: 'Début de boucle (ms)', labelPt: 'Início do loop (ms)', min: 15, max: maxStartMs },
    { key: 'loopEndMs', labelFr: 'Fin de boucle (ms)', labelPt: 'Fim do loop (ms)', min: minEndMs, max: maxEndMs },
    { key: 'crossfadeMs', labelFr: 'Fondu de couture (ms)', labelPt: 'Crossfade da costura (ms)', min: 20, max: 220 },
    { key: 'softEntryMs', labelFr: 'Offset entrée douce b (ms)', labelPt: 'Offset entrada suave b (ms)', min: points.loopStartMs, max: maxSoftMs },
  ];

  const isStudio = bankTier === 'studio';
  const symMain = selectedId === 'apito' ? 'L' : 'B';

  return (
    <div data-testid="oficina-loop-lab-panel" className="bg-[var(--cordel-surface)] border-2 border-[var(--cordel-border-strong)] shadow-[3px_3px_0px_var(--cordel-shadow-color)] select-none">
      <button
        type="button" data-testid="oficina-loop-lab-toggle" onClick={handleToggleOpen}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-[var(--cordel-surface-elevated)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={15} className="text-[var(--cordel-accent-readable)]" /> : <ChevronRight size={15} className="text-[var(--cordel-accent-readable)]" />}
          <span className="font-cactus font-bold uppercase text-xs md:text-sm text-[var(--cordel-accent-readable)]">
            {isFr ? 'Labo Boucles (Barulhos & Apito L)' : 'Lab de Loops (Barulhos & Apito L)'}
          </span>
        </div>
        <span className="font-mono font-bold text-[10px] text-[var(--cordel-text-muted)]">
          {isFr ? 'Couture cos/sin & entrée douce b' : 'Costura cos/sin & entrada suave b'}
        </span>
      </button>

      {isOpen && (
        <div className="p-3.5 border-t-2 border-[var(--cordel-border-strong)] flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {LOOP_LAB_INSTRUMENTS.map((id) => (
                <button
                  key={id} type="button" data-testid={`loop-lab-inst-${id}`} onClick={() => setSelectedId(id)}
                  className={`px-2 py-1 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] cursor-pointer transition-colors ${
                    selectedId === id ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
                  }`}
                >
                  {LOOP_INSTRUMENT_LABELS[id]}
                </button>
              ))}
            </div>
            <span
              data-testid="loop-lab-bank-badge"
              className={`px-2 py-0.5 border border-[var(--cordel-border-strong)] font-mono font-bold text-[10px] uppercase ${
                isStudio ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)]'
              }`}
            >
              {isStudio ? '[ STUDIO ]' : (isFr ? '[ PROVISOIRE ]' : '[ PROVISÓRIO ]')}
            </span>
          </div>

          <LoopWaveformCanvas audioBuffer={audioBuffer} points={points} isPlaying={playMode !== 'none'} getPlayheadMs={getPlayheadMs} isFr={isFr} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" data-testid="loop-lab-hold-attack" disabled={!audioBuffer} onClick={startAttack} className={`px-2.5 py-1.5 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${playMode === 'attack' ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'}`}>
                <Play size={12} /><span>{isFr ? `Maintenir ${symMain} (Avec attaque)` : `Sustentar ${symMain} (Com ataque)`}</span>
              </button>
              <button type="button" data-testid="loop-lab-test-soft" disabled={!audioBuffer} onClick={startSoft} className={`px-2.5 py-1.5 border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${playMode === 'soft' ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]' : 'bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)]'}`}>
                <Volume2 size={12} /><span>{isFr ? 'Tester b (Entrée douce)' : 'Testar b (Entrada suave)'}</span>
              </button>
              <button type="button" data-testid="loop-lab-stop" disabled={playMode === 'none'} onClick={stopPreview} className="px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
                <Square size={11} /><span>{isFr ? 'Couper / Relâcher' : 'Cortar / Soltar'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button type="button" data-testid="loop-lab-reset" onClick={handleReset} className="px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1 cursor-pointer">
                <RotateCcw size={11} /><span>{isFr ? 'Réinitialiser' : 'Redefinir'}</span>
              </button>
              <button type="button" data-testid="loop-lab-copy-json" onClick={handleCopyJson} className="px-2.5 py-1.5 bg-[var(--cordel-surface-elevated)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold uppercase text-[10px] flex items-center gap-1 cursor-pointer">
                {copiedFeedback ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedFeedback ? (isFr ? 'JSON Copié' : 'JSON Copiado') : (isFr ? 'Copier JSON' : 'Copiar JSON')}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sliders.map((sl) => (
              <div key={sl.key} className="bg-[var(--cordel-bg)] border border-[var(--cordel-border)] p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] font-cactus font-bold uppercase text-[var(--cordel-text)]">
                  <span>{isFr ? sl.labelFr : sl.labelPt}</span>
                  <span className="font-mono font-bold text-[var(--cordel-accent-readable)]">{points[sl.key]} ms</span>
                </div>
                <input
                  type="range" min={sl.min} max={sl.max} step={5} value={points[sl.key]}
                  aria-label={isFr ? sl.labelFr : sl.labelPt}
                  onChange={(e) => updatePointField(sl.key, Number(e.target.value))}
                  className="w-full accent-[var(--cordel-accent)] cursor-pointer h-1.5"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

OficinaLoopLabPanel.displayName = 'OficinaLoopLabPanel';
