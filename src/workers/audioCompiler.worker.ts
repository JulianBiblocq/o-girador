import { buildFlatSongSchedule } from './compiler/flatScheduleBuilder';

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
      // @ts-ignore
      self.postMessage({ success: true, action: 'compileSong', data: flatArray }, [flatArray.buffer]);
    }
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
