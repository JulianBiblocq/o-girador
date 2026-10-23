/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Onglet 2 : Scanner Photo, Relecture des Motifs & Assemblage (< 145 lignes).
 */
import React, { useState, useMemo, useEffect } from 'react';
import { PaperPreset, PaperSequenceItem, PaperStepValue } from '../../types/paperWorkshop.types';
import { SequenceTagBuilder, factorizeSequence } from './SequenceTagBuilder';
import { PaperPatternPreviewGrid } from './PaperPatternPreviewGrid';
import { injectPaperScoreToStore } from '../../utils/paper/injectPaperScoreToStore';
import { PaperInjectOptions } from '../../utils/paper/paperTrackBuilder';
import { PaperInjectOptionsBar } from './PaperInjectOptionsBar';
import { getAllAvailablePaperPresets } from '../../utils/paper/paperActiveSongExtractor';
import { usePaperVigilanceStore } from '../../stores/usePaperVigilanceStore';
import { scanAndRegisterDoubtPoints } from '../../utils/paper/paperScanDoubtDetector';
import { disambiguateAllPresetPatterns } from '../../utils/paper/paperRoleDisambiguator';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props { canImport: boolean; lang: 'fr' | 'pt'; onClose?: () => void; }

export const PaperScannerTab: React.FC<Props> = ({ canImport, lang, onClose }) => {
  const presetsList = useMemo(() => getAllAvailablePaperPresets(lang), [lang]);
  const [selectedPreset, setSelectedPreset] = useState<PaperPreset>(() => presetsList[0]);
  const [editablePatterns, setEditablePatterns] = useState(() => disambiguateAllPresetPatterns(JSON.parse(JSON.stringify(presetsList[0].patterns))));
  const [sequenceItems, setSequenceItems] = useState<PaperSequenceItem[]>(() => factorizeSequence(presetsList[0].defaultSequence));
  const [reusableSections, setReusableSections] = useState<Set<string>>(() => new Set());
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [injectOpts, setInjectOpts] = useState<PaperInjectOptions>({ linkAlfaias: true, linkCaixas: true, caixasLinkMode: 'caixa_tarol' });
  const scoreId = selectedPreset.id || selectedPreset.name.toLowerCase().replace(/\s+/g, '_');
  const vigilanceCount = usePaperVigilanceStore((state) => state.points.filter((p) => p.scoreId === scoreId).length);

  useEffect(() => { scanAndRegisterDoubtPoints(scoreId, editablePatterns); usePaperVigilanceStore.getState().setActivePreviewScoreId(scoreId); }, [scoreId]);

  const handleSelectPreset = (p: PaperPreset) => {
    setSelectedPreset(p);
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
    setReusableSections((prev) => {
      const next = new Set(prev);
      if (next.has(secName)) next.delete(secName); else next.add(secName);
      return next;
    });
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
    if (!canImport) { alert(lang === 'fr' ? 'Accès réservé au Mestre et Administrateurs.' : 'Acesso reservado ao Mestre.'); return; }
    const flattenedSequence = sequenceItems.flatMap((item) => Array(item.repeatCount).fill(item.sectionName));
    const res = injectPaperScoreToStore(
      { ...selectedPreset, patterns: editablePatterns },
      flattenedSequence,
      reusableSections,
      lang,
      openOnFirst,
      injectOpts
    );
    if (res.success && onClose) onClose();
  };

  return (
    <div className="flex flex-col gap-2.5 font-sans text-xs">
      <div className="p-2.5 bg-black/5 dark:bg-black/20 border-2 border-[var(--cordel-border,#1a1a1a)] flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <label className="px-2.5 py-1 bg-[#8b2a1a] text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]">
            <Upload size={12} />
            <span className="whitespace-nowrap">{lang === 'fr' ? 'Charger Photo' : 'Carregar Foto'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
          </label>
          <span className="text-[10px] text-gray-600 dark:text-gray-300 italic whitespace-nowrap">
            {photoPreview ? (lang === 'fr' ? 'Photo chargée' : 'Foto carregada') : (lang === 'fr' ? 'Prenez en photo votre fiche' : 'Tire uma foto')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial justify-end">
          <label htmlFor="paper-model-select" className="font-cactus font-bold text-xs uppercase text-[#8b2a1a] dark:text-[#f59e0b] shrink-0 whitespace-nowrap">
            {lang === 'fr' ? 'Modèle :' : 'Modelo :'}
          </label>
          <select
            id="paper-model-select"
            value={selectedPreset.id}
            onChange={(e) => handleSelectPreset(presetsList.find((pr) => pr.id === e.target.value) || presetsList[0])}
            className="p-1 bg-[#efe6d0] text-[#1a1a1a] border-2 border-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8] dark:border-[#f4ecd8]/50 font-cactus font-bold text-xs max-w-[260px] w-full truncate cursor-pointer shadow-[1px_1px_0px_#000]"
          >
            {presetsList.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#efe6d0] text-[#1a1a1a] dark:bg-[#262220] dark:text-[#f4ecd8]">{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <PaperPatternPreviewGrid scoreId={scoreId} patterns={editablePatterns} reusableSections={reusableSections} onToggleReusable={toggleReusable} onUpdateStep={handleUpdateStep} lang={lang} />
      <SequenceTagBuilder availableSections={Object.keys(editablePatterns)} sequenceItems={sequenceItems} onChangeSequence={setSequenceItems} lang={lang} />
      <PaperInjectOptionsBar preset={{ ...selectedPreset, patterns: editablePatterns }} options={injectOpts} onChange={setInjectOpts} />

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="text-[10px] font-extrabold text-[#8b2a1a] dark:text-[#f59e0b]">
          {!canImport ? (lang === 'fr' ? 'Import réservé au Mestre.' : 'Importação reservada.') : `${sequenceItems.length} bloc(s) prêts`}
        </div>
        <div className="flex items-center gap-2">
          {vigilanceCount > 0 && (
            <button type="button" onClick={() => handleInject(true)} className="py-2 px-3 bg-[#d97706] hover:bg-[#b45309] text-white border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer">
              <AlertTriangle size={13} /> <span>{lang === 'fr' ? 'Injecter & Ouvrir sur le 1er Point' : 'Injetar & Abrir no 1º Ponto'}</span>
            </button>
          )}
          <button type="button" onClick={() => handleInject(false)} disabled={sequenceItems.length === 0} className="py-2 px-4 bg-[#8b2a1a] disabled:opacity-40 text-[#f4ecd8] border-2 border-black font-cactus font-bold text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_#000] hover:bg-black cursor-pointer">
            <CheckCircle size={14} /> <span>{lang === 'fr' ? 'Injecter dans la Roda' : 'Injetar na Roda'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
