/**
 * Hook d'orchestration pour le rognage et le rescan ciblé Vision (< 100 lignes).
 */
import { useState, useRef, useCallback } from 'react';
import { PaperSectionItem } from '../../utils/paper/paperSectionRenamer';
import { PatternMetricOverride } from '../../types/paperWorkshop.types';
import { analyzePaperImageWithVision } from '../../utils/paper/paperVisionScanService';
import { processVisionPatternData, ProcessedVisionPattern } from '../../utils/paper/paperPatternMergeHelper';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { ScanStatusBannerData } from '../../components/paper/PaperScanStatusBanner';

type ScanTarget = 'full' | { type: 'pattern'; sectionName: string } | { type: 'new_pattern' } | { type: 'sequence' };

interface ActionsParams {
  globalTimeSig: string;
  sections: PaperSectionItem[];
  onRescanPattern: (secName: string, data: ProcessedVisionPattern) => void;
  onAddNewPattern: (data: ProcessedVisionPattern) => void;
  onRescanSequence: (tokens: string[]) => void;
  setMetricOverrides: React.Dispatch<React.SetStateAction<Record<string, PatternMetricOverride>>>;
  setPhotoPreview: (src: string | null) => void;
  lang: 'fr' | 'pt';
}

export function usePaperScanCropActions({
  globalTimeSig, sections, onRescanPattern, onAddNewPattern,
  onRescanSequence, setMetricOverrides, setPhotoPreview, lang,
}: ActionsParams) {
  const isFr = lang === 'fr';
  const [scanTarget, setScanTarget] = useState<ScanTarget>('full');
  const [cropModal, setCropModal] = useState<{ isOpen: boolean; imageSrc: string; title: string } | null>(null);
  const [scanBanner, setScanBanner] = useState<ScanStatusBannerData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startScan = useCallback((target: ScanTarget) => {
    setScanTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const src = ev.target?.result as string;
      let title = isFr ? 'Cadrer la partition' : 'Enquadrar partitura';
      if (typeof scanTarget === 'object') {
        if (scanTarget.type === 'pattern') title = isFr ? `Rescan ciblé : "${scanTarget.sectionName}"` : `Rescan do padrão : "${scanTarget.sectionName}"`;
        else if (scanTarget.type === 'new_pattern') title = isFr ? 'Scanner un nouveau motif seul' : 'Escanear novo padrão';
        else if (scanTarget.type === 'sequence') title = isFr ? 'Rescan ciblé de la séquence / conducteur' : 'Rescan do condutor';
      }
      setCropModal({ isOpen: true, imageSrc: src, title });
    };
    r.readAsDataURL(f);
  }, [isFr, scanTarget]);

  const handleCropConfirm = useCallback(async (processedDataUrl: string) => {
    setCropModal(null);
    if (scanTarget === 'full') {
      setPhotoPreview(processedDataUrl);
      return;
    }
    if (typeof scanTarget === 'object' && scanTarget.type === 'sequence') {
      setIsAnalyzing(true);
      setScanBanner({ type: 'loading', message: isFr ? 'Analyse Gemini Vision du conducteur...' : 'Análise Gemini Vision...' });
      const res = await analyzePaperImageWithVision(processedDataUrl, { mode: 'sequence_only', existingSectionNames: sections.map((s) => s.name), lang });
      if (!res.success || !res.sequence || res.sequence.length === 0) {
        const errMsg = res.error || (isFr ? 'Échec de la lecture de la séquence.' : 'Falha na leitura do condutor.');
        setScanBanner({ type: 'error', message: errMsg });
        if (typeof window !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)) window.alert(errMsg);
        setIsAnalyzing(false);
        return;
      }
      onRescanSequence(res.sequence);
      setScanBanner({ type: 'success', message: isFr ? `Conducteur mis à jour (${res.sequence.length} étapes)` : `Condutor atualizado (${res.sequence.length} passos)` });
      setIsAnalyzing(false);
      return;
    }
    const isNew = typeof scanTarget === 'object' && scanTarget.type === 'new_pattern';
    const secName = typeof scanTarget === 'object' && scanTarget.type === 'pattern' ? scanTarget.sectionName : undefined;
    setIsAnalyzing(true);
    setScanBanner({ type: 'loading', message: isFr ? `Analyse Gemini Vision de ${secName ? `"${secName}"` : 'motif'}...` : 'Análise Gemini Vision...' });
    const res = await analyzePaperImageWithVision(processedDataUrl, { mode: 'single_pattern', targetSectionName: secName, lang });
    if (!res.success || !res.pattern) {
      const errMsg = res.error || (isFr ? "Échec de l'analyse Vision du motif." : "Falha na análise Vision do padrão.");
      setScanBanner({ type: 'error', message: errMsg });
      if (typeof window !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)) window.alert(errMsg);
      setIsAnalyzing(false);
      return;
    }
    const processed = processVisionPatternData(res.pattern, globalTimeSig);
    const roleKeys = Object.keys(processed.pupitreMap);
    if (roleKeys.length === 0) {
      const errMsg = isFr ? "Aucune ligne d'instrument reconnue sur l'image." : "Nenhuma linha reconhecida.";
      setScanBanner({ type: 'error', message: errMsg });
      if (typeof window !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)) window.alert(errMsg);
      setIsAnalyzing(false);
      return;
    }
    const abbrs = roleKeys.map((k) => resolvePupitreAbbr(k)).join(', ');
    if (isNew) {
      onAddNewPattern(processed);
      setMetricOverrides((prev) => ({ ...prev, [processed.name]: processed.metricOverride }));
    } else if (secName) {
      onRescanPattern(secName, processed);
      setMetricOverrides((prev) => ({ ...prev, [secName]: processed.metricOverride }));
    }
    setScanBanner({ type: 'success', message: isFr ? `Motif "${processed.name}" mis à jour : ${roleKeys.length} pupitres (${abbrs})` : `Padrão "${processed.name}" atualizado : ${roleKeys.length} pupitres (${abbrs})` });
    setIsAnalyzing(false);
  }, [scanTarget, setPhotoPreview, sections, lang, globalTimeSig, onRescanSequence, onAddNewPattern, setMetricOverrides, onRescanPattern]);

  return {
    cropModal, fileInputRef, handleFileInputChange, handleCropConfirm,
    handleCropCancel: () => setCropModal(null),
    scanBanner, setScanBanner, isAnalyzing,
    triggerFullScan: () => startScan('full'),
    triggerPatternRescan: (secName: string) => startScan({ type: 'pattern', sectionName: secName }),
    triggerAddNewPatternScan: () => startScan({ type: 'new_pattern' }),
    triggerSequenceRescan: () => startScan({ type: 'sequence' }),
  };
}
