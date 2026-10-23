
export interface BalancoPresetItem {
  id: string;
  name: string;
}

export interface PatternInspectorHeaderProps {
  patterns: Array<{
    id: number;
    name?: string;
    balancoPresetId?: string;
    balancoAmount?: number;
    swingIntensity?: number;
    [key: string]: any;
  }>;
  currentPatternId?: number;
  trackId: number;
  lang: string;
  canPaste: boolean;
  balancoPresets?: BalancoPresetItem[];
  isVoice?: boolean;
  instrumentName?: string;
  onSelectPattern?: (patternId: number) => void;
  onAddPattern?: () => void;
  onCopyPattern?: (pattern?: any) => void;
  onPastePattern?: (patternId: number) => void;
  onSavePattern?: (patternId: number) => void;
  onLoadPattern?: (patternId: number) => void;
  onDeletePattern?: (patternId: number) => void;
  onBalancoChange?: (trackId: number, patternId: number, presetId: string | undefined, amount: number) => void;
}
