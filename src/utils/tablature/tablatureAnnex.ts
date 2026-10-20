import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { formatStepsRow } from './tablatureStepFormatter';

export const generateAnnexTablature = (
  tracks: TrackGroup[],
  annexTrackIds: Set<number>,
  isHtml: boolean = false
): string => {
  if (annexTrackIds.size === 0) return '';
  const annexTracks = tracks.filter(t => annexTrackIds.has(t.id));
  if (annexTracks.length === 0) return '';

  const lang = useSequencerStore.getState().lang || 'fr';
  let output = isHtml ? `<div style="page-break-before: always;" class="tab-chunk">\n` : `\n\n========================================\n`;
  const titleStr = lang === 'fr' ? 'Annexe : Lexique des variations' : 'Anexo: Léxico das variações';

  if (isHtml) output += `<div class="tab-title" style="margin-top: 40px; margin-bottom: 20px;">${titleStr}</div>\n`;
  else output += `${titleStr.toUpperCase()}\n========================================\n\n`;

  annexTracks.forEach(track => {
    const conf = instrumentsConfig[track.instrumentIdx];
    if (!conf) return;

    const assignedPatternIds = new Set<number>();
    track.patterns.forEach(p => {
      if (p.variations && p.variations.length > 0) {
        if (Object.values(p.measureAssignments).some(val => val === true)) assignedPatternIds.add(p.id);
      }
    });

    if (assignedPatternIds.size === 0) return;

    const trackLabel = track.customName || useNomenclatureStore.getState().getInstrumentLabel(track || conf.id);
    let trackOutput = isHtml ? `<div style="margin-bottom: 20px;"><strong>[ ${trackLabel} ]</strong>\n` : `[ ${trackLabel} ]\n`;

    assignedPatternIds.forEach(pId => {
      const p = track.patterns.find(pat => pat.id === pId);
      if (!p) return;

      const patName = p.name ? p.name : `Pattern ${pId}`;
      trackOutput += isHtml ? `  <span style="text-decoration: underline;">${patName}</span>\n` : `  ${patName}\n`;

      const baseLabel = `[Base]`.padEnd(50, ' ');
      trackOutput += `    ${baseLabel} | ${formatStepsRow(p.activeSteps, p.steps, isHtml)}\n`;

      p.variations?.forEach(v => {
        const labelText = v.playFirstTimeOnly
          ? (lang === 'fr' ? `${v.name} - (Levée / 1ère fois uniquement)` : `${v.name} - (Levada / 1ª vez apenas)`)
          : `${v.name} - ${v.probability}%`;
        const varLabel = `[${labelText}]`.padEnd(50, ' ');
        trackOutput += `    ${varLabel} | ${formatStepsRow(v.steps, p.steps, isHtml)}\n`;
      });
      trackOutput += '\n';
    });

    if (isHtml) trackOutput += `</div>`;
    output += trackOutput;
  });

  if (isHtml) output += `</div>`;
  return output;
};
