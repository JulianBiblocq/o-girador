/**
 * loopWaveformDrawer.ts — Calcul des crêtes PCM & rendu 2D pur de la forme d'onde du Labo Boucles (< 85 lignes).
 * Zéro couleur en dur : consomme uniquement la palette résolue depuis les jetons CSS `--cordel-*`.
 */
import { BarulhoLoopPointsMs } from '../../audio/engine/barulhoLoopRegistry';

export interface LoopCanvasPalette {
  bg: string; surface: string; ink: string; muted: string; border: string; accent: string; gold: string;
}

export interface WaveformPeaksData {
  mins: Float32Array;
  maxs: Float32Array;
  norm: number;
  durationMs: number;
}

export const LOOP_PEAK_BINS = 420;

export function extractWaveformPeaks(audioBuffer: AudioBuffer | null): WaveformPeaksData | null {
  if (!audioBuffer || audioBuffer.length === 0) return null;
  const ch0 = audioBuffer.getChannelData(0), total = ch0.length;
  const mins = new Float32Array(LOOP_PEAK_BINS), maxs = new Float32Array(LOOP_PEAK_BINS);
  let globalPeak = 0.01;
  for (let b = 0; b < LOOP_PEAK_BINS; b++) {
    const s0 = Math.floor((b * total) / LOOP_PEAK_BINS), s1 = Math.max(s0 + 1, Math.floor(((b + 1) * total) / LOOP_PEAK_BINS));
    let mn = 1, mx = -1;
    for (let i = s0; i < s1 && i < total; i++) {
      const v = ch0[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    mins[b] = mn; maxs[b] = mx;
    const absMax = Math.max(Math.abs(mn), Math.abs(mx));
    if (absMax > globalPeak) globalPeak = absMax;
  }
  return { mins, maxs, norm: 1 / globalPeak, durationMs: audioBuffer.duration * 1000 };
}

export function drawLoopWaveformFrame(
  ctx: CanvasRenderingContext2D, w: number, h: number, pal: LoopCanvasPalette,
  peaks: WaveformPeaksData | null, points: BarulhoLoopPointsMs, playMs: number | null, isFr: boolean
): void {
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  if (!peaks || peaks.durationMs <= 0) {
    ctx.fillStyle = pal.muted; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(isFr ? 'Chargement de la forme d’onde...' : 'Carregando forma de onda...', w * 0.5, h * 0.52);
    return;
  }

  const dur = peaks.durationMs, toX = (ms: number) => Math.max(0, Math.min(w, (ms / dur) * w));
  const xStart = toX(points.loopStartMs), xEnd = toX(points.loopEndMs);
  const xInEnd = toX(points.loopStartMs + points.crossfadeMs), xOutStart = toX(points.loopEndMs - points.crossfadeMs);
  const xSoft = toX(points.softEntryMs);

  ctx.fillStyle = pal.surface; ctx.fillRect(0, 0, xStart, h);
  ctx.globalAlpha = 0.20; ctx.fillStyle = pal.gold; ctx.fillRect(xStart, 0, Math.max(0, xEnd - xStart), h);
  ctx.globalAlpha = 0.28; ctx.fillStyle = pal.accent;
  ctx.fillRect(xStart, 0, Math.max(0, xInEnd - xStart), h);
  ctx.fillRect(xOutStart, 0, Math.max(0, xEnd - xOutStart), h);
  ctx.globalAlpha = 1;

  const midY = h * 0.52, ampY = h * 0.38, barW = Math.max(1, w / LOOP_PEAK_BINS);
  ctx.strokeStyle = pal.muted; ctx.lineWidth = 0.75;
  ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();

  ctx.fillStyle = pal.ink;
  for (let b = 0; b < LOOP_PEAK_BINS; b++) {
    const x = (b / LOOP_PEAK_BINS) * w;
    const yTop = midY - peaks.maxs[b] * peaks.norm * ampY, yBot = midY - peaks.mins[b] * peaks.norm * ampY;
    ctx.fillRect(x, yTop, barW, Math.max(1, yBot - yTop));
  }

  ctx.strokeStyle = pal.accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(xStart, 0); ctx.lineTo(xStart, h); ctx.moveTo(xEnd, 0); ctx.lineTo(xEnd, h); ctx.stroke();
  ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = pal.border; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xSoft, 0); ctx.lineTo(xSoft, h); ctx.stroke(); ctx.restore();

  ctx.fillStyle = pal.ink; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`${isFr ? 'Attaque' : 'Ataque'} 0..${points.loopStartMs}ms`, 4, 11);
  ctx.fillText(`[${points.loopStartMs}..${points.loopEndMs}ms] • Xfade ${points.crossfadeMs}ms • b ${points.softEntryMs}ms`, Math.max(4, Math.min(w - 255, xStart + 4)), h - 5);
  ctx.textAlign = 'right'; ctx.fillText(`${Math.round(dur)} ms`, w - 4, 11);

  if (playMs !== null && playMs >= 0) {
    const xPlay = toX(playMs);
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(xPlay, 0); ctx.lineTo(xPlay, h); ctx.stroke();
  }
}
