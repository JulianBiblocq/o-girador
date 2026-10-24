/**
 * Onglet 2 : Scanner Photo, Relecture des Motifs, Réglages Globaux & Assemblage (< 140 lignes).
 */
import React, { useState, useMemo, useEffect } from 'react';
import { PaperPreset, PaperSequenceItem, PaperStepValue, PatternMetricOverride } from '../../types/paperWorkshop.types';
import { SequenceTagBuilder, factorizeSequence } from './SequenceTagBuilder';
import { PaperPatternPreviewGrid } from './PaperPatternPreviewGrid';
import { PaperScannerUploadBar } from './PaperScannerUploadBar';
import { PaperScannerGlobalSettingsBanner } from './PaperScannerGlobalSettingsBanner';
import { PaperScannerBottomBar } from './PaperScannerBottomBar';
import { injectPaperScoreToStore } from '../../utils/paper/injectPaperScoreToStore';
import { PaperInjectOptions } from '../../utils/paper/paperTrackBuilder';
import { PaperInjectOptionsBar } from './PaperInjectOptionsBar';
import { getAllAvailablePaperPresets } from '../../utils/paper/paperActiveSongExtractor';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { scanAndRegisterDoubtPoints } from '../../utils/paper/paperScanDoubtDetector';
import { disambiguateAllPresetPatterns } from '../../utils/paper/paperRoleDisambiguator';
import { PaperScannerMetadataDrawer } from './PaperScannerMetadataDrawer';
import { PresetMetadata } from '../../types';

interface Props { canImport: boolean; lang: 'fr' | 'pt'; onClose?: () => void; initialPreset?: PaperPreset; }

