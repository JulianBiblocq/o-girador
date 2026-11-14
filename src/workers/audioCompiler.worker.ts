import { buildFlatSongSchedule } from './compiler/flatScheduleBuilder';
import { extractCompiledTrackIds } from './compiler/compiledTrackIdResolver';

self.onmessage = (e: MessageEvent<any>) => {
  try {
    const {
      action,
      tracks,
      totalMeasures,
      measureTimeSigs,
      instConfig,
      soloPatternPlayId,
      soloPatternVariationId,
      isolateBaseOnly,
    } = e.data;

    if (action === 'compileSong') {
      const flatArray = buildFlatSongSchedule(
        tracks,
        totalMeasures,
        measureTimeSigs,
        instConfig,
        soloPatternPlayId,
        soloPatternVariationId,
        !!isolateBaseOnly
      );
      const compiledTrackIds = extractCompiledTrackIds(tracks || []);
      // @ts-ignore
      self.postMessage({ success: true, action: 'compileSong', data: flatArray, compiledTrackIds }, [flatArray.buffer]);
    }
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
