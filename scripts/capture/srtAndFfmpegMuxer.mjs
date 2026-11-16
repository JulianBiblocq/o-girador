/**
 * srtAndFfmpegMuxer.mjs — Génération .fr.srt / .pt.srt & multiplexage FFmpeg 1080p60 + WAV/AAC 48 kHz + .webp.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const CUBASE_FFMPEG_FALLBACK = 'C:\\Program Files\\Steinberg\\Cubase 15\\Externals\\FFmpeg\\5.1.1\\ffmpeg.exe';

export function resolveFfmpegBinary() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {}
  if (fs.existsSync(CUBASE_FFMPEG_FALLBACK)) {
    return CUBASE_FFMPEG_FALLBACK;
  }
  throw new Error('FFmpeg introuvable. Définissez FFMPEG_PATH ou installez ffmpeg.');
}

export function formatSrtTime(ms) {
  const clamped = Math.max(0, Math.round(ms));
  const hours = String(Math.floor(clamped / 3600000)).padStart(2, '0');
  const mins = String(Math.floor((clamped % 3600000) / 60000)).padStart(2, '0');
  const secs = String(Math.floor((clamped % 60000) / 1000)).padStart(2, '0');
  const millis = String(clamped % 1000).padStart(3, '0');
  return `${hours}:${mins}:${secs},${millis}`;
}

export function writeBilingualSrtFiles(cues, outBasePath) {
  const buildSrt = (langKey) =>
    cues
      .map((cue, idx) => `${idx + 1}\n${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}\n${cue[langKey]}\n`)
      .join('\n');

  const frPath = `${outBasePath}.fr.srt`;
  const ptPath = `${outBasePath}.pt.srt`;
  fs.writeFileSync(frPath, buildSrt('fr'), 'utf8');
  fs.writeFileSync(ptPath, buildSrt('pt'), 'utf8');
  return { frPath, ptPath };
}

export function convertPngToWebp(ffmpegBin, pngPath, webpPath, quality = 88) {
  fs.mkdirSync(path.dirname(webpPath), { recursive: true });
  execFileSync(
    ffmpegBin,
    ['-y', '-i', pngPath, '-c:v', 'libwebp', '-quality', String(quality), webpPath],
    { stdio: 'pipe' }
  );
}

export function muxPilotVideoAndMasterAudio({
  ffmpegBin,
  rawVideoWebm,
  rawAudioWebm,
  videoTrimStartSec,
  durationSec,
  outMasterWav,
  outMp4,
}) {
  fs.mkdirSync(path.dirname(outMp4), { recursive: true });
  const fadeStart = Math.max(0, durationSec - 0.8).toFixed(2);

  // 1. Export WAV 48 kHz 16-bit stéréo maître pour DaVinci Resolve
  execFileSync(
    ffmpegBin,
    [
      '-y',
      '-i', rawAudioWebm,
      '-t', String(durationSec),
      '-af', `afade=t=out:st=${fadeStart}:d=0.8`,
      '-ar', '48000',
      '-ac', '2',
      '-c:a', 'pcm_s16le',
      outMasterWav,
    ],
    { stdio: 'pipe' }
  );

  // 2. Multiplexage MP4 1080p60 H.264 CRF 18 + AAC 320 kbps 48 kHz aligné sur t0
  execFileSync(
    ffmpegBin,
    [
      '-y',
      '-ss', videoTrimStartSec.toFixed(3),
      '-i', rawVideoWebm,
      '-i', outMasterWav,
      '-t', String(durationSec),
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-r', '60',
      '-vf', 'scale=1920:1080:flags=lanczos',
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '320k',
      '-ar', '48000',
      '-movflags', '+faststart',
      outMp4,
    ],
    { stdio: 'pipe' }
  );
}
