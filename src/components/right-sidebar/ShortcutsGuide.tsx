import React from 'react';
import DOMPurify from 'dompurify';
import { Language } from '../../types';
import { instrumentsConfig, isDarkText } from '../../data';
import { audioEngine } from '../../hooks/useAudioSync';
import { useSequencerStore } from '../../stores/useSequencerStore';
import * as Tone from 'tone';

interface ShortcutsGuideProps {
  lang: Language;
  t: (key: string) => string;
  activeStrokesByInstrument?: Record<string, string[]>;
}

export const ShortcutsGuide: React.FC<ShortcutsGuideProps> = ({ lang, t, activeStrokesByInstrument }) => {
  const isStrokeActiveForInstruments = (instIds: string[], strokeSymbols: string[]) => {
    if (!activeStrokesByInstrument) return true;
    return instIds.some(id => {
      const activeStrokes = activeStrokesByInstrument[id] || [];
      return strokeSymbols.some(sym => 
        activeStrokes.includes(sym) || 
        activeStrokes.includes(sym.toUpperCase()) || 
        activeStrokes.includes(sym.toLowerCase())
      );
    });
  };

  const shouldShowSection = (instIds: string[]) => {
    if (!activeStrokesByInstrument) return true;
    return instIds.some(id => (activeStrokesByInstrument[id] || []).length > 0);
  };

  const renderBadge = (instIds: string[], strokes: string[], display: string) => {
    const mainInst = instIds[0];
    const mainStroke = strokes[0];
    const inst = instrumentsConfig.find(i => i.id === mainInst);
    const bg = inst ? (inst.colors[mainStroke] || '#111') : '#111';
    const color = isDarkText(mainInst, mainStroke) ? '#1a1a1a' : '#f4ecd8';
    
    return (
      <span 
        onClick={() => playPreview(instIds, mainStroke)} 
        className="inline-flex items-center justify-center min-w-[44px] px-1 h-[18px] text-[9px] font-bold border-[1.5px] border-[#1a1a1a] cursor-pointer active:scale-95 transition-transform duration-100 select-none hover:opacity-90"
        style={{ backgroundColor: bg, color: color }}
      >
        {display}
      </span>
    );
  };

  /* CPU / Audio justification: Asynchronous Tone.js one-shot preview triggered directly on user click.
     Uses native GPU-accelerated transition scale animations (CSS transition/transform) to ensure zero impact
     on React render cycles, layout Reflow, or audio transport clock scheduling. */
  const playPreview = (instrumentIds: string[], strokeSymbol: string) => {
    try {
      if (!audioEngine) return;
      const state = useSequencerStore.getState();
      const tracks = state.tracks;
      
      const matchingTrack = tracks.find(t => {
        const inst = instrumentsConfig[t.instrumentIdx];
        return inst && instrumentIds.includes(inst.id);
      });
      
      const targetId = matchingTrack ? matchingTrack.id : instrumentIds[0];
      audioEngine.playNote(targetId, strokeSymbol, Tone.now(), 1.0, 1.0);
    } catch (err) {
      console.error("Preview play failed:", err);
    }
  };

  return (
    <div className="flex flex-col gap-y-3 pr-1 flex-grow overflow-y-auto custom-scrollbar min-h-0">
      
      {/* Shortcuts & Gestures */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            ⌨️ {lang === 'fr' ? 'Raccourcis & Gestes' : 'Atalhos e Gestos'}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[10px] text-[var(--cordel-text)] leading-relaxed">
          {lang === 'fr' ? (
            <>
              <p>• <b>Double-clic</b> (ou appui long) sur un temps pour y insérer une frappe forte.</p>
              <p>• <b>Clic simple</b> pour insérer une frappe faible.</p>
              <p>• <b>Molette souris</b> (ou glisser haut/bas) sur une cellule pour changer la frappe/nuance.</p>
              <p>• <b>Ctrl + Clic</b> (ou appui long) sur l'entête d'une ligne pour couper le son (mute) de l'instrument.</p>
            </>
          ) : (
            <>
              <p>• <b>Duplo clique</b> (ou toque longo) em um tempo para inserir uma batida forte.</p>
              <p>• <b>Clique simples</b> para inserir uma batida fraca.</p>
              <p>• <b>Roda do mouse</b> (ou deslizar para cima/baixo) em uma célula para mudar a batida/nuance.</p>
              <p>• <b>Ctrl + Clique</b> (ou toque longo) no cabeçalho de uma linha para silenciar (mute) o instrumento.</p>
            </>
          )}
        </div>
      </details>

      {/* Export WAV */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {t('wavExportTitle')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('wavExportDesc')) }} />
        </div>
      </details>

      {/* Offline Mode */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {t('pwaOfflineTitle')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-2 border-t border-[var(--cordel-border)]/20 text-[11px] text-[var(--cordel-text)] leading-relaxed">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwaOfflineDesc')) }} />
        </div>
      </details>

      {/* Vocals */}
      {shouldShowSection(['voice']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/micro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {t('voiceLegendTitle')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 text-xs text-[var(--cordel-text)] leading-relaxed">
            <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend1')) }} />
            <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('voiceLegend2')) }} />
          </div>
        </details>
      )}

      {/* Alfaia */}
      {shouldShowSection(['marcante', 'meiao', 'repique']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/alfaia.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              Alfaia
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['D', 'd', 'E', 'e']) && (
              <>
                <div className="flex items-center gap-2">
                  {renderBadge(['marcante', 'meiao', 'repique'], ['D'], 'D / E')}
                  <span>{t('strokeStrongGroup')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {renderBadge(['marcante', 'meiao', 'repique'], ['d'], 'd / e')}
                  <span>{t('strokeWeakGroup')}</span>
                </div>
              </>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['X', 'x']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['marcante', 'meiao', 'repique'], ['X'], 'X / x')}
                <span>{t('legendAlfaiaCerclage')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['I', 'i']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['marcante', 'meiao', 'repique'], ['I'], 'I / i')}
                <span>{t('legendAlfaiaIguarassu')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['C', 'c']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['marcante', 'meiao', 'repique'], ['C'], 'C / c')}
                <span>{t('legendTarolClick')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['marcante', 'meiao', 'repique'], ['B', 'b']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['marcante', 'meiao', 'repique'], ['B'], 'B / b')}
                <span>{t('legendAlfaiaBarulho')}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Caixa & Tarol */}
      {shouldShowSection(['caixa', 'tarol']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/caixa.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              Caixa & Tarol
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['D', 'd', 'E', 'e']) && (
              <>
                <div className="flex items-center gap-2">
                  {renderBadge(['caixa', 'tarol'], ['D'], 'D / E')}
                  <span>{t('strokeStrongGroup')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {renderBadge(['caixa', 'tarol'], ['d'], 'd / e')}
                  <span>{t('strokeWeakGroup')}</span>
                </div>
              </>
            )}
            <div className="w-full h-px bg-[var(--cordel-border)]/10 my-1"></div>
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['R']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['caixa', 'tarol'], ['R'], 'R')}
                <span>{t('legendCaixaRufadaD')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['r']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['caixa', 'tarol'], ['r'], 'r')}
                <span>{t('legendCaixaRufadaG')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['F', 'f']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['caixa', 'tarol'], ['F'], 'F / f')}
                <span>{t('legendCaixaFla')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['X', 'x']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['caixa', 'tarol'], ['X'], 'X / x')}
                <span>{t('legendCaixaCerclage')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['C', 'c']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['caixa', 'tarol'], ['C'], 'C / c')}
                <span>{t('legendTarolClick')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['caixa', 'tarol'], ['B', 'b']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['caixa', 'tarol'], ['B'], 'B / b')}
                <span>{t('legendAlfaiaBarulho')}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Timbal */}
      {shouldShowSection(['timbal']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/timbal.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              Timbal
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['timbal'], ['G', 'g']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['G'], 'G / g')}
                <span>{lang === 'fr' ? 'Basse (baixo)' : 'Baixo'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['A', 'a']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['A'], 'A / a')}
                <span>{lang === 'fr' ? 'Ouvert (aberto)' : 'Aberto'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['S', 's']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['S'], 'S / s')}
                <span>{lang === 'fr' ? 'Claqué (slap)' : 'Slap'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['D', 'd']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['D'], 'D / d')}
                <span>{lang === 'fr' ? 'Fantôme (dedilhado)' : 'Dedilhado'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['P', 'p']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['P'], 'P / p')}
                <span>{lang === 'fr' ? 'Fermé (preso)' : 'Abafado / Preso'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['F', 'f']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['F'], 'F / f')}
                <span>{lang === 'fr' ? 'Fla ouvert (aberto)' : 'Fla aberto'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['V', 'v']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['V'], 'V / v')}
                <span>{lang === 'fr' ? 'Fla claqué (slap)' : 'Fla slap'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['C', 'c']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['C'], 'C / c')}
                <span>{lang === 'fr' ? 'Clap (mains)' : 'Clap (mãos)'}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['timbal'], ['B', 'b']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['timbal'], ['B'], 'B / b')}
                <span>{lang === 'fr' ? 'Tremblement (Barulho)' : 'Barulho'}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Gongue */}
      {shouldShowSection(['gongue']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/gongue.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {t('gongueLegend')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['gongue'], ['G', 'g']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['gongue'], ['G'], 'G / g')}
                <span>{t('gongueGrave')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['gongue'], ['A', 'a']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['gongue'], ['A'], 'A / a')}
                <span>{t('gongueAigu')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['gongue'], ['X', 'x']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['gongue'], ['X'], 'X / x')}
                <span>{t('legendGongueBord')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['gongue'], ['B', 'b']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['gongue'], ['B'], 'B / b')}
                <span>{t('gongueBarulho')}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Agbe */}
      {shouldShowSection(['agbe']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/agbe.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {t('agbeLegend')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['agbe'], ['D', 'd', 'E', 'e']) && (
              <>
                <div className="flex items-center gap-2">
                  {renderBadge(['agbe'], ['D'], 'D / E')}
                  <span>{t('strokeStrongGroup')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {renderBadge(['agbe'], ['d'], 'd / e')}
                  <span>{t('strokeWeakGroup')}</span>
                </div>
              </>
            )}
            {isStrokeActiveForInstruments(['agbe'], ['S', 's']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['agbe'], ['S'], 'S / s')}
                <span>{t('legendAgbeSaut')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['agbe'], ['V', 'v']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['agbe'], ['V'], 'V / v')}
                <span>{t('legendAgbeVolta')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['agbe'], ['B', 'b']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['agbe'], ['B'], 'B / b')}
                <span>{t('legendAgbeBarulho')}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Mineiro */}
      {shouldShowSection(['mineiro']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/mineiro.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {t('mineiroLegend')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['mineiro'], ['P', 'p']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['mineiro'], ['P'], 'P / p')}
                <span>{t('mineiroP')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['mineiro'], ['T', 't']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['mineiro'], ['T'], 'T / t')}
                <span>{t('mineiroT')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['mineiro'], ['L', 'l']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['mineiro'], ['L'], 'L / l')}
                <span>{t('mineiroL')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['mineiro'], ['B', 'b']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['mineiro'], ['B'], 'B / b')}
                <span>{t('mineiroB')}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Apito */}
      {shouldShowSection(['apito']) && (
        <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
          <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
            <span className="flex items-center text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
              <img src="icones/apito.svg" alt="" className="w-4 h-4 mr-1.5 inline-block opacity-80" />
              {t('apitoLegend')}
            </span>
            <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-2 border-t border-[var(--cordel-border)]/20 flex flex-col gap-1 text-[11px] text-[var(--cordel-text)]">
            {isStrokeActiveForInstruments(['apito'], ['W']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['apito'], ['W'], 'W')}
                <span>{t('apitoLong')}</span>
              </div>
            )}
            {isStrokeActiveForInstruments(['apito'], ['w']) && (
              <div className="flex items-center gap-2">
                {renderBadge(['apito'], ['w'], 'w')}
                <span>{t('apitoShort')}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Contact & Feedback */}
      <details className="group bg-[var(--cordel-bg)] cordel-border-sm mb-1">
        <summary className="flex items-center justify-between cursor-pointer p-2 list-none select-none hover:bg-black/5 transition-colors">
          <span className="text-[10px] font-bold text-[var(--cordel-text)] uppercase tracking-wider font-cactus">
            {t('feedbackTitle')}
          </span>
          <span className="text-[var(--cordel-text)] font-bold transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-3 border-t border-[var(--cordel-border)]/20 text-center">
          <p className="text-[10px] text-[var(--cordel-text)] leading-relaxed mb-2">
            {lang === 'fr' 
              ? "Une idée, un bug ou un retour ? Venez en discuter sur le forum !" 
              : "Uma ideia, um bug ou feedback? Venha conversar no fórum!"}
          </p>
          <button
            onClick={() => window.open('https://github.com/JulianBiblocq/o-girador/issues', '_blank')}
            className="bg-[#27ae60] text-[#1a1a1a] hover:opacity-90 px-3 py-1 text-xs font-bold cordel-border-sm cursor-pointer mx-auto flex items-center gap-1"
          >
            <span>💬</span>
            <span>{t('feedbackBtn')}</span>
          </button>
        </div>
      </details>

    </div>
  );
};
