/**
 * Hook d'orchestration pour le rognage et le rescan ciblé Vision (< 135 lignes).
 * Gestion d'état pour la modale Cordel sans alert/prompt natif.
 */
import { useState, useRef, useCallback } from 'react';
import { PaperSectionItem } from '../../utils/paper/paperSectionRenamer';
import { PatternMetricOverride } from '../../types/paperWorkshop.types';
import { analyzePaperImageWithVision } from '../../utils/paper/paperVisionScanService';
import { processVisionPatternData, ProcessedVisionPattern } from '../../utils/paper/paperPatternMergeHelper';
import { resolvePupitreAbbr } from '../../utils/paper/paperNomenclatureHelper';
import { ScanStatusBannerData } from '../../components/paper/PaperScanStatusBanner';
import { CordelDialogState } from '../../components/paper/PaperScanCordelDialog';
import { hydrateFullScanResponse, FullScanHydrationResult } from '../../utils/paper/paperFullScanHydrator';

type ScanTarget = 'full' | { type: 'pattern'; sectionName: string } | { type: 'new_pattern' } | { type: 'sequence' };

interface ActionsParams {
  globalTimeSig: string; sections: PaperSectionItem[]; lang: 'fr' | 'pt'; scoreId: string;
  onRescanPattern: (secName: string, data: ProcessedVisionPattern) => void;
  onAddNewPattern: (data: ProcessedVisionPattern) => string | void;
  onRescanSequence: (tokens: string[]) => void;
  onFullScanResult?: (data: FullScanHydrationResult) => void;
  onHighlightTarget?: (target: string) => void;
  setMetricOverrides: React.Dispatch<React.SetStateAction<Record<string, PatternMetricOverride>>>;
  setPhotoPreview: (src: string | null) => void;
}

