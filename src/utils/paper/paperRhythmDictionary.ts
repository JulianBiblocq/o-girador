/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Moteur d'indexation, recherche et agrégation du Dictionnaire de Rythmes (< 140 lignes).
 */
import { DICTIONARY_ITEMS, DictItem, DictVariation } from './paperDictionaryData';
import { PaperStepValue } from '../../types/paperWorkshop.types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';

export type DictionaryFamily = 'bases_paradas' | 'luanda' | 'igarassu' | 'ijexa' | 'aruanda' | 'cloud' | 'all';
export type { DictItem, DictVariation } from './paperDictionaryData';
export type PaperDictionaryEntry = DictItem;

export function getDictionaryEntries(family: DictionaryFamily = 'all', searchQuery = ''): DictItem[] {
  let items: DictItem[] = [...DICTIONARY_ITEMS];

  // Extraction dynamique des sections actives du magasin Zustand
  if (family === 'cloud' || family === 'all') {
    try {
      const tracks = useSequencerStore.getState().tracks || [];
      const activePatterns: Record<string, PaperStepValue[]> = {};
      tracks.forEach((t) => {
        const instName = t.customName || instrumentsConfig[t.instrumentIdx]?.name || '';
        const pKey = instName.toLowerCase().includes('alf') ? 'al' : instName.toLowerCase().includes('cai') ? 'cx' : instName.toLowerCase().includes('gong') ? 'gg' : 'inst';
        const activePat = t.patterns.find((p) => p.id === t.selectedPatternId) || t.patterns[0];
        if (activePat && Array.isArray(activePat.activeSteps)) {
          activePatterns[pKey] = activePat.activeSteps.slice(0, 16).map((st) => (st === 0 || !st ? 0 : st));
        }
      });
      if (Object.keys(activePatterns).length > 0) {
        items.push({
          id: 'morceau_actif',
          name: 'Morceau Actif (Séquenciad\'Or)',
          family: 'bases_paradas' as any,
          description: 'Patterns actuellement chargés dans la console',
          patterns: activePatterns
        });
      }
    } catch (_) {}
  }

  if (family !== 'all' && family !== 'cloud') {
    items = items.filter((it) => it.family === family);
  }

  if (!searchQuery.trim()) return items;
  const q = searchQuery.toLowerCase().trim();

  return items.filter((it) => {
    if (it.name.toLowerCase().includes(q)) return true;
    if (it.family.toLowerCase().includes(q)) return true;
    if (it.variations?.some((v) => v.name.toLowerCase().includes(q) || v.pupitre.toLowerCase().includes(q))) return true;
    return Object.keys(it.patterns).some((k) => k.toLowerCase().includes(q));
  });
}

export function findDictionarySection(rawName: string): DictItem | undefined {
  if (!rawName) return undefined;
  const clean = rawName.toLowerCase().replace(/[\s_-]+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return DICTIONARY_ITEMS.find((it) => {
    const itemClean = it.name.toLowerCase().replace(/[\s_-]+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return itemClean === clean || itemClean.includes(clean) || clean.includes(itemClean);
  });
}

export function findDictionaryVariation(sectionName: string, pupitreCode: string, varIndex: number): PaperStepValue[] | undefined {
  const section = findDictionarySection(sectionName);
  if (!section || !section.variations) return undefined;
  const cleanPup = pupitreCode.toLowerCase();
  const v = section.variations.find((item) => (item.pupitre.toLowerCase() === cleanPup || cleanPup.includes(item.pupitre.toLowerCase())) && item.varIndex === varIndex);
  return v?.steps;
}

export function formatConductorFormula(item: DictItem, varIndices: number[] = [], instrument = 'alfaia'): string {
  const cleanName = item.name.toUpperCase().replace(/\s*\(.*?\)/g, '').trim();
  if (varIndices.length === 0) return `${cleanName} x4`;
  return `${cleanName} x4 + Var (${varIndices.join('-')}) ${instrument}`;
}
