/**
 * Lit la durée exacte des WebM (decodeAudioData dans Chromium : fiable même sans header Duration).
 */
import { chromium } from '@playwright/test';
import fs from 'fs';

const FILES = [
  { id: 'hJFMrFdzwLezPmeTgVpE', label: 'Vovó Falou', bpm: 77 },
  { id: '29dIDjgc2vPuDnwjiy9V', label: 'Opanijé', bpm: 110 }
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');

for (const f of FILES) {
  const b64 = fs.readFileSync(`scratch/${f.id}.webm`).toString('base64');
  const r = await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = await ctx.decodeAudioData(bin.buffer);
    return { duration: audio.duration, sampleRate: audio.sampleRate, channels: audio.numberOfChannels };
  }, b64);
  const measureSec = 4 * (60 / f.bpm);
  console.log(`\n${f.label} (${f.id}.webm)`);
  console.log(`  durée exacte : ${r.duration.toFixed(3)} s  (${r.sampleRate} Hz, ${r.channels} canaux)`);
  console.log(`  à ${f.bpm} BPM (mesure = ${measureSec.toFixed(4)} s) : ${(r.duration / measureSec).toFixed(2)} mesures → Math.round = ${Math.round(r.duration / measureSec)}`);
}
await browser.close();
