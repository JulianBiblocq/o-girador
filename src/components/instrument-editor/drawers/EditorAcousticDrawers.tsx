import React from 'react';
import { StrokeInspectorPanel } from '../StrokeInspectorPanel';
import { Pattern, Language } from '../../../types';

export interface EditorAcousticDrawersProps {
  trackId: number;
  inst: any;
  lang: Language;
  isLeftHanded: boolean;
  activeTool: string;
  onSelectTool?: (tool: string) => void;
  isExpandedLayout?: boolean;
  patternId?: number;
  patterns: Pattern[];
  canPaste: boolean;
  balancoPresets: Array<{ id: string; name: string }>;
  onSelectPattern: (id: number) => void;
  onAddPattern: () => void;
  onCopyPattern: () => void;
  onPastePattern: () => void;
  onSavePattern: () => void;
  onLoadPattern: () => void;
  onDeletePattern: (id: number) => void;
  onBalancoChange: (trackId: number, patternId: number, presetId: string | undefined, amount: number) => void;
  isVoice: boolean;
  hasVocalRecording?: boolean;
  onOpenAlignment?: () => void;
  onImportAudio?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isInspectorMobileOpen: boolean;
  setIsInspectorMobileOpen: (open: boolean) => void;
}

export const EditorAcousticDrawers: React.FC<EditorAcousticDrawersProps> = React.memo((props) => {
  const {
    trackId, inst, lang, isLeftHanded, activeTool, onSelectTool, isExpandedLayout = false,
    patternId, patterns, canPaste, balancoPresets, onSelectPattern, onAddPattern,
    onCopyPattern, onPastePattern, onSavePattern, onLoadPattern, onDeletePattern,
    onBalancoChange, isVoice, hasVocalRecording, onOpenAlignment, onImportAudio,
    isInspectorMobileOpen, setIsInspectorMobileOpen,
  } = props;

  const panelProps = {
    trackId, instrument: inst, lang, isLeftHanded, activeTool, onSelectTool, isExpandedLayout,
    patternId, patterns, canPaste, balancoPresets, onSelectPattern, onAddPattern,
    onCopyPattern, onPastePattern, onSavePattern, onLoadPattern, onDeletePattern,
    onBalancoChange, isVoice, hasVocalRecording, onOpenAlignment, onImportAudio,
  };

  const desktopWidthCls = isExpandedLayout ? 'w-[460px] xl:w-[500px]' : 'w-[340px] sm:w-[360px]';

  return (
    <>
      <div className={`hidden lg:flex shrink-0 ${desktopWidthCls} h-full flex-col overflow-y-auto overflow-x-hidden border-l-[3px] border-[var(--cordel-ink-dark)] bg-[var(--cordel-parchment-surface)] relative z-10 box-border`}>
        <StrokeInspectorPanel {...panelProps} />
      </div>

      {isInspectorMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-[var(--cordel-ink-dark)]/50 backdrop-blur-xs animate-in fade-in duration-200"
          data-theme="light"
          style={{ colorScheme: 'light' }}
          onClick={() => setIsInspectorMobileOpen(false)}
        >
          <div
            className="bg-[var(--cordel-parchment-surface)] text-[var(--cordel-ink-dark)] border-t-[3px] border-[var(--cordel-ink-dark)] rounded-t-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            data-theme="light"
            style={{ colorScheme: 'light' }}
            onClick={(e) => e.stopPropagation()}
          >
            <StrokeInspectorPanel
              {...panelProps}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setIsInspectorMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
});

EditorAcousticDrawers.displayName = 'EditorAcousticDrawers';
