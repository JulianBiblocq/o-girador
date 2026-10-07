import { chromium } from '@playwright/test';
import LZString from 'lz-string';

async function checkDirect() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5174');
  await page.waitForFunction(() => 'firebaseAuth' in window, { timeout: 30000 });

  const raw = await page.evaluate(async () => {
    const auth = window.firebaseAuth;
    const signIn = window.signInWithEmailAndPassword;
    await signIn(auth, 'mestre@ogirador.com', 'playwrighttest');

    const snap = await window.getDoc(window.doc(window.firebaseDb, 'presets', '29dIDjgc2vPuDnwjiy9V'));
    return snap.data();
  });

  const parsed = JSON.parse(LZString.decompressFromBase64(raw.data));
  console.log('Direct Firestore read of Opanijé:');
  console.log('Name in doc:', raw.name);
  console.log('Name in data:', parsed.name);
  console.log('Total Measures:', parsed.totalMeasures);
  console.log('BPM:', parsed.bpm);
  console.log('Tracks count:', parsed.tracks.length);
  parsed.tracks.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.isBusFolder ? 'BUS' : 'INST ' + t.instrumentIdx}] "${t.name}" (id: ${t.id}, role: ${t.instrumentRoleKey}, busId: ${t.busId})`);
    if (t.patterns && t.patterns.length > 0) {
      console.log(`     patterns: ${t.patterns.length}, assignLength: ${t.patterns[0].measureAssignments?.length}`);
    }
  });
  await browser.close();
}
checkDirect();
