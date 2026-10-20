/**
 * O Girador - Vocal Old Player Graceful Fadeout & Delayed Teardown
 */

import * as Tone from 'tone';
import { activeVocals } from './vocalTypes';

export class VocalOldPlayerFade {
  public static fadeAndDispose(trackId: string | number, actualStartTime: number): void {
    activeVocals.forEach((entry, k) => {
      if (k.startsWith(`${trackId}_`)) {
        try {
          entry.mainPlayer.onstop = () => {};
          if (entry.directPlayer) entry.directPlayer.onstop = () => {};
          if (entry.grainPlayer) entry.grainPlayer.onstop = () => {};

          const oldGain = entry.mainGain.gain;
          const now = Tone.now();
          const fadeStart = Math.max(now, actualStartTime);
          oldGain.cancelScheduledValues(fadeStart);
          oldGain.setValueAtTime(oldGain.value, fadeStart);
          oldGain.linearRampToValueAtTime(0.0001, fadeStart + 0.015);

          entry.mainPlayer.stop(fadeStart + 0.02);
          if (entry.directPlayer && entry.directPlayer !== entry.mainPlayer) {
            try { entry.directPlayer.stop(fadeStart + 0.02); } catch (_) {}
          }
          if (entry.grainPlayer && entry.grainPlayer !== entry.mainPlayer) {
            try { entry.grainPlayer.stop(fadeStart + 0.02); } catch (_) {}
          }

          const { mainPlayer, directPlayer, grainPlayer, mainGain, haasNodes, chorusPlayers, chorusGains, panners } = entry;
          const delayMs = Math.max(50, (fadeStart + 0.1 - now) * 1000);

          setTimeout(() => {
            try {
              mainPlayer.onstop = () => {}; mainPlayer.disconnect(); mainPlayer.dispose();
              if (directPlayer && directPlayer !== mainPlayer) {
                directPlayer.onstop = () => {}; directPlayer.disconnect(); directPlayer.dispose();
              }
              if (grainPlayer && grainPlayer !== mainPlayer) {
                grainPlayer.onstop = () => {}; grainPlayer.disconnect(); grainPlayer.dispose();
              }
              mainGain.disconnect(); mainGain.dispose();
              if (haasNodes) {
                haasNodes.input.disconnect(); haasNodes.delay.disconnect();
                haasNodes.filter.disconnect(); haasNodes.rightGain.disconnect(); haasNodes.merger.disconnect();
              }
              chorusPlayers.forEach(p => { try { p.onstop = () => {}; p.stop(); p.disconnect(); p.dispose(); } catch (_) {} });
              chorusGains.forEach(g => { try { g.disconnect(); g.dispose(); } catch (_) {} });
              panners.forEach(pan => { try { pan.disconnect(); pan.dispose(); } catch (_) {} });
            } catch (_) {}
          }, Math.min(delayMs, 5000));
        } catch (_) {}
        activeVocals.delete(k);
      }
    });
  }
}