export const PaperScannerTab: React.FC<Props> = ({ canImport, lang, onClose, initialPreset }) => {
  const presetsList = useMemo(() => getAllAvailablePaperPresets(lang), [lang]);
  const activeInit = initialPreset || presetsList[0];
  const [selectedPreset, setSelectedPreset] = useState<PaperPreset>(() => activeInit);
  const [editablePatterns, setEditablePatterns] = useState(() => disambiguateAllPresetPatterns(JSON.parse(JSON.stringify(activeInit.patterns))));
  const [sequenceItems, setSequenceItems] = useState<PaperSequenceItem[]>(() => factorizeSequence(activeInit.defaultSequence));
  const [reusableSections, setReusableSections] = useState<Set<string>>(() => new Set());
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [injectOpts, setInjectOpts] = useState<PaperInjectOptions>({ linkAlfaias: true, linkCaixas: true, caixasLinkMode: 'caixa_tarol' });
  const [metaOverrides, setMetaOverrides] = useState<Partial<PresetMetadata>>(() => ({ toada: activeInit.name }));

  const [globalBpm, setGlobalBpm] = useState<number>(() => activeInit.bpm || 96);
  const [globalTimeSig, setGlobalTimeSig] = useState<string>(() => activeInit.timeSig || '4/4');
  const [metricOverrides, setMetricOverrides] = useState<Record<string, PatternMetricOverride>>(() => (activeInit?.metricOverrides ? { ...activeInit.metricOverrides } : {}));

  const scoreId = selectedPreset.id || selectedPreset.name.toLowerCase().replace(/\s+/g, '_');
  const allPoints = usePaperVigilanceStore((state) => state.points);
  const vigilanceCount = useMemo(() => allPoints.filter((p) => p.scoreId === scoreId).length, [allPoints, scoreId]);

  useEffect(() => {
    if (initialPreset) {
      setSelectedPreset(initialPreset);
      setGlobalBpm(initialPreset.bpm || 96);
      setGlobalTimeSig(initialPreset.timeSig || '4/4');
      setMetaOverrides({ toada: initialPreset.name });
      setEditablePatterns(disambiguateAllPresetPatterns(JSON.parse(JSON.stringify(initialPreset.patterns))));
      setSequenceItems(factorizeSequence(initialPreset.defaultSequence));
      setMetricOverrides(initialPreset.metricOverrides ? { ...initialPreset.metricOverrides } : {});
    }
  }, [initialPreset]);

  useEffect(() => { scanAndRegisterDoubtPoints(scoreId, editablePatterns); usePaperVigilanceStore.getState().setActivePreviewScoreId(scoreId); }, [scoreId]);

  const handleSelectPreset = (p: PaperPreset) => {
    setSelectedPreset(p);
    setGlobalBpm(p.bpm || 96);
    setGlobalTimeSig(p.timeSig || '4/4');
    setMetricOverrides(p.metricOverrides ? { ...p.metricOverrides } : {});
    setMetaOverrides({ toada: p.name });
    const pScoreId = p.id || p.name.toLowerCase().replace(/\s+/g, '_');
    const parsed = disambiguateAllPresetPatterns(JSON.parse(JSON.stringify(p.patterns)));
    setEditablePatterns(parsed);
    setSequenceItems(factorizeSequence(p.defaultSequence));
    setReusableSections(new Set());
    scanAndRegisterDoubtPoints(pScoreId, parsed);
    usePaperVigilanceStore.getState().setActivePreviewScoreId(pScoreId);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPhotoPreview(ev.target?.result as string); scanAndRegisterDoubtPoints(scoreId, editablePatterns); };
    reader.readAsDataURL(file);
  };

  const toggleReusable = (secName: string) => {
    setReusableSections((prev) => { const next = new Set(prev); if (next.has(secName)) next.delete(secName); else next.add(secName); return next; });
  };

  const handleUpdateStep = (secName: string, roleKey: string, stepIndex: number, newVal: PaperStepValue) => {
    setEditablePatterns((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[secName]) copy[secName] = {};
      if (!copy[secName][roleKey]) copy[secName][roleKey] = Array(16).fill(0);
      copy[secName][roleKey][stepIndex] = newVal;
      return copy;
    });
  };

  const handleInject = (openOnFirst = false) => {
    if (!canImport) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: lang === 'fr' ? 'Accès réservé au Mestre.' : 'Acesso reservado.' } }));
      return;
    }
    const flattenedSequence = sequenceItems.flatMap((item) => Array(item.repeatCount).fill(item.sectionName));
    const fullPreset: PaperPreset = {
      ...selectedPreset, name: metaOverrides.toada || selectedPreset.name,
      bpm: globalBpm, timeSig: globalTimeSig, patterns: editablePatterns, metricOverrides,
    };
    const res = injectPaperScoreToStore(fullPreset, flattenedSequence, reusableSections, lang, openOnFirst, injectOpts, metaOverrides);
    if (res.success && onClose) onClose();
  };

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      <PaperScannerUploadBar photoPreview={photoPreview} onPhotoUpload={handlePhotoUpload} selectedPresetId={selectedPreset.id} presetsList={presetsList} onSelectPreset={handleSelectPreset} lang={lang} />
      <PaperScannerGlobalSettingsBanner
        title={metaOverrides.toada || selectedPreset.name}
        onChangeTitle={(t) => setMetaOverrides((prev) => ({ ...prev, toada: t }))}
        bpm={globalBpm}
        onChangeBpm={setGlobalBpm}
        timeSig={globalTimeSig}
        onChangeTimeSig={setGlobalTimeSig}
        onApplyToAllPatterns={() => setMetricOverrides({})}
        linkAlfaias={Boolean(injectOpts.linkAlfaias)}
        onToggleLinkAlfaias={(v) => setInjectOpts((prev) => ({ ...prev, linkAlfaias: v }))}
        busCaixas={Boolean(injectOpts.linkCaixas)}
        onToggleBusCaixas={(v) => setInjectOpts((prev) => ({ ...prev, linkCaixas: v }))}
        busSementes={Boolean(injectOpts.busSementes)}
        onToggleBusSementes={(v) => setInjectOpts((prev) => ({ ...prev, busSementes: v }))}
        lang={lang}
      />
      <PaperPatternPreviewGrid
        scoreId={scoreId} patterns={editablePatterns} reusableSections={reusableSections} onToggleReusable={toggleReusable}
        onUpdateStep={handleUpdateStep} globalBpm={globalBpm} globalTimeSig={globalTimeSig} metricOverrides={metricOverrides}
        onSaveOverride={(pName, ov) => setMetricOverrides((prev) => { const next = { ...prev }; if (!ov) delete next[pName]; else next[pName] = ov; return next; })}
        lang={lang}
      />
      <SequenceTagBuilder availableSections={Object.keys(editablePatterns)} sequenceItems={sequenceItems} onChangeSequence={setSequenceItems} lang={lang} />
      <PaperInjectOptionsBar preset={{ ...selectedPreset, patterns: editablePatterns }} options={injectOpts} onChange={setInjectOpts} />
      <PaperScannerMetadataDrawer metadata={metaOverrides} onChange={(up) => setMetaOverrides((prev) => ({ ...prev, ...up }))} lang={lang} />
      <PaperScannerBottomBar canImport={canImport} sequenceItemsLength={sequenceItems.length} vigilanceCount={vigilanceCount} onInject={handleInject} lang={lang} />
    </div>
  );
};
