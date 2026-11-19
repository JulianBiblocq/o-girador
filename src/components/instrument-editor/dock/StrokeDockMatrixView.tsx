/**
 * StrokeDockMatrixView.tsx — Matrice visuelle 2 lignes + mini-labels FR/BR + Zone Centrale (< 120 lignes).
 */
import React from 'react';
import { DockArrowDir, DockRowCellSpec, StrokeDockMatrixSpec } from './strokeDockMatrixTypes';
import { StrokeDockKeyPad } from './StrokeDockKeyPad';

interface StrokeDockMatrixViewProps {
  trackId: number;
  instrument: { id: string; type: string; colors: Record<string, string>; color?: string };
  spec: StrokeDockMatrixSpec;
  activeTool: string;
  isBrushSuppressed: boolean;
  isLeftHanded: boolean;
  isFr: boolean;
  onSelectTool: (tool: string) => void;
}

const DockDirectionArrow: React.FC<{ dir: DockArrowDir }> = ({ dir }) => {
  const path =
    dir === 'left' ? 'M9 5H1.5M4.5 2L1.5 5l3 3'
    : dir === 'right' ? 'M1 5h7.5M5.5 2l3 3-3 3'
    : dir === 'up' ? 'M5 9V1.5M2 4.5L5 1.5l3 3'
    : 'M5 1v7.5M2 5.5l3 3 3-3';
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      <path d={path} />
    </svg>
  );
};

export const StrokeDockMatrixView: React.FC<StrokeDockMatrixViewProps> = React.memo(({
  trackId, instrument, spec, activeTool, isBrushSuppressed, isLeftHanded, isFr, onSelectTool,
}) => {
  const isKeySelected = (sym: string) => !isBrushSuppressed && activeTool === sym;

  const renderRowCell = (cell: DockRowCellSpec) => {
    if (cell.kind === 'empty') {
      return (
        <div
          aria-hidden="true"
          className="w-12 h-[26px] border border-dashed border-[var(--cordel-ink-dark)]/18 bg-[var(--cordel-parchment-panel)]/45 rounded-none pointer-events-none shrink-0"
        />
      );
    }
    if (cell.kind === 'single') {
      return (
        <StrokeDockKeyPad
          trackId={trackId} instrument={instrument} symbol={cell.key.symbol} customTitle={cell.key.title}
          variant="single" isSelected={isKeySelected(cell.key.symbol)}
          isLeftHanded={isLeftHanded} isFr={isFr} onSelectTool={onSelectTool}
        />
      );
    }
    return (
      <div className="flex items-center gap-[2px]">
        <StrokeDockKeyPad
          trackId={trackId} instrument={instrument} symbol={cell.strong.symbol} customTitle={cell.strong.title}
          variant="strong" isSelected={isKeySelected(cell.strong.symbol)}
          isLeftHanded={isLeftHanded} isFr={isFr} onSelectTool={onSelectTool}
        />
        <StrokeDockKeyPad
          trackId={trackId} instrument={instrument} symbol={cell.weak.symbol} customTitle={cell.weak.title}
          variant="weak" isSelected={isKeySelected(cell.weak.symbol)}
          isLeftHanded={isLeftHanded} isFr={isFr} onSelectTool={onSelectTool}
        />
      </div>
    );
  };

  return (
    <div data-testid="stroke-dock-matrix" data-family={spec.familyId} className="flex items-end gap-1.5 sm:gap-2 shrink-0">
      {spec.rows && spec.directionalCols.length > 0 && (
        <div className="flex flex-col gap-[3px] shrink-0 pr-0.5">
          <div className="h-[13px]" aria-hidden="true" />
          {spec.rows.map((row, idx) => (
            <div
              key={idx}
              title={row.title || row.text}
              className="h-[26px] flex items-center justify-end gap-1 text-[9.5px] font-cactus font-bold uppercase tracking-tight text-[var(--cordel-ink-dark)]/85 whitespace-nowrap"
            >
              {row.arrow && <DockDirectionArrow dir={row.arrow} />}
              <span>{row.text}</span>
            </div>
          ))}
        </div>
      )}

      {spec.directionalCols.map((col) => (
        <div key={col.id} className="flex flex-col items-center gap-[3px] shrink-0">
          <span className="h-[13px] flex items-center text-[9px] leading-none font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text-muted)] whitespace-nowrap">
            {col.label}
          </span>
          {renderRowCell(col.top)}
          {renderRowCell(col.bottom)}
        </div>
      ))}

      {spec.directionalCols.length > 0 && spec.centralCols.length > 0 && (
        <div className="h-[52px] w-[1px] bg-[var(--cordel-ink-dark)]/20 shrink-0 mx-0.5 self-end" aria-hidden="true" />
      )}

      {spec.centralCols.map((col) => (
        <div key={col.id} className="flex flex-col items-center gap-[3px] shrink-0">
          <span className="h-[13px] flex items-center text-[9px] leading-none font-cactus font-bold uppercase tracking-wider text-[var(--cordel-text-muted)] whitespace-nowrap">
            {col.label}
          </span>
          {col.kind === 'tall' ? (
            <StrokeDockKeyPad
              trackId={trackId} instrument={instrument} symbol={col.key.symbol} customTitle={col.key.title}
              variant="tall" isSelected={isKeySelected(col.key.symbol)}
              isLeftHanded={isLeftHanded} isFr={isFr} onSelectTool={onSelectTool}
            />
          ) : (
            <div className="flex flex-col gap-[3px] w-[67px]">
              <StrokeDockKeyPad
                trackId={trackId} instrument={instrument} symbol={col.main.symbol} customTitle={col.main.title}
                variant="barulhoMain" isSelected={isKeySelected(col.main.symbol)}
                isLeftHanded={isLeftHanded} isFr={isFr} onSelectTool={onSelectTool}
              />
              <div className="flex items-center gap-[2px] w-full">
                {col.minis.map((m) => (
                  <StrokeDockKeyPad
                    key={m.symbol} trackId={trackId} instrument={instrument} symbol={m.symbol} customTitle={m.title}
                    variant="barulhoMini" isSelected={isKeySelected(m.symbol)}
                    isLeftHanded={isLeftHanded} isFr={isFr} onSelectTool={onSelectTool}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

StrokeDockMatrixView.displayName = 'StrokeDockMatrixView';