export function usePaperScanCropActions({
  globalTimeSig, sections, scoreId, onRescanPattern, onAddNewPattern, onRescanSequence,
  onFullScanResult, onHighlightTarget, setMetricOverrides, setPhotoPreview, lang,
}: ActionsParams) {
  const isFr = lang === 'fr';
  const [scanTarget, setScanTarget] = useState<ScanTarget>('full');
  const [cropModal, setCropModal] = useState<{ isOpen: boolean; imageSrc: string; title: string } | null>(null);
  const [scanBanner, setScanBanner] = useState<ScanStatusBannerData | null>(null);
  const [cordelDialog, setCordelDialog] = useState<CordelDialogState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showError = useCallback((msg: string, code?: string) => {
    setScanBanner({ type: 'error', message: msg });
    setCordelDialog({ isOpen: true, type: 'error', message: msg, techCode: code });
    setIsAnalyzing(false);
  }, []);

  const promptUserKey = useCallback((isRetry = false): Promise<string | null> => new Promise((resolve) => {
    setCordelDialog({
      isOpen: true, type: 'prompt_key',
      message: isRetry ? (isFr ? 'Clé non autorisée (400/403). Saisissez une clé valide :' : 'Chave inválida (400/403). Insira uma chave válida :')
        : (isFr ? 'Clé d\'accès requise pour le scan. Collez votre clé :' : 'Chave necessária para o serviço. Cole sua chave :'),
      onConfirm: (val) => { setCordelDialog(null); resolve(val || null); },
      onCancel: () => { setCordelDialog(null); resolve(null); },
    });
  }), [isFr]);

  const startScan = useCallback((target: ScanTarget) => {
    setScanTarget(target);
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const src = ev.target?.result as string;
      let title = isFr ? 'Cadrer la partition' : 'Enquadrar partitura';
      if (typeof scanTarget === 'object') {
        title = scanTarget.type === 'pattern' ? `Rescan : "${scanTarget.sectionName}"` : (scanTarget.type === 'new_pattern' ? (isFr ? 'Scanner un nouveau motif' : 'Escanear novo padrão') : (isFr ? 'Rescan du conducteur' : 'Rescan do condutor'));
      }
      setCropModal({ isOpen: true, imageSrc: src, title });
    };
    r.readAsDataURL(f);
  }, [isFr, scanTarget]);

  const handleCropConfirm = useCallback(async (processedDataUrl: string) => {
    setCropModal(null);
    if (scanTarget === 'full') {
      setPhotoPreview(processedDataUrl);
      setIsAnalyzing(true);
      setScanBanner({ type: 'loading', message: isFr ? 'Scan de la partition complète...' : 'Escaneando partitura completa...' });
      const res = await analyzePaperImageWithVision(processedDataUrl, { mode: 'full_page', lang }, promptUserKey);
      if (!res.success) return showError(res.error || (isFr ? 'Échec de la lecture de la partition.' : 'Falha na leitura da partitura.'), res.techCode);
      const hydrated = hydrateFullScanResponse(res, globalTimeSig, scoreId);
      if (!hydrated || hydrated.sections.length === 0) return showError(isFr ? 'Aucun motif reconnu sur la partition.' : 'Nenhum padrão reconhecido na partitura.', 'EMPTY_FULL_SCAN');
      onFullScanResult?.(hydrated);
      setMetricOverrides((prev) => ({ ...prev, ...hydrated.metricOverrides }));
      if (hydrated.sections[0]) onHighlightTarget?.(hydrated.sections[0].name);
      setScanBanner({ type: 'success', message: isFr ? `${hydrated.sections.length} motif(s) et séquence mis à jour` : `${hydrated.sections.length} padrão(ões) e sequência atualizados` });
      setIsAnalyzing(false);
      return;
    }
    if (typeof scanTarget === 'object' && scanTarget.type === 'sequence') {
      setIsAnalyzing(true);
      setScanBanner({ type: 'loading', message: isFr ? 'Lecture du conducteur en cours...' : 'Leitura do condutor...' });
      const res = await analyzePaperImageWithVision(processedDataUrl, { mode: 'sequence_only', existingSectionNames: sections.map((s) => s.name), lang }, promptUserKey);
      if (!res.success || !res.sequence || res.sequence.length === 0) return showError(res.error || (isFr ? 'Échec de la lecture de la séquence.' : 'Falha na leitura do condutor.'), res.techCode);
      onRescanSequence(res.sequence);
      onHighlightTarget?.('__sequence__');
      setScanBanner({ type: 'success', message: isFr ? `Conducteur mis à jour (${res.sequence.length} étapes)` : `Condutor atualizado (${res.sequence.length} passos)` });
      setIsAnalyzing(false);
      return;
    }
    const isNew = typeof scanTarget === 'object' && scanTarget.type === 'new_pattern';
    const secName = typeof scanTarget === 'object' && scanTarget.type === 'pattern' ? scanTarget.sectionName : undefined;
    setIsAnalyzing(true);
    setScanBanner({ type: 'loading', message: isFr ? `Scan du motif ${secName ? `"${secName}"` : ''}...` : `Escaneamento do padrão ${secName ? `"${secName}"` : ''}...` });
    const res = await analyzePaperImageWithVision(processedDataUrl, { mode: 'single_pattern', targetSectionName: secName, lang }, promptUserKey);
    if (!res.success || !res.pattern) return showError(res.error || (isFr ? 'Échec de la numérisation du motif.' : 'Falha no escaneamento.'), res.techCode);
    const processed = processVisionPatternData(res.pattern, globalTimeSig);
    const roleKeys = Object.keys(processed.pupitreMap);
    if (roleKeys.length === 0) return showError(isFr ? "Aucune ligne d'instrument reconnue sur l'image." : 'Nenhuma linha reconhecida.', 'EMPTY_GRID');
    const abbrs = roleKeys.map((k) => resolvePupitreAbbr(k)).join(', ');
    if (isNew) {
      const createdName = onAddNewPattern(processed) || processed.name;
      setMetricOverrides((prev) => ({ ...prev, [createdName]: processed.metricOverride }));
      onHighlightTarget?.(createdName);
    } else if (secName) {
      onRescanPattern(secName, processed);
      setMetricOverrides((prev) => ({ ...prev, [secName]: processed.metricOverride }));
      onHighlightTarget?.(secName);
    }
    setScanBanner({ type: 'success', message: isFr ? `Motif "${processed.name}" mis à jour : ${roleKeys.length} pupitres (${abbrs})` : `Padrão "${processed.name}" atualizado : ${roleKeys.length} pupitres (${abbrs})` });
    setIsAnalyzing(false);
  }, [scanTarget, setPhotoPreview, sections, lang, globalTimeSig, scoreId, onRescanSequence, onAddNewPattern, onHighlightTarget, setMetricOverrides, onRescanPattern, onFullScanResult, promptUserKey, showError, isFr]);

  return {
    cropModal, fileInputRef, handleFileInputChange, handleCropConfirm,
    handleCropCancel: () => setCropModal(null), scanBanner, setScanBanner, isAnalyzing, cordelDialog,
    closeCordelDialog: () => setCordelDialog(null), triggerFullScan: () => startScan('full'),
    triggerPatternRescan: (secName: string) => startScan({ type: 'pattern', sectionName: secName }),
    triggerAddNewPatternScan: () => startScan({ type: 'new_pattern' }),
    triggerSequenceRescan: () => startScan({ type: 'sequence' }),
  };
}
