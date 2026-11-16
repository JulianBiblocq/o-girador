import React from 'react';
import { OficinaSectionId } from '../../stores/useSequencerSettingsStore';
import { OficinaSectionIcon } from '../oficina/OficinaSectionIcons';
import { OficinaDomainGroup } from './settingsSections';

interface OficinaSidebarNavProps {
  domains: OficinaDomainGroup[];
  activeSection: OficinaSectionId;
  onSelectSection: (sectionId: OficinaSectionId) => void;
}

export const OficinaSidebarNav: React.FC<OficinaSidebarNavProps> = ({
  domains,
  activeSection,
  onSelectSection,
}) => {
  const activeDomain =
    domains.find((dom) => dom.items.some((item) => item.id === activeSection)) ?? domains[0];

  return (
    <>
      {/* Rail latéral gauche fixe sur Desktop */}
      <aside
        data-testid="oficina-sidebar-nav"
        className="hidden md:flex md:flex-col md:w-60 lg:w-64 shrink-0 border-r-[2px] border-[var(--cordel-border)] bg-[var(--cordel-surface)] overflow-y-auto custom-scrollbar p-3 gap-4 select-none"
      >
        {domains.map((dom) => (
          <div key={dom.id} data-tour-id={`oficina-domain-${dom.id}`} className="flex flex-col gap-1">
            <div className="text-[10px] font-cactus font-black tracking-widest uppercase text-[var(--cordel-accent-readable)] px-2 pb-1 border-b border-[var(--cordel-border)]/40">
              {dom.label}
            </div>
            <div className="flex flex-col gap-1 pt-0.5">
              {dom.items.map((item) => {
                const isActive = !item.isAction && activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`oficina-nav-${item.id}`}
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full text-left px-2.5 py-2 font-cactus font-bold text-xs uppercase flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[1.5px] border-[var(--cordel-border-strong)] shadow-[2px_2px_0px_var(--cordel-shadow-color)]'
                        : 'bg-transparent text-[var(--cordel-text)] border-[1.5px] border-transparent hover:bg-[var(--cordel-surface-elevated)] hover:border-[var(--cordel-border)]/60'
                    }`}
                  >
                    <OficinaSectionIcon sectionId={item.id} className="w-4 h-4 shrink-0 text-current" />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* Barre horizontale fluide par domaine sur Mobile */}
      <nav
        data-testid="oficina-mobile-nav"
        className="flex md:hidden flex-col shrink-0 border-b-[2px] border-[var(--cordel-border)] bg-[var(--cordel-surface)] select-none"
      >
        <div className="grid grid-cols-3 border-b border-[var(--cordel-border)]/45">
          {domains.map((dom) => {
            const isDomActive = dom.id === activeDomain.id;
            const firstTab = dom.items.find((it) => !it.isAction) ?? dom.items[0];
            return (
              <button
                key={dom.id}
                type="button"
                data-testid={`oficina-domain-tab-${dom.id}`}
                data-tour-id={`oficina-domain-${dom.id}`}
                onClick={() => {
                  if (!isDomActive && firstTab) onSelectSection(firstTab.id);
                }}
                className={`py-2 px-1.5 font-cactus font-black text-[10px] uppercase tracking-wider border-r last:border-r-0 border-[var(--cordel-border)]/45 truncate cursor-pointer transition-colors ${
                  isDomActive
                    ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)]'
                    : 'bg-[var(--cordel-surface-muted)] text-[var(--cordel-text-muted)] hover:text-[var(--cordel-text)]'
                }`}
              >
                {dom.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-2 overflow-x-auto custom-scrollbar bg-[var(--cordel-bg)]">
          {activeDomain.items.map((item) => {
            const isActive = !item.isAction && activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`oficina-mobile-tab-${item.id}`}
                onClick={() => onSelectSection(item.id)}
                className={`shrink-0 px-2.5 py-1.5 font-cactus font-bold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] border-[1.5px] border-[var(--cordel-border-strong)] shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)]'
                    : 'bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-[1.5px] border-[var(--cordel-border)] hover:bg-[var(--cordel-surface-elevated)]'
                }`}
              >
                <OficinaSectionIcon sectionId={item.id} className="w-3.5 h-3.5 shrink-0 text-current" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
