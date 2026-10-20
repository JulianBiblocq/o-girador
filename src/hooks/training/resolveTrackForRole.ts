/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrackGroup } from '../../types';
import { instrumentsConfig } from '../../data';

/**
 * Résolution tolérante du pupitre :
 * 1. Égalité avec l'ID numérique direct (nombre ou string).
 * 2. Attribut instrumentRoleKey issu de la nomenclature.
 * 3. Identifiant technique (t.instrumentId ou instrumentsConfig[t.instrumentIdx]?.id).
 * 4. Nom de l'instrument (t.name ou instrumentsConfig[t.instrumentIdx]?.name) avec includes.
 * 5. Nom personnalisé (t.customName) avec includes.
 */
export function resolveTrackForRole(tracks: TrackGroup[], role: string): TrackGroup | undefined {
  if (!role || !tracks || !tracks.length) return undefined;
  const cleanRole = role.toLowerCase().trim();

  const numericId = parseInt(cleanRole, 10);
  const byId = tracks.find(
    (t) => t.id === Number(cleanRole) || String(t.id) === cleanRole || (!isNaN(numericId) && t.id === numericId)
  );
  if (byId) return byId;

  const byRoleKey = tracks.find((t) => (t as any).instrumentRoleKey?.toLowerCase() === cleanRole);
  if (byRoleKey) return byRoleKey;

  const byTechId = tracks.find((t) => {
    const instId = (t as any).instrumentId || instrumentsConfig[t.instrumentIdx]?.id;
    return typeof instId === 'string' && instId.toLowerCase() === cleanRole;
  });
  if (byTechId) return byTechId;

  const byName = tracks.find((t) => {
    if (t.isBusFolder) return false;
    const trackName = (t as any).name || instrumentsConfig[t.instrumentIdx]?.name;
    return typeof trackName === 'string' && trackName.toLowerCase().includes(cleanRole);
  });
  if (byName) return byName;

  const byCustomName = tracks.find((t) => {
    if (t.isBusFolder) return false;
    const customName = (t as any).customName;
    return typeof customName === 'string' && customName.toLowerCase().includes(cleanRole);
  });
  if (byCustomName) return byCustomName;

  return undefined;
}
