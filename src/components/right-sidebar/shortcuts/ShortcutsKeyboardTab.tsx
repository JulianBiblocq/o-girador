import React from 'react';
import { Language } from '../../../types';

interface ShortcutsKeyboardTabProps {
  lang: Language;
  t: (key: string) => string;
}

export const ShortcutsKeyboardTab: React.FC<ShortcutsKeyboardTabProps> = ({ lang, t }) => {
  const isFr = lang === 'fr';
  const rowCls = 'flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1 border-b border-[var(--cordel-border)]/15 last:border-b-0 min-w-0';
  const labelCls = 'font-medium leading-tight flex-1 min-w-[120px] pr-1';
  const kbdCls = 'px-1.5 py-0.5 bg-[var(--cordel-surface-elevated)] border border-[var(--cordel-border-strong)] font-mono font-bold text-[10px] leading-tight text-[var(--cordel-text)] shadow-[1px_1px_0px_var(--cordel-shadow-color)] shrink-0';

  const renderRow = (label: string, keys: string[]) => (
    <div key={label} className={rowCls}>
      <span className={labelCls}>{label}</span>
      <div className="flex flex-wrap justify-end gap-1 shrink-0">
        {keys.map((k) => (
          <kbd key={k} className={kbdCls}>{k}</kbd>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-y-2.5 overflow-y-auto custom-scrollbar flex-grow pr-1">
      {/* Encart Roda & Pistes : 100 % Lecture + Popover */}
      <div className="bg-[var(--cordel-surface-elevated)] border-2 border-[var(--cordel-border-strong)] p-2 text-[10px] text-[var(--cordel-text)] leading-snug">
        <span className="font-cactus font-bold uppercase text-[var(--cordel-accent-readable)] block mb-0.5">
          {isFr ? 'Roda & Pistes : 100 % Lecture + Popover' : 'Roda & Pistas : 100 % Leitura + Popover'}
        </span>
        <span>
          {isFr
            ? "Un clic sur un pas ouvre sa fiche pédagogique (écoute isolée et bouton « Ouvrir dans l'Éditeur » en Studio). Aucun clic n'y modifie ni n'efface la partition."
            : 'Clicar num passo abre sua ficha pedagógica (escuta isolada e botão « Abrir no Editor » no Estúdio). Nenhum clique altera ou apaga a partitura.'}
        </span>
      </div>

      {/* Section 1 : Transport, Studio & 2 Écrans */}
      <div className="bg-[var(--cordel-bg)] cordel-border-sm p-2.5 flex flex-col gap-1.5">
        <h4 className="text-[11px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider font-cactus border-b border-[var(--cordel-border)]/25 pb-1">
          {t('shortcutsTransportTitle')}
        </h4>
        <div className="flex flex-col text-[10px] text-[var(--cordel-text)]">
          {renderRow(t('shortcutSpaceDesc'), [isFr ? 'Espace' : 'Espaço'])}
          {renderRow(t('shortcutStop12hDesc'), [isFr ? 'Shift + Espace' : 'Shift + Espaço'])}
          {renderRow(t('shortcutEnterDesc'), ['Enter', 'Home'])}
          {renderRow(t('shortcutRodaStepExploreDesc'), ['←', '→'])}
          {renderRow(t('shortcutTabDesc'), ['Tab'])}
          {renderRow(t('shortcutOficinaDesc'), ['O'])}
          {renderRow(t('shortcutLoopDesc'), ['L'])}
          {renderRow(t('shortcutMeasureNavDesc'), ['< / ,', '> / .'])}
          {renderRow(isFr ? 'Fenêtre Satellite (Mixeur / Éditeur / Oficina)' : 'Janela Satélite (Mix / Editor / Oficina)', [isFr ? '2 ÉCRANS' : '2 TELAS'])}
          {renderRow(t('shortcutUndoRedoDesc'), ['Ctrl+Z', 'Ctrl+Shift+Z / Y'])}
        </div>
      </div>

      {/* Section 2 : Éditeur Détail Instrument */}
      <div className="bg-[var(--cordel-bg)] cordel-border-sm p-2.5 flex flex-col gap-1.5">
        <h4 className="text-[11px] font-bold text-[var(--cordel-accent-readable)] uppercase tracking-wider font-cactus border-b border-[var(--cordel-border)]/25 pb-1">
          {t('shortcutsEditTitle')}
        </h4>
        <div className="flex flex-col text-[10px] text-[var(--cordel-text)]">
          {renderRow(isFr ? 'Peindre plusieurs pas en continu' : 'Pintar vários passos seguidos', [isFr ? 'Clic G glissé' : 'Arrastar Esq.'])}
          {renderRow(isFr ? 'Gommer en continu (1 seul Undo)' : 'Apagar contínuo (1 só Undo)', [isFr ? 'Clic D glissé' : 'Arrastar Dir.'])}
          {renderRow(t('shortcutWeakStrokesDesc'), ['d, e, g, a...'])}
          {renderRow(t('shortcutStrongStrokesDesc'), ['Shift + D, E...'])}
          {renderRow(t('shortcutNuanceWheelDesc'), ['↑ / ↓', isFr ? 'Molette' : 'Roda'])}
          {renderRow(t('shortcutSplitStepDesc'), [isFr ? 'Ciseau / Alt+Clic' : 'Tesoura / Alt+Clique'])}
          {renderRow(isFr ? 'Sélectionner une plage de pas' : 'Selecionar trecho de passos', ['Ctrl/Shift+Clic', isFr ? 'Sélect.' : 'Selec.'])}
          {renderRow(isFr ? 'Copier / Couper / Coller la plage' : 'Copiar / Cortar / Colar trecho', ['Ctrl+C / X / V'])}
          {renderRow(t('shortcutDuplicateMeasureDesc'), ['Ctrl + D'])}
          {renderRow(t('shortcutEraserDesc'), ['0', isFr ? 'Suppr / Retour' : 'Delete / Backspace'])}
          {renderRow(t('shortcutSpecialToolsDesc'), ['B / C / X'])}
          {renderRow(isFr ? 'Plein écran Éditeur & assignation pad USB' : 'Tela cheia do Editor & pad USB', [isFr ? 'Plein Écran' : 'Tela Cheia', 'MIDI Learn'])}
        </div>
      </div>
    </div>
  );
};
