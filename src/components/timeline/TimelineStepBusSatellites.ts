import { instrumentsConfig, isDarkText, getVisualStrokeSymbol } from '../../data';

export interface BusSatellite {
  color: string;
  text: string;
  isDark: boolean;
  childState: any;
}

export function resolveBusSatellites(
  currentTrack: any,
  tracks: any[],
  slaveTrackIds: number[] | undefined,
  hasChildOverrides: boolean | undefined,
  measureIdx: number,
  actualStepIdx: number,
  isLeftHanded: boolean
): BusSatellite[] {
  const satellites: BusSatellite[] = [];
  if (!hasChildOverrides || !slaveTrackIds || slaveTrackIds.length === 0) return satellites;

  for (const sId of slaveTrackIds) {
    const c = tracks.find((t) => t.id === sId);
    const ov = c?.patternOverrides?.[measureIdx];
    if (ov !== undefined && ov !== null) {
      const cp = currentTrack.patterns.find((p: any) => p.id === ov);
      const cs = cp?.activeSteps?.[actualStepIdx] ?? 0;
      if (cs !== 0 && cs !== '') {
        const ci = instrumentsConfig[c.instrumentIdx];
        const cv = ci ? getVisualStrokeSymbol(cs, isLeftHanded, ci.id) : 0;
        if (cv !== 0) {
          const pv = Array.isArray(cv) ? cv[0] : cv;
          satellites.push({
            color: ci.colors?.[pv as string] || ci.color || '#fff',
            text: String(pv),
            isDark: isDarkText(ci.id, String(Array.isArray(cs) ? cs[0] : cs)),
            childState: cs,
          });
        }
      }
    }
  }

  return satellites;
}
