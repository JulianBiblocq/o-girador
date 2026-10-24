/**
 * Onglet 2 : Scanner Photo, Relecture, Sauvegarde Cloud & Assemblage (< 150 lignes).
 */
import React, { useState, useMemo, useEffect } from 'react';
import { PaperPreset, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { SequenceTagBuilder, factorizeSequence } from './SequenceTagBuilder';
import { PaperPatternPreviewGrid } from './PaperPatternPreviewGrid';
import { PaperScannerUploadBar } from './PaperScannerUploadBar';
import { PaperScannerGlobalSettingsBanner } from './PaperScannerGlobalSettingsBanner';
import { PaperScannerBottomBar } from './PaperScannerBottomBar';
import { PaperResumeDraftBanner } from './PaperResumeDraftBanner';
import { injectPaperScoreToStore } from '../../utils/paper/injectPaperScoreToStore';
import { PaperInjectOptions } from '../../utils/paper/paperTrackBuilder';
import { PaperInjectOptionsBar } from './PaperInjectOptionsBar';
import { getAllAvailablePaperPresets } from '../../utils/paper/paperActiveSongExtractor';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { scanAndRegisterDoubtPoints } from '../../utils/paper/paperScanDoubtDetector';
import { PaperScannerMetadataDrawer } from './PaperScannerMetadataDrawer';
import { PresetMetadata } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { buildInitialSections, resolveUniqueExportNames } from '../../utils/paper/paperSectionRenamer';
import { usePaperScanDrafts } from '../../hooks/paper/usePaperScanDrafts';
import { PaperScanDraftDocument, autoSaveDraftOnInject } from '../../utils/paper/paperScanCloudStorage';
import { usePaperScannerWorkflow, mapPatternsToSectionIds } from '../../hooks/paper/usePaperScannerWorkflow';

interface Props { canImport: boolean; lang: 'fr' | 'pt'; onClose?: () => void; initialPreset?: PaperPreset; }

export const PaperScannerTab: React.FC<Props> = ({ canImport, lang, onClose, initialPreset }) => {
  const presetsList = useMemo(() => getAllAvailablePaperPresets(lang), [lang]);
  const activeInit = initialPreset || presetsList[0];
  const [selectedPreset, setSelectedPreset] = useState<PaperPreset>(() => activeInit);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [injectOpts, setInjectOpts] = useState<PaperInjectOptions>({ linkAlfaias: true, linkCaixas: true, caixasLinkMode: 'caixa_tarol' });
  const [metaOverrides, setMetaOverrides] = useState<Partial<PresetMetadata>>(() => ({ toada: activeInit.name }));
  const [dismissedDraftId, setDismissedDraftId] = useState<string | null>(null);

  const [globalBpm, setGlobalBpm] = useState<number>(() => activeInit.bpm || 96);
  const [globalTimeSig, setGlobalTimeSig] = useState<string>(() => activeInit.timeSig || '4/4');
  const [metricOverrides, setMetricOverrides] = useState<Record<string, PatternMetricOverride>>(() => (activeInit?.metricOverrides ? { ...activeInit.metricOverrides } : {}));

  const scoreId = selectedPreset.id || selectedPreset.name.toLowerCase().replace(/\s+/g, '_');
  const allPoints = usePaperVigilanceStore((state) => state.points);
  const vigilanceCount = useMemo(() => allPoints.filter((p) => p.scoreId === scoreId).length, [allPoints, scoreId]);

  const {
    draftsList, activeDraftId, setActiveDraftId, isSavingDraft,
    saveCurrentDraft, removeDraft, latestResumeableDraft, parseDraftPayload,
  } = usePaperScanDrafts(scoreId);

  const {
    sections, setSections, patternsById, setPatternsById, sequenceItems, setSequenceItems,
    reusableSections, setReusableSections, exportedPatterns, handleRenameSection, handleUpdateStep, handleSaveDraft,
  } = usePaperScannerWorkflow({
    initialPreset: selectedPreset, scoreId, globalBpm, globalTimeSig, metricOverrides,
    toadaTitle: metaOverrides.toada || selectedPreset.name, injectOpts, saveCurrentDraft, setActiveDraftId, lang,
  });

  useEffect(() => {
    if (initialPreset) {
      setSelectedPreset(initialPreset); setGlobalBpm(initialPreset.bpm || 96); setGlobalTimeSig(initialPreset.timeSig || '4/4');
      setMetaOverrides({ toada: initialPreset.name }); const newSecs = buildInitialSections(initialPreset.patterns);
      setSections(newSecs); setPatternsById(mapPatternsToSectionIds(initialPreset.patterns, newSecs));
      setSequenceItems(factorizeSequence(initialPreset.defaultSequence)); setActiveDraftId(null);
    }
  }, [initialPreset, setActiveDraftId, setSections, setPatternsById, setSequenceItems]);

  useEffect(() => { scanAndRegisterDoubtPoints(scoreId, exportedPatterns); usePaperVigilanceStore.getState().setActivePreviewScoreId(scoreId); }, [scoreId, exportedPatterns]);

  const handleSelectPreset = (p: PaperPreset) => {
    setSelectedPreset(p); setGlobalBpm(p.bpm || 96); setGlobalTimeSig(p.timeSig || '4/4');
    setMetaOverrides({ toada: p.name }); const pScoreId = p.id || p.name.toLowerCase().replace(/\s+/g, '_');
    const newSecs = buildInitialSections(p.patterns); setSections(newSecs); setPatternsById(mapPatternsToSectionIds(p.patterns, newSecs));
    setSequenceItems(factorizeSequence(p.defaultSequence)); setReusableSections(new Set()); setActiveDraftId(null);
    scanAndRegisterDoubtPoints(pScoreId, p.patterns); usePaperVigilanceStore.getState().setActivePreviewScoreId(pScoreId);
  };

  const handleLoadDraft = (draft: PaperScanDraftDocument) => {
    const payload = parseDraftPayload(draft); setActiveDraftId(draft.id); setSelectedPreset(payload.preset);
    setGlobalBpm(payload.preset.bpm || 96); setGlobalTimeSig(payload.preset.timeSig || '4/4'); setMetaOverrides({ toada: draft.title || payload.preset.name });
    if (payload.injectOptions) setInjectOpts(payload.injectOptions);
    if (payload.preset.metricOverrides) setMetricOverrides(payload.preset.metricOverrides);
    const ordered = (payload.orderedSectionNames?.length ? payload.orderedSectionNames : Object.keys(payload.preset.patterns || {}));
    const restoredSecs = ordered.map((name, i) => ({ id: `sec-${i}-${name.toLowerCase().replace(/\s+/g, '_')}`, name }));
    setSections(restoredSecs); const byId: Record<string, any> = {}; restoredSecs.forEach((s) => { byId[s.id] = payload.preset.patterns[s.name] || {}; });
    setPatternsById(byId); setSequenceItems(factorizeSequence(payload.preset.defaultSequence || []));
    payload.vigilancePoints?.forEach((pt) => usePaperVigilanceStore.getState().addPoint(pt));
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'success', message: lang === 'fr' ? `Import "${draft.title}" chargé !` : `Importação "${draft.title}" carregada!` } }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (ev) => { setPhotoPreview(ev.target?.result as string); setActiveDraftId(null); scanAndRegisterDoubtPoints(scoreId, exportedPatterns); };
    reader.readAsDataURL(file);
  };

  const handleInject = (openOnFirst = false) => {
    if (!canImport) { window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: lang === 'fr' ? 'Accès réservé au Mestre.' : 'Acesso reservado.' } })); return; }
    const uniqueNames = resolveUniqueExportNames(sections);
    const flattened = sequenceItems.flatMap((item) => Array(item.repeatCount).fill(((item as any).sectionId && uniqueNames[(item as any).sectionId]) || item.sectionName));
    const fullPreset = { ...selectedPreset, name: metaOverrides.toada || selectedPreset.name, bpm: globalBpm, timeSig: globalTimeSig, patterns: exportedPatterns, metricOverrides };
    const res = injectPaperScoreToStore(fullPreset, flattened, reusableSections, lang, openOnFirst, injectOpts, metaOverrides);
    if (res.success) { autoSaveDraftOnInject(metaOverrides.toada || selectedPreset.name, useSequencerStore.getState()); if (onClose) onClose(); }
  };

  const resumeBannerDraft = latestResumeableDraft && latestResumeableDraft.id !== dismissedDraftId ? latestResumeableDraft : null;

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      {resumeBannerDraft && <PaperResumeDraftBanner draft={resumeBannerDraft} onResume={handleLoadDraft} onDismiss={() => setDismissedDraftId(resumeBannerDraft.id)} lang={lang} />}
      <PaperScannerUploadBar photoPreview={photoPreview} onPhotoUpload={handlePhotoUpload} selectedPresetId={selectedPreset.id} presetsList={presetsList} onSelectPreset={handleSelectPreset} draftsList={draftsList} selectedDraftId={activeDraftId} onSelectDraft={handleLoadDraft} onDeleteDraft={removeDraft} lang={lang} />
      <PaperScannerGlobalSettingsBanner title={metaOverrides.toada || selectedPreset.name} onChangeTitle={(t) => setMetaOverrides((prev) => ({ ...prev, toada: t }))} bpm={globalBpm} onChangeBpm={setGlobalBpm} timeSig={globalTimeSig} onChangeTimeSig={setGlobalTimeSig} onApplyToAllPatterns={() => setMetricOverrides({})} linkAlfaias={Boolean(injectOpts.linkAlfaias)} onToggleLinkAlfaias={(v) => setInjectOpts((prev) => ({ ...prev, linkAlfaias: v }))} busCaixas={Boolean(injectOpts.linkCaixas)} onToggleBusCaixas={(v) => setInjectOpts((prev) => ({ ...prev, linkCaixas: v }))} busSementes={Boolean(injectOpts.busSementes)} onToggleBusSementes={(v) => setInjectOpts((prev) => ({ ...prev, busSementes: v }))} lang={lang} />
      <PaperPatternPreviewGrid scoreId={scoreId} sections={sections} patterns={patternsById} reusableSections={reusableSections} onToggleReusable={(sec) => setReusableSections((prev) => { const n = new Set(prev); if (n.has(sec)) n.delete(sec); else n.add(sec); return n; })} onRenameSection={handleRenameSection} onUpdateStep={handleUpdateStep} globalBpm={globalBpm} globalTimeSig={globalTimeSig} metricOverrides={metricOverrides} onSaveOverride={(pName, ov) => setMetricOverrides((prev) => { const next = { ...prev }; if (!ov) delete next[pName]; else next[pName] = ov; return next; })} lang={lang} />
      <SequenceTagBuilder availableSections={sections} sequenceItems={sequenceItems} onChangeSequence={setSequenceItems} lang={lang} />
      <PaperInjectOptionsBar preset={{ ...selectedPreset, patterns: exportedPatterns }} options={injectOpts} onChange={setInjectOpts} />
      <PaperScannerMetadataDrawer metadata={metaOverrides} onChange={(up) => setMetaOverrides((prev) => ({ ...prev, ...up }))} lang={lang} />
      <PaperScannerBottomBar canImport={canImport} sequenceItemsLength={sequenceItems.length} vigilanceCount={vigilanceCount} onInject={handleInject} onSaveDraft={handleSaveDraft} isSavingDraft={isSavingDraft} lang={lang} />
    </div>
  );
};
