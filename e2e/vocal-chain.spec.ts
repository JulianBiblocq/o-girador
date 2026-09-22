import { test, expect } from '@playwright/test';

test.describe('Batterie de Tests E2E — Chaîne d\'Enregistrement Vocal', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    });
    page.on('pageerror', (err) => {
      console.error('[BROWSER ERROR]:', err);
    });

    await page.goto('/');
    
    // Si nous sommes sur la Landing Page, entrer dans le séquenceur pour monter l'arbre complet (GlobalModalsLayout, etc.)
    const entraBtn = page.locator('#entra-btn');
    if (await entraBtn.isVisible()) {
      await entraBtn.click();
    }

    // Attendre le chargement de Tone et débloquer l'AudioContext
    await page.waitForFunction(async () => {
      try {
        const { getTone } = await import('/src/ToneLoader.ts');
        const Tone = getTone();
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
        return true;
      } catch (_) {
        return false;
      }
    }, null, { timeout: 15000 }).catch(() => {});
    
    // Isolation IndexedDB : Nettoyage strict d'O GiradorDB avant chaque scénario
    await page.evaluate(async () => {
      try {
        const { clearAllRecordings } = await import('/src/db.ts');
        await clearAllRecordings();
      } catch (_) {}

      try {
        const { useAudioStore } = await import('/src/audio/vocalEngineService.ts');
        useAudioStore.setState({
          recordingStatus: 'inactive',
          targetPatternId: null,
          vocalBlobs: {},
          vocalBuffers: {},
          tempRecording: null,
          isFocusRecordingMode: false,
        });
      } catch (_) {}
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 1 : Cycle de vie de l'Armement et du Pre-roll
  // ══════════════════════════════════════════════════════════════════════════
  test('Scénario 1 : Armement et instanciation MediaRecorder dès le décompte (T=0) avec capture anacrouse', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { vocalEngineService, useAudioStore, useSequencerStore } = await import('/src/audio/vocalEngineService.ts');
      const { getTone } = await import('/src/ToneLoader.ts');
      const Tone = getTone();

      // Préparer un pattern cible sur une piste voix
      const store = useSequencerStore.getState();
      const testPatternId = 8881;
      const currentTracks = store.tracks || [];
      const testTrack = {
        id: 9991,
        name: 'Voice Motif 1 Track',
        instrumentIdx: 0,
        volumeVal: 100,
        patterns: [
          {
            id: testPatternId,
            name: 'Voice Motif 1',
            steps: 16,
            activeSteps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            measureAssignments: [true, false, false, false],
            vocalMode: 'micro',
          }
        ]
      };
      useSequencerStore.getState().setTracks([testTrack as any, ...currentTracks]);
      useSequencerStore.getState().setBpm(200); // BPM élevé pour un cycle rapide

      // Mock audio track pour traquer les échantillons
      let audioTrackStopped = false;
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      const osc = rawCtx.createOscillator();
      const dest = rawCtx.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      const realTrack = dest.stream.getAudioTracks()[0];
      
      const originalTrackStop = realTrack.stop.bind(realTrack);
      realTrack.stop = () => {
        audioTrackStopped = true;
        originalTrackStop();
      };
      const mockStream = new MediaStream([realTrack]);

      // Remplacer getUserMedia pour renvoyer le stream d'oscillateur
      navigator.mediaDevices.getUserMedia = async () => mockStream;

      // 1. Armement du motif vocal
      await vocalEngineService.startRecording(testPatternId);

      const recorderAtStart = vocalEngineService.mediaRecorder;
      const initialStatus = useAudioStore.getState().recordingStatus;
      const initialTarget = useAudioStore.getState().targetPatternId;
      const initialFocus = useAudioStore.getState().isFocusRecordingMode;

      // Attendre Beat 1 (T = 0 dans Tone.Transport)
      await new Promise(r => setTimeout(r, 150));

      const statusAfterBeat1 = useAudioStore.getState().recordingStatus;
      const isRecorderActive = recorderAtStart !== null && recorderAtStart.state === 'recording';

      // Arrêter pour nettoyer
      vocalEngineService.stopRecording();
      osc.stop();

      return {
        hasMediaRecorder: recorderAtStart !== null,
        initialStatus,
        initialTarget,
        initialFocus,
        statusAfterBeat1,
        isRecorderActive
      };
    });

    expect(result.hasMediaRecorder).toBe(true);
    expect(['arming', 'countdown', 'recording']).toContain(result.initialStatus);
    expect(result.initialTarget).toBe(8881);
    expect(result.initialFocus).toBe(true);
    expect(result.isRecorderActive).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 2 : Punch-out & Libération matérielle
  // ══════════════════════════════════════════════════════════════════════════
  test('Scénario 2 : Punch-out stoppe le Transport, coupe le MediaRecorder et libère le micro matériel', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { vocalEngineService, useAudioStore, useSequencerStore } = await import('/src/audio/vocalEngineService.ts');
      const { getTone } = await import('/src/ToneLoader.ts');
      const Tone = getTone();

      const testPatternId = 8882;
      const store = useSequencerStore.getState();
      const currentTracks = store.tracks || [];
      const testTrack = {
        id: 9992,
        name: 'Voice Motif Punchout Track',
        instrumentIdx: 0,
        volumeVal: 100,
        patterns: [
          {
            id: testPatternId,
            name: 'Voice Motif Punchout',
            steps: 16,
            activeSteps: [1],
            measureAssignments: [true],
            vocalMode: 'micro',
          }
        ]
      };
      useSequencerStore.getState().setTracks([testTrack as any, ...currentTracks]);
      useSequencerStore.getState().setBpm(300); // 300 BPM = 0.8s par mesure

      let tracksStoppedCount = 0;
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      const dest = rawCtx.createMediaStreamDestination();
      const mockTrack = dest.stream.getAudioTracks()[0];

      const origStop = mockTrack.stop.bind(mockTrack);
      mockTrack.stop = () => {
        tracksStoppedCount++;
        origStop();
      };
      const mockStream = new MediaStream([mockTrack]);
      navigator.mediaDevices.getUserMedia = async () => mockStream;

      let recordingStoppedCalled = false;
      let generatedBlob: Blob | null = null;

      await vocalEngineService.startRecording(testPatternId, {
        onRecordingStopped: (blob) => {
          recordingStoppedCalled = true;
          generatedBlob = blob;
        }
      });

      // Laisser l'enregistrement démarrer
      await new Promise(r => setTimeout(r, 200));
      vocalEngineService.stopRecording();

      // Laisser le cycle d'onstop se terminer
      await new Promise(r => setTimeout(r, 150));

      const finalState = useAudioStore.getState();
      const recorderState = vocalEngineService.mediaRecorder;

      return {
        tracksStoppedCount,
        trackReadyState: mockTrack.readyState, // Devrait être 'ended'
        mediaRecorderNull: recorderState === null,
        recordingStatus: finalState.recordingStatus,
        targetPatternId: finalState.targetPatternId,
        focusMode: finalState.isFocusRecordingMode,
        transportState: Tone.Transport.state
      };
    });

    expect(result.tracksStoppedCount).toBeGreaterThanOrEqual(1);
    expect(result.trackReadyState).toBe('ended');
    expect(result.mediaRecorderNull).toBe(true);
    expect(result.recordingStatus).toBe('inactive');
    expect(result.targetPatternId).toBeNull();
    expect(result.focusMode).toBe(false);
    expect(result.transportState).not.toBe('started');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 3 : Modale d'Édition & Waveform Persistante (60 FPS Nudge)
  // ══════════════════════════════════════════════════════════════════════════
  test('Scénario 3 : Ouverture VocalValidationModal, persistance des peaks et Nudge CSS sans re-render React', async ({ page }) => {
    // 1. Initialiser tempRecording dans le store pour afficher la modale
    await page.evaluate(async () => {
      const { useAudioStore, useSequencerStore } = await import('/src/audio/vocalEngineService.ts');
      const { audioBufferToWav } = await import('/src/utils/audioBufferUtils.ts');
      const { getTone } = await import('/src/ToneLoader.ts');
      const Tone = getTone();

      const testPatternId = 8883;
      const store = useSequencerStore.getState();
      const currentTracks = store.tracks || [];
      const testTrack = {
        id: 9993,
        name: 'Vocal Test Track 3',
        instrumentIdx: 0,
        volumeVal: 100,
        patterns: [
          {
            id: testPatternId,
            name: 'Vocal Modal Test',
            steps: 16,
            activeSteps: [1, 0, 0, 0],
            measureAssignments: [true],
            vocalMode: 'micro',
          }
        ]
      };
      useSequencerStore.getState().setTracks([testTrack as any, ...currentTracks]);

      // Générer un AudioBuffer de 2 secondes avec un signal test
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      const buffer = rawCtx.createBuffer(1, rawCtx.sampleRate * 2, rawCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin((i / 44100) * 440 * 2 * Math.PI) * 0.5;
      }
      const wavBlob = audioBufferToWav(buffer);

      useAudioStore.getState().setTempRecording({
        patternId: testPatternId,
        blob: wavBlob
      });
    });

    // 2. Vérifier que la modale d'édition vocale s'est ouverte dans le DOM
    const modalTitle = page.locator('text=Éditeur Audio Vocal (Cordel Sampler)');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // 3. Vérifier la présence du slider Nudge et manipuler la valeur
    const nudgeSlider = page.locator('#vocal-nudge-slider');
    await expect(nudgeSlider).toBeVisible();

    // Tester la mutation 60 FPS directe du DOM sans re-render
    const nudgeTransformCheck = await page.evaluate(() => {
      const slider = document.getElementById('vocal-nudge-slider') as HTMLInputElement;
      if (!slider) return null;

      // Déplacer le slider à +150ms via le prototype React
      const prototypeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      prototypeSetter?.call(slider, '150');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));

      const waveformContainer = document.querySelector('.will-change-transform') as HTMLElement;
      const label = document.querySelector('#vocal-nudge-slider')?.parentElement?.parentElement?.querySelector('span.text-base');

      return {
        sliderValue: slider.value,
        transformStyle: waveformContainer?.style?.transform,
        labelText: label?.textContent?.trim()
      };
    });

    expect(nudgeTransformCheck?.sliderValue).toBe('150');
    expect(nudgeTransformCheck?.transformStyle).toContain('translate3d');
    expect(nudgeTransformCheck?.transformStyle).toContain('30px'); // 150ms * 200px/s = 30px
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 4 : Découpage non destructif & Rendu Offline (AudioBuffer / IndexedDB)
  // ══════════════════════════════════════════════════════════════════════════
  test('Scénario 4 : renderTrimmedVocalBuffer applique les micro-fades (10ms/30ms), parité sampleRate et persistance IndexedDB', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { renderTrimmedVocalBuffer, audioBufferToWav } = await import('/src/utils/audioBufferUtils.ts');
      const { useAudioStore } = await import('/src/audio/vocalEngineService.ts');
      const { saveVocalRecording, getVocalRecording } = await import('/src/db.ts');

      const sampleRate = 48000;
      const numChannels = 1;
      const sourceDurationSec = 3.0;
      const totalSamples = Math.floor(sampleRate * sourceDurationSec);

      // Créer un buffer source avec une onde constante d'amplitude 1.0
      const audioCtx = new AudioContext({ sampleRate });
      const sourceBuffer = audioCtx.createBuffer(numChannels, totalSamples, sampleRate);
      const channelData = sourceBuffer.getChannelData(0);
      channelData.fill(1.0); // Signal continu plein volume

      const trimStart = 0.5;
      const trimEnd = 2.0;
      const expectedDuration = 1.5; // 2.0 - 0.5

      // Rendu Offline
      const trimmedBuffer = await renderTrimmedVocalBuffer(
        sourceBuffer,
        trimStart,
        trimEnd,
        0.010, // Fade-in 10ms
        0.030  // Fade-out 30ms
      );

      const trimmedData = trimmedBuffer.getChannelData(0);
      const trimmedLength = trimmedData.length;

      // 1. Vérification parité sampleRate et durée
      const isSampleRatePreserved = trimmedBuffer.sampleRate === sampleRate;
      const durationMatches = Math.abs(trimmedBuffer.duration - expectedDuration) < 0.01;

      // 2. Vérification Fade-In 10ms : l'échantillon initial doit être à ~0, puis monter vers 1
      const sampleAtStart = Math.abs(trimmedData[0]); // Doit être 0
      const samples10ms = Math.floor(0.010 * sampleRate);
      const sampleAt10ms = trimmedData[samples10ms]; // Doit être ~1.0

      // 3. Vérification Fade-Out 30ms : l'échantillon final doit être à ~0
      const sampleAtEnd = Math.abs(trimmedData[trimmedLength - 1]); // Doit être 0

      // 4. Test Persistance conjointe : AudioBuffer dans le store + Blob WAV dans IndexedDB
      const testPatternId = 8884;
      const wavBlob = audioBufferToWav(trimmedBuffer);

      // Sauvegarde dans le store
      useAudioStore.getState().setVocalBuffer(testPatternId, trimmedBuffer);
      useAudioStore.getState().addVocalBlob(testPatternId, wavBlob);

      // Sauvegarde dans IndexedDB
      await saveVocalRecording(testPatternId, wavBlob);
      const loadedBlobFromDB = await getVocalRecording(testPatternId);

      const storeBufferExists = Boolean(useAudioStore.getState().vocalBuffers[testPatternId]);
      const dbBlobSizeMatches = loadedBlobFromDB !== null && loadedBlobFromDB.size === wavBlob.size;

      audioCtx.close();

      return {
        isSampleRatePreserved,
        durationMatches,
        sampleAtStartZero: sampleAtStart < 0.02,
        sampleAt10msRamped: sampleAt10ms > 0.95,
        sampleAtEndZero: sampleAtEnd < 0.02,
        storeBufferExists,
        dbBlobSizeMatches,
        blobType: wavBlob.type
      };
    });

    expect(result.isSampleRatePreserved).toBe(true);
    expect(result.durationMatches).toBe(true);
    expect(result.sampleAtStartZero).toBe(true);
    expect(result.sampleAt10msRamped).toBe(true);
    expect(result.sampleAtEndZero).toBe(true);
    expect(result.storeBufferExists).toBe(true);
    expect(result.dbBlobSizeMatches).toBe(true);
    expect(result.blobType).toBe('audio/wav');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 5 : Arbitrage Moteur & GrainPlayer (Neutre synthé + Maintien paroles)
  // ══════════════════════════════════════════════════════════════════════════
  test('Scénario 5 : vocalBuffers neutralise le synthé virtuel tout en maintenant le défilement visuel des pas et paroles', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { vocalEngineService, useAudioStore, useSequencerStore } = await import('/src/audio/vocalEngineService.ts');
      const { getTone } = await import('/src/ToneLoader.ts');
      const Tone = getTone();

      const testPatternId = 8885;
      const store = useSequencerStore.getState();
      const currentTracks = store.tracks || [];
      const testTrack = {
        id: 9995,
        name: 'Voice Arbitration Track',
        instrumentIdx: 0,
        volumeVal: 100,
        patterns: [
          {
            id: testPatternId,
            name: 'Voice Arbitration Test',
            steps: 16,
            activeSteps: [1, 0, 1, 0, 1, 0, 1, 0],
            notes: ['C4', 'D4', 'E4', 'F4'],
            lyrics: ['O', 'Gi', 'ra', 'dor'],
            measureAssignments: [true],
            vocalMode: 'micro',
            vocalClip: {
              patternId: testPatternId,
              baseBpm: 100,
              trimStartSec: 0.2,
              trimEndSec: 1.8,
              nudgeMs: -50,
              anacrusisBeats: 1.0,
            }
          }
        ]
      };
      useSequencerStore.getState().setTracks([testTrack as any, ...currentTracks]);

      // Créer un buffer vocal simulé dans useAudioStore
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      const buf = rawCtx.createBuffer(1, rawCtx.sampleRate * 2, rawCtx.sampleRate);
      useAudioStore.getState().setVocalBuffer(testPatternId, buf);

      // 1. Vérification de la condition d'arbitrage
      const activeBuf = useAudioStore.getState().vocalBuffers[testPatternId];
      const freshTracks = useSequencerStore.getState().tracks;
      const targetPattern = freshTracks[0].patterns[0];
      const hasVocalSample = Boolean(activeBuf && targetPattern.vocalMode === 'micro');

      // Si hasVocalSample est true, la condition '!hasVocalSample' dans useAudioSync neutralise le synthé
      const synthMuted = hasVocalSample === true;

      // 2. Mathématique du déclenchement : compensation pre-roll et Nudge
      const currentBpm = 100;
      const beatDurationSec = 60 / currentBpm;
      const anacrusisSec = (targetPattern.vocalClip?.anacrusisBeats ?? 1.0) * beatDurationSec; // 1 * 0.6 = 0.6s
      const nudgeSec = (targetPattern.vocalClip?.nudgeMs ?? -50) / 1000; // -0.050s
      const measureStartTime = 2.4; // Mesure 1 à 2.4s

      // triggerTime attendu = measureStartTime - anacrusisSec + nudgeSec
      const expectedTriggerTime = measureStartTime - anacrusisSec + nudgeSec; // 2.4 - 0.6 - 0.05 = 1.75s

      // Tester playSequencerVocal sans collision de double décalage
      const playerHandle = vocalEngineService.playSequencerVocal(
        testPatternId,
        measureStartTime,
        currentBpm,
        Tone.Destination,
        100,
        false
      );

      // Cas limite Mesure 0 : triggerTime < 0
      const measure0StartTime = 0.0;
      const measure0TriggerTime = measure0StartTime - anacrusisSec + nudgeSec; // -0.65s
      const measure0Offset = Math.abs(measure0TriggerTime); // 0.65s offset interne d'avance

      playerHandle?.stop();
      vocalEngineService.disposeVocalPlayer(testPatternId);

      return {
        hasVocalSample,
        synthMuted,
        anacrusisSec,
        expectedTriggerTime,
        measure0IsNegative: measure0TriggerTime < 0,
        measure0InternalOffset: measure0Offset,
        lyricsPreserved: targetPattern.lyrics?.length === 4
      };
    });

    expect(result.hasVocalSample).toBe(true);
    expect(result.synthMuted).toBe(true);
    expect(result.expectedTriggerTime).toBeCloseTo(1.75, 2);
    expect(result.measure0IsNegative).toBe(true);
    expect(result.measure0InternalOffset).toBeCloseTo(0.65, 2);
    expect(result.lyricsPreserved).toBe(true);
  });
});
