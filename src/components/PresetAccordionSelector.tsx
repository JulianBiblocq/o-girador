import React, { useState, useEffect } from 'react';

export interface PresetAccordionSelectorProps {
  lang: 'pt' | 'fr';
  activePreset: string;
  currentSongTitle?: string;
  publicCloudPresets: Array<{ id: string; name: string; visibility?: string }>;
  privateCloudPresets: Array<{ id: string; name: string; visibility?: string }>;
  localPresets?: string[];
  isCloudPresetsLoading: boolean;
  showGroupCatalogue: boolean;
  groupLabel: string | null;
  onSelectPreset: (presetValue: string, cloudId?: string) => void;
  className?: string;
}

export const PresetAccordionSelector: React.FC<PresetAccordionSelectorProps> = ({
  lang,
  activePreset,
  currentSongTitle,
  publicCloudPresets = [],
  privateCloudPresets = [],
  localPresets = [],
  isCloudPresetsLoading = false,
  showGroupCatalogue = false,
  groupLabel,
  onSelectPreset,
  className = '',
}) => {
  const [isGroupOpen, setIsGroupOpen] = useState<boolean>(showGroupCatalogue);
  const [isPublicOpen, setIsPublicOpen] = useState<boolean>(!showGroupCatalogue);
  const [isLocalOpen, setIsLocalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (showGroupCatalogue) {
      setIsGroupOpen(true);
      setIsPublicOpen(false);
    } else {
      setIsPublicOpen(true);
    }
  }, [showGroupCatalogue]);

  const handleItemClick = (val: string, cloudId?: string) => {
    if (cloudId && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('loadPreset', cloudId);
        window.history.replaceState(null, '', url.toString());
      } catch (e) {
        console.warn('URL sync error:', e);
      }
    }
    onSelectPreset(val, cloudId);
  };

  const groupTitle = lang === 'pt' ? `Catálogo ${groupLabel || 'do Grupo'}` : `Catalogue ${groupLabel || 'du Groupe'}`;
  const publicTitle = lang === 'pt' ? 'Catálogo Público' : 'Catalogue Public';

  const isItemActive = (val: string, name: string) =>
    activePreset === val || (currentSongTitle && currentSongTitle.trim().toLowerCase() === name.trim().toLowerCase());

  const renderPresetList = (items: Array<{ id: string; name: string }>, icon: string, emptyMsg: string) => (
    <div className="flex flex-col gap-1 p-1.5 pt-0 max-h-56 overflow-y-auto border-t border-[var(--cordel-border)]/20">
      {isCloudPresetsLoading && items.length === 0 ? (
        <div className="px-2 py-2 text-xs italic text-[var(--cordel-subtext)] text-center">
          {lang === 'pt' ? '(Carregando catálogo...)' : '(Chargement du catalogue...)'}
        </div>
      ) : items.length > 0 ? (
        items.map((p) => {
          const active = isItemActive(`cloud:${p.id}`, p.name);
          return (
            <button
              key={`cloud:${p.id}`}
              type="button"
              onClick={() => handleItemClick(`cloud:${p.id}`, p.id)}
              className={`w-full text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between transition-colors cursor-pointer cordel-border-sm ${
                active ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-wood)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
              }`}
            >
              <span className="truncate flex items-center gap-1.5">
                <span className="text-xs">{icon}</span>
                <span className="truncate">{p.name}</span>
              </span>
              {active && <span className="text-[10px] shrink-0 font-sans ml-1">✓</span>}
            </button>
          );
        })
      ) : (
        <div className="px-2 py-2 text-xs italic text-[var(--cordel-subtext)] text-center">{emptyMsg}</div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold text-[var(--cordel-text)]/70 uppercase tracking-wider flex items-center gap-1">
          📚 {lang === 'pt' ? 'Catálogo de Ritmos' : 'Catalogue des Morceaux'}
        </span>
        {currentSongTitle && (
          <span className="text-[11px] font-cactus font-bold text-[var(--cordel-wood)] truncate">🎵 {currentSongTitle}</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        {showGroupCatalogue && (
          <div className="flex flex-col cordel-border-sm bg-[var(--cordel-bg)] overflow-hidden">
            <button
              type="button"
              onClick={() => setIsGroupOpen((prev) => !prev)}
              className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] font-cactus font-bold text-xs transition-colors cursor-pointer select-none text-left w-full"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-sm leading-none">🥁</span>
                <span className="truncate">{groupTitle}</span>
                <span className="text-[10px] opacity-60 font-sans">({privateCloudPresets.length})</span>
              </span>
              <span className="text-[9px] opacity-70 ml-1">{isGroupOpen ? '▼' : '▶'}</span>
            </button>
            {isGroupOpen && renderPresetList(privateCloudPresets, '🥁', lang === 'pt' ? '(Nenhum ritmo no grupo)' : '(Aucun morceau dans le groupe)')}
          </div>
        )}

        <div className="flex flex-col cordel-border-sm bg-[var(--cordel-bg)] overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPublicOpen((prev) => !prev)}
            className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] font-cactus font-bold text-xs transition-colors cursor-pointer select-none text-left w-full"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-sm leading-none">☁️</span>
              <span className="truncate">{publicTitle}</span>
              <span className="text-[10px] opacity-60 font-sans">({publicCloudPresets.length})</span>
            </span>
            <span className="text-[9px] opacity-70 ml-1">{isPublicOpen ? '▼' : '▶'}</span>
          </button>
          {isPublicOpen && renderPresetList(publicCloudPresets, '☁️', lang === 'pt' ? '(Nenhum ritmo público)' : '(Aucun morceau public)')}
        </div>

        {localPresets.length > 0 && (
          <div className="flex flex-col cordel-border-sm bg-[var(--cordel-bg)] overflow-hidden">
            <button
              type="button"
              onClick={() => setIsLocalOpen((prev) => !prev)}
              className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)]/10 text-[var(--cordel-text)] font-cactus font-bold text-xs transition-colors cursor-pointer select-none text-left w-full"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-sm leading-none">💾</span>
                <span className="truncate">{lang === 'pt' ? 'Meus Presets' : 'Mes Presets'}</span>
                <span className="text-[10px] opacity-60 font-sans">({localPresets.length})</span>
              </span>
              <span className="text-[9px] opacity-70 ml-1">{isLocalOpen ? '▼' : '▶'}</span>
            </button>
            {isLocalOpen && (
              <div className="flex flex-col gap-1 p-1.5 pt-0 max-h-48 overflow-y-auto border-t border-[var(--cordel-border)]/20">
                {localPresets.map((name) => (
                  <button
                    key={`local:${name}`}
                    type="button"
                    onClick={() => handleItemClick(`local:${name}`)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs font-cactus font-bold flex items-center justify-between transition-colors cursor-pointer cordel-border-sm ${
                      isItemActive(`local:${name}`, name) ? 'bg-[var(--cordel-wood)] text-[#f4ecd8] border-[var(--cordel-wood)]' : 'bg-[var(--cordel-bg)] text-[var(--cordel-text)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)]'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5"><span className="text-xs">💾</span><span className="truncate">{name}</span></span>
                    {isItemActive(`local:${name}`, name) && <span className="text-[10px] shrink-0 font-sans ml-1">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <select
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        value={activePreset}
        onChange={(e) => {
          const val = e.target.value;
          handleItemClick(val, val.startsWith('cloud:') ? val.replace('cloud:', '') : undefined);
        }}
      >
        <option value="" disabled>{currentSongTitle || (lang === 'pt' ? 'Escolha um ritmo' : 'Choisir un rythme')}</option>
        {showGroupCatalogue && (
          <optgroup label={groupTitle}>
            {privateCloudPresets.map((p) => (<option key={`og:${p.id}`} value={`cloud:${p.id}`}>🥁 {p.name}</option>))}
          </optgroup>
        )}
        <optgroup label={publicTitle}>
          {publicCloudPresets.map((p) => (<option key={`op:${p.id}`} value={`cloud:${p.id}`}>☁️ {p.name}</option>))}
        </optgroup>
      </select>
    </div>
  );
};
