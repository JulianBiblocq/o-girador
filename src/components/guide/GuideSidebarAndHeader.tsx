import React from 'react';
import { Search, X, Compass } from 'lucide-react';
import { XiloSun, XiloMoon } from '../XiloIcons';
import { GuidePoleDef, GuidePoleId } from '../../data/guide/guideTypes';

interface GuideHeaderBarProps {
  isFr: boolean;
  isDarkMode: boolean;
  onSetLang: (lang: 'fr' | 'pt') => void;
  onToggleDarkMode?: () => void;
  onStartTour: () => void;
  onClose: () => void;
}

export const GuideHeaderBar: React.FC<GuideHeaderBarProps> = ({
  isFr,
  isDarkMode,
  onSetLang,
  onToggleDarkMode,
  onStartTour,
  onClose,
}) => (
  <header className="px-4 sm:px-6 py-3 bg-[var(--cordel-surface)] border-b-2 border-[var(--cordel-border-strong)] flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-paper-surface)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] shrink-0">
        <img src="/o-girador-logo.webp" alt="O Girador" className="w-full h-full object-cover scale-[1.04] block" />
      </div>
      <div className="min-w-0">
        <h2 className="font-cactus font-bold text-base sm:text-xl uppercase tracking-wider text-[var(--cordel-text)] truncate">
          O Girador — {isFr ? "Mode d'Emploi Complet" : 'Manual Completo de Uso'}
        </h2>
        <p className="text-[11px] text-[var(--cordel-text-muted)] truncate">
          {isFr ? 'Sequenciador · Panorama Général & 5 Pôles (20 Fiches)' : 'Sequenciador · Panorama Geral & 5 Polos (20 Fichas)'}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onStartTour}
        className="px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-wood)] text-[var(--cordel-text)] hover:text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer transition-colors"
      >
        <Compass size={14} className="shrink-0" />
        <span className="hidden sm:inline">{isFr ? 'Visite Guidée' : 'Visita Guiada'}</span>
      </button>

      {onToggleDarkMode && (
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-9 h-8 flex items-center justify-center bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] cursor-pointer hover:bg-[var(--cordel-surface-elevated)]"
          title={isFr ? 'Mode clair / Mode sombre' : 'Modo claro / Modo escuro'}
        >
          {isDarkMode ? <XiloSun size={16} /> : <XiloMoon size={15} />}
        </button>
      )}

      <div className="flex border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-bg)] text-xs font-cactus font-bold">
        <button type="button" onClick={() => onSetLang('fr')} className={`px-2.5 py-1 cursor-pointer ${isFr ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'text-[var(--cordel-text)]'}`}>FR</button>
        <button type="button" onClick={() => onSetLang('pt')} className={`px-2.5 py-1 border-l-2 border-[var(--cordel-border-strong)] cursor-pointer ${!isFr ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]' : 'text-[var(--cordel-text)]'}`}>BR</button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-9 h-8 flex items-center justify-center bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-2 border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer"
        title={isFr ? 'Fermer (Échap)' : 'Fechar (Esc)'}
      >
        <X size={17} />
      </button>
    </div>
  </header>
);

interface GuideSidebarNavProps {
  poles: GuidePoleDef[];
  activePoleId: GuidePoleId;
  searchQuery: string;
  isFr: boolean;
  onSelectPole: (id: GuidePoleId) => void;
  onSearchChange: (q: string) => void;
}

export const GuideSidebarNav: React.FC<GuideSidebarNavProps> = ({
  poles,
  activePoleId,
  searchQuery,
  isFr,
  onSelectPole,
  onSearchChange,
}) => (
  <aside className="w-full md:w-68 lg:w-72 shrink-0 bg-[var(--cordel-surface)] border-b-2 md:border-b-0 md:border-r-2 border-[var(--cordel-border)] p-3 flex flex-col gap-3 select-none">
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={isFr ? 'Rechercher une action...' : 'Pesquisar uma ação...'}
        className="w-full pl-3 pr-8 py-1.5 text-xs bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] placeholder:text-[var(--cordel-text-muted)]/70 outline-none"
      />
      {searchQuery ? (
        <button type="button" onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--cordel-text-muted)] hover:text-[var(--cordel-text)] cursor-pointer">
          <X size={13} />
        </button>
      ) : (
        <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--cordel-text-muted)] pointer-events-none" />
      )}
    </div>

    <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible custom-scrollbar pb-1 md:pb-0">
      {poles.map((pole) => {
        const isActive = !searchQuery.trim() && pole.id === activePoleId;
        return (
          <button
            key={pole.id}
            type="button"
            onClick={() => { onSearchChange(''); onSelectPole(pole.id); }}
            className={`shrink-0 md:w-full text-left px-3 py-2 border-2 font-cactus font-bold text-xs uppercase flex items-center gap-2 cursor-pointer transition-colors ${
              isActive
                ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
                : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-[var(--cordel-border)] hover:bg-[var(--cordel-surface-elevated)]'
            }`}
          >
            <span className={`font-mono text-[10px] px-1.5 py-0.5 border ${isActive ? 'border-[var(--cordel-on-accent)]/50' : 'border-[var(--cordel-border)] text-[var(--cordel-accent-readable)]'}`}>
              {pole.num}
            </span>
            <span className="truncate">{isFr ? pole.titleFr : pole.titlePt}</span>
          </button>
        );
      })}
    </nav>
  </aside>
);
