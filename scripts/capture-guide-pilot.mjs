/**
 * capture-guide-pilot.mjs — Pipeline Pilote « 4-en-1 » (35 s · Fiche p1-1).
 * Produit en une passe :
 *   1) Vidéo 1920x1080 @ 60 fps sans cadre navigateur avec curseur fluide et onde de clic (.mp4)
 *   2) Audio numérique pur 48 kHz du bus Master de la Roda (.wav + multiplexé dans le .mp4)
 *   3) Sous-titres horodatés bilingues .fr.srt & .pt.srt prêts pour DaVinci Resolve
 *   4) Captures photos HD .webp (dont public/guide/p1-1.webp pour illustrer automatiquement le Manuel)
 *
 * Usage (uniquement sur instruction explicite, serveur Vite actif sur http://localhost:5174) :
 *   node scripts/capture-guide-pilot.mjs
 */
import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import { AUDIO_TAP_INIT_SCRIPT } from './capture/captureAudioTapInit.mjs';
import { CURSOR_OVERLAY_INIT_SCRIPT, smoothClickTourId, smoothMoveCursor } from './capture/captureCursorOverlay.mjs';
import {
  resolveFfmpegBinary,
  writeBilingualSrtFiles,
  convertPngToWebp,
  muxPilotVideoAndMasterAudio,
} from './capture/srtAndFfmpegMuxer.mjs';

const BASE_URL = process.env.CAPTURE_BASE_URL || 'http://localhost:5174';
const OUT_DIR = path.resolve('output', 'captures', 'p1-1');
const GUIDE_PUBLIC_DIR = path.resolve('public', 'guide');
const DURATION_SEC = 35;

async function takeWebpShot(page, ffmpegBin, name, copyToPublicGuide = false) {
  const pngPath = path.join(OUT_DIR, `${name}.png`);
  const webpPath = path.join(OUT_DIR, `${name}.webp`);
  await page.screenshot({ path: pngPath, type: 'png' });
  convertPngToWebp(ffmpegBin, pngPath, webpPath, 88);
  fs.unlinkSync(pngPath);
  if (copyToPublicGuide) {
    fs.mkdirSync(GUIDE_PUBLIC_DIR, { recursive: true });
    fs.copyFileSync(webpPath, path.join(GUIDE_PUBLIC_DIR, 'p1-1.webp'));
  }
}

