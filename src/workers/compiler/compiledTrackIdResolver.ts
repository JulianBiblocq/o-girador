const compiledTrackIdsBySchedule = new WeakMap<object, readonly (number | string)[]>();

export function extractCompiledTrackIds(tracks: readonly { id: number | string }[]): (number | string)[] {
  const ids = new Array<number | string>(tracks.length);
  for (let i = 0; i < tracks.length; i++) {
    ids[i] = tracks[i]?.id;
  }
  return ids;
}

export function attachCompiledTrackIds(
  schedule: object | null | undefined,
  trackIds: readonly (number | string)[]
): void {
  if (!schedule || typeof schedule !== 'object') return;
  compiledTrackIdsBySchedule.set(schedule, trackIds);
  try {
    Object.defineProperty(schedule, 'compiledTrackIds', {
      value: trackIds,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch (_) {}
}

export function getCompiledTrackIds(
  schedule: object | null | undefined
): readonly (number | string)[] | undefined {
  if (!schedule || typeof schedule !== 'object') return undefined;
  return compiledTrackIdsBySchedule.get(schedule) || (schedule as any).compiledTrackIds;
}

export function resolveTrackFromPackedData<T extends { id: number | string }>(
  packedData: number,
  tracks: readonly T[],
  scheduleOrTrackIds?: object | readonly (number | string)[] | null
): T | undefined {
  const packedIdx = (packedData >>> 22) & 0x3ff;
  const idTable = Array.isArray(scheduleOrTrackIds)
    ? scheduleOrTrackIds
    : getCompiledTrackIds(scheduleOrTrackIds ?? undefined);

  if (idTable) {
    if (packedIdx >= idTable.length) return undefined;
    const targetId = idTable[packedIdx];
    if (targetId === undefined || targetId === null) return undefined;

    const fastCandidate = tracks[packedIdx];
    if (fastCandidate && (fastCandidate.id === targetId || String(fastCandidate.id) === String(targetId))) {
      return fastCandidate;
    }

    const targetStr = String(targetId);
    for (let i = 0; i < tracks.length; i++) {
      const candidate = tracks[i];
      if (candidate && (candidate.id === targetId || String(candidate.id) === targetStr)) {
        return candidate;
      }
    }
    return undefined;
  }

  return tracks[packedIdx];
}
