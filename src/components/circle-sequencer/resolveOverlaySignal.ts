
import { CloudRhythmSignal, SongMarker } from '../../types';
import { useTransportStore } from '../../stores/useTransportStore';

export interface ResolvedOverlaySignal {
  name: string;
  image: string;
  frames?: string[];
  beatsCount?: number;
  mirrorHorizontal?: boolean;
}

export function resolveOverlaySignalAndMarker(
  expandedMeasureIdx: number,
  baseMeasureIdx: number,
  isPreRoll: boolean,
  preRollMeasureIndex: number,
  preRollTotalMeasures: number,
  currentMeasureSignals: (string | null)[] | undefined,
  currentRhythmSignals: { id: string; name: string; image: string }[] | undefined,
  currentMestreSignals: CloudRhythmSignal[] | undefined,
  currentSongMarkers: SongMarker[] | undefined
): { activeSig: ResolvedOverlaySignal | null; activeMarker: SongMarker | null } {
  let sigId: string | null = null;

  if (isPreRoll) {
    if (baseMeasureIdx === 0) {
      const preRoll = useTransportStore.getState().preRollSettings;
      const isTwoMeasuresPreRoll = preRollTotalMeasures === 2 || preRoll.measuresCount === 2;
      const targetSignalId = isTwoMeasuresPreRoll && preRollMeasureIndex === 0
        ? preRoll.startSignalMeasure1Id
        : preRoll.startSignalMeasure2Id;

      if (!targetSignalId || targetSignalId === 'none' || targetSignalId === 'neutre' || targetSignalId === 'null' || !targetSignalId.trim()) {
        sigId = null;
      } else {
        sigId = targetSignalId.trim();
      }
    } else {
      const prevM = baseMeasureIdx - 1;
      const rawPrevSigId = currentMeasureSignals?.[prevM] || null;
      if (!rawPrevSigId || rawPrevSigId === 'none' || rawPrevSigId === 'neutre' || rawPrevSigId === 'null' || !rawPrevSigId.trim()) {
        sigId = null;
      } else {
        sigId = rawPrevSigId.trim();
      }
    }
  } else {
    const rawMeasureSigId = currentMeasureSignals?.[expandedMeasureIdx] || null;
    if (!rawMeasureSigId || rawMeasureSigId === 'none' || rawMeasureSigId === 'neutre' || rawMeasureSigId === 'null' || !rawMeasureSigId.trim()) {
      sigId = null;
    } else {
      sigId = rawMeasureSigId.trim();
    }
  }

  let activeSig: ResolvedOverlaySignal | null = null;
  if (sigId) {
    const cloudSig = currentMestreSignals?.find(s => s.id === sigId);
    if (cloudSig) {
      const resolvedCloudImage = (cloudSig.frames && cloudSig.frames[0] && cloudSig.frames[0].startsWith('data:'))
        ? cloudSig.frames[0]
        : (cloudSig.image && cloudSig.image.startsWith('data:'))
          ? cloudSig.image
          : (cloudSig.imageUrl && cloudSig.imageUrl.startsWith('data:'))
            ? cloudSig.imageUrl
            : (cloudSig.image || cloudSig.imageUrl || '');

      activeSig = {
        name: cloudSig.name,
        image: resolvedCloudImage,
        frames: cloudSig.frames,
        beatsCount: cloudSig.beatsCount,
        mirrorHorizontal: cloudSig.mirrorHorizontal,
      };
    } else {
      const localSig = currentRhythmSignals?.find(s => s.id === sigId) as any;
      if (localSig) {
        const resolvedLocalImage = (localSig.frames && localSig.frames[0] && localSig.frames[0].startsWith('data:'))
          ? localSig.frames[0]
          : (localSig.image && localSig.image.startsWith('data:'))
            ? localSig.image
            : (localSig.image || '');

        activeSig = {
          name: localSig.name,
          image: resolvedLocalImage,
          frames: localSig.frames,
          beatsCount: localSig.beatsCount,
          mirrorHorizontal: localSig.mirrorHorizontal,
        };
      } else if (sigId.includes('pictures/') || sigId.includes('Pictures/')) {
        const isSam = sigId.includes('logo-samambaia');
        activeSig = {
          name: isSam ? 'Signe Luanda' : 'Signe Trovão',
          image: sigId.startsWith('/') ? sigId : `/${sigId.replace('pictures/', 'Pictures/')}`,
        };
      }
    }
  }

  let activeMarker: SongMarker | null = null;
  if (!isPreRoll && currentSongMarkers && currentSongMarkers.length > 0) {
    for (const marker of currentSongMarkers) {
      if (marker.measure <= baseMeasureIdx) {
        if (!activeMarker || marker.measure > activeMarker.measure) {
          activeMarker = marker;
        }
      }
    }
  }

  return { activeSig, activeMarker };
}