async function runPilotCapture() {
  const ffmpegBin = resolveFfmpegBinary();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1',
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(AUDIO_TAP_INIT_SCRIPT);
  await context.addInitScript(CURSOR_OVERLAY_INIT_SCRIPT);

  const page = await context.newPage();
  const videoStartHostMs = performance.now();
  const cursor = { x: 960, y: 540 };
  const cues = [];

  await page.goto(`${BASE_URL}/?capture=1&view=roda`, { waitUntil: 'networkidle' });
  await page.locator('[data-tour-id="roda-canvas"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200);

  // Déverrouillage AudioContext + démarrage de l'enregistrement Master 48 kHz (Clap t0)
  await smoothClickTourId(page, cursor, 'transport-play-btn', { durationMs: 450 });
  const audioInfo = await page.evaluate(() => window.__OG_CAPTURE_AUDIO__.startRecording());
  const actionStartHostMs = performance.now();
  const relMs = () => Math.max(0, Math.round(performance.now() - actionStartHostMs));

  // Séquence 1 (00s -> 08s) : Roda 360° en lecture + anticipation M+1
  cues.push({ startMs: 200, endMs: 7600,
    fr: 'La Roda à 360° joue le Batuque à 60 FPS en révélant la mesure suivante (M+1).',
    pt: 'A Roda em 360° toca o Batuque a 60 FPS antecipando o compasso seguinte (M+1).' });
  await page.waitForTimeout(4200);
  await takeWebpShot(page, ffmpegBin, 'p1-1-01-roda-lecture', true);
  await page.waitForTimeout(3200);

  // Séquence 2 (08s -> 16s) : Pause + clic sur un pas -> Popover pédagogique + écoute isolée
  await smoothClickTourId(page, cursor, 'transport-play-btn', { durationMs: 420 });
  cues.push({ startMs: relMs(), endMs: relMs() + 7800,
    fr: 'Cliquez sur un pas pour ouvrir sa fiche pédagogique et écouter la frappe isolée.',
    pt: 'Clique em um passo para abrir sua ficha pedagógica e ouvir o golpe isolado.' });
  await smoothClickTourId(page, cursor, 'roda-canvas', { durationMs: 500, offsetY: -185 });
  await page.waitForTimeout(600);
  const popover = page.locator('[data-tour-id="pedagogy-popover"]');
  if (await popover.isVisible()) {
    await takeWebpShot(page, ffmpegBin, 'p1-1-02-popover-pedagogique', false);
    const b = await popover.locator('button').nth(1).boundingBox();
    if (b) {
      await smoothMoveCursor(page, cursor, b.x + b.width / 2, b.y + b.height / 2, 380);
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    }
    await page.waitForTimeout(2200);
    await page.keyboard.press('Escape');
  }

  // Séquence 3 (16s -> 26s) : Vue Pistes linéaire + activation Focus
  cues.push({ startMs: relMs(), endMs: relMs() + 9500,
    fr: 'Basculez sur PISTES pour lire la grille linéaire et isolez un pupitre avec Focus.',
    pt: 'Alterne para PISTAS para ler a grade linear e isole um naipe com Focus.' });
  await smoothClickTourId(page, cursor, 'header-tab-pistes', { durationMs: 480 });
  await smoothClickTourId(page, cursor, 'transport-play-btn', { durationMs: 420 });
  await page.waitForTimeout(2500);
  await smoothClickTourId(page, cursor, 'workspace-focus-btn', { durationMs: 480, offsetX: -12 });
  await page.waitForTimeout(2200);
  await takeWebpShot(page, ffmpegBin, 'p1-1-03-pistes-focus', false);
  await page.waitForTimeout(2400);

  // Séquence 4 (26s -> 35s) : Retour Roda en Focus jusqu'à 35 s
  cues.push({ startMs: relMs(), endMs: DURATION_SEC * 1000,
    fr: 'Revenez sur la Roda : votre pupitre ressort nettement au cœur du Batuque.',
    pt: 'Volte para a Roda: seu naipe destaca-se com nitidez no centro do Batuque.' });
  await smoothClickTourId(page, cursor, 'header-tab-roda', { durationMs: 480 });
  await page.waitForTimeout(Math.max(500, DURATION_SEC * 1000 - relMs()));

  const audioResult = await page.evaluate(() => window.__OG_CAPTURE_AUDIO__.stopRecordingBase64());
  const rawAudioPath = path.join(OUT_DIR, 'raw-master-audio.webm');
  fs.writeFileSync(rawAudioPath, Buffer.from(audioResult.base64, 'base64'));

  const video = page.video();
  await context.close();
  await browser.close();

  const outBase = path.join(OUT_DIR, 'p1-1-explorer-roda');
  writeBilingualSrtFiles(cues, outBase);
  muxPilotVideoAndMasterAudio({
    ffmpegBin, rawVideoWebm: await video.path(), rawAudioWebm: rawAudioPath,
    videoTrimStartSec: Math.max(0, (actionStartHostMs - videoStartHostMs) / 1000),
    durationSec: DURATION_SEC, outMasterWav: `${outBase}.wav`, outMp4: `${outBase}.mp4`,
  });
  console.log(`Capture pilote 4-en-1 terminée (${audioInfo.sampleRate} Hz) -> ${outBase}.mp4`);
}

runPilotCapture().catch((err) => {
  console.error('[capture-guide-pilot] Erreur :', err);
  process.exit(1);
});
