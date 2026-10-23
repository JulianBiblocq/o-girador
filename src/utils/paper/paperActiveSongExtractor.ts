/**
 * Extraction dynamique de la partition active du Séquenciad'Or pour l'Atelier Papier (< 100 lignes).
 */
import { PaperPreset, PaperStepValue, PupitreCode } from '../../types/paperWorkshop.types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { instrumentsConfig } from '../../data';
import { ALL_PAPER_PRESETS } from './paperTranscribedPresets';

const CODE_MAP: Record<string, PupitreCode> = {
  marcante: 'al', meiao: 'al', repique: 'al', caixa: 'cx', tarol: 'cx',
  gongue: 'gg', agbe: 'ab', mineiro: 'mi', timbal: 'tb', apito: 'td',
  puxador: 'td', coro: 'td', toada: 'td',
};

export const getActiveSongPaperPreset = (lang: 'fr' | 'pt' = 'fr'): PaperPreset | null => {
  try {
    const state = useSequencerStore.getState();
    const tracks = state.tracks || [];
    if (tracks.length === 0) return null;

    const rawName = state.metadata?.toada?.trim() || state.metadata?.ritmo?.trim() || (lang === 'fr' ? 'Morceau Actuel' : 'Peça Atual');
    const sections = state.songSections || [];
    const totalM = Math.max(1, state.totalMeasures || 16);

    const secNames = new Set<string>();
    sections.forEach((s) => secNames.add(s.name));
    tracks.forEach((t) => t.patterns.forEach((p) => { if (p.name) secNames.add(p.name); }));
    if (secNames.size === 0) secNames.add('Base');

    const patternsMap: Record<string, Partial<Record<PupitreCode, PaperStepValue[]>>> = {};

    secNames.forEach((secName) => {
      patternsMap[secName] = {};
      tracks.forEach((t) => {
        const instId = instrumentsConfig[t.instrumentIdx]?.id || '';
        const custom = t.customName?.toLowerCase() || '';
        let code: PupitreCode = CODE_MAP[instId] || 'al';
        if (custom.includes('cai') || custom.includes('cx')) code = 'cx';
        else if (custom.includes('gong') || custom.includes('gg')) code = 'gg';
        else if (custom.includes('agb') || custom.includes('ab')) code = 'ab';
        else if (custom.includes('min') || custom.includes('mi')) code = 'mi';
        else if (custom.includes('alf') || custom.includes('mc') || custom.includes('me') || custom.includes('rp')) code = 'al';

        let pat = t.patterns.find((p) => p.name.toLowerCase() === secName.toLowerCase());
        if (!pat && sections.length > 0) {
          const secObj = sections.find((s) => s.name.toLowerCase() === secName.toLowerCase());
          if (secObj) pat = t.patterns.find((p) => p.measureAssignments?.[secObj.startMeasure]);
        }
        if (!pat) pat = t.patterns.find((p) => p.id === t.selectedPatternId) || t.patterns[0];

        if (pat && Array.isArray(pat.activeSteps)) {
          patternsMap[secName][code] = pat.activeSteps.slice(0, 16).map((st) => (st === 0 || !st ? 0 : st));
        }
      });
    });

    const defaultSequence: string[] = [];
    for (let m = 0; m < totalM; m++) {
      const secAtM = sections.find((s) => m >= s.startMeasure && m <= s.endMeasure);
      if (secAtM) {
        defaultSequence.push(secAtM.name);
      } else {
        const firstTrackPat = tracks[0]?.patterns.find((p) => p.measureAssignments?.[m]);
        defaultSequence.push(firstTrackPat?.name || `M${m + 1}`);
      }
    }

    return {
      id: 'active_song',
      name: lang === 'fr' ? `Morceau Actif (${rawName})` : `Peça Ativa (${rawName})`,
      bpm: state.bpm || 96,
      timeSig: (state.timeSig || '4/4') as any,
      totalMeasures: totalM,
      linkedAlfaias: true,
      pupitres: ['al', 'cx', 'gg', 'ab'],
      patterns: patternsMap,
      sequenceString: defaultSequence.join(' | '),
      defaultSequence,
    };
  } catch {
    return null;
  }
};

export const getAllAvailablePaperPresets = (lang: 'fr' | 'pt' = 'fr'): PaperPreset[] => {
  const active = getActiveSongPaperPreset(lang);
  let customPresets: PaperPreset[] = [];
  try {
    customPresets = JSON.parse(localStorage.getItem('girador_mestre_custom_paper_presets') || '[]');
  } catch {}

  const result: PaperPreset[] = [];
  if (active) result.push(active);
  result.push(...ALL_PAPER_PRESETS);
  customPresets.forEach((cp) => {
    if (!result.some((r) => r.id === cp.id)) result.push(cp);
  });
  return result;
};
