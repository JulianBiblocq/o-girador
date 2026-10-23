
import React from 'react';
import { BalancoPresetItem } from './inspectorTypes';

export interface StrokeInspectorPanelProps {
  trackId: number;
  instrument: {
    id: string;
    type: string;
    colors: Record<string, string>;
    name?: string;
    [key: string]: any;
  };
  lang: string;
  isLeftHanded: boolean;
  activeTool: string;
  patternId?: number;
  onCloseMobileDrawer?: () => void;
  isMobileDrawer?: boolean;
  patterns?: any[];
  canPaste?: boolean;
  balancoPresets?: BalancoPresetItem[];
  onSelectPattern?: (patternId: number) => void;
  onAddPattern?: () => void;
  onCopyPattern?: (pattern: any) => void;
  onPastePattern?: (patternId: number) => void;
  onSavePattern?: (patternId: number) => void;
  onLoadPattern?: (patternId: number) => void;
  onDeletePattern?: (patternId: number) => void;
  onBalancoChange?: (trackId: number, patternId: number, presetId: string | undefined, amount: number) => void;
  isVoice?: boolean;
  hasVocalRecording?: boolean;
  onOpenAlignment?: () => void;
  onImportAudio?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
