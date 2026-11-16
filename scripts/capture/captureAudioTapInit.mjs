/**
 * captureAudioTapInit.mjs — Robinet audio Master 48 kHz injecté uniquement en mode capture.
 * Zéro octet ajouté au bundle de production : intercepte les connexions vers `AudioContext.destination`
 * et les duplique vers un `MediaStreamAudioDestinationNode` enregistré en PCM 48 kHz sans perte.
 */

export const AUDIO_TAP_INIT_SCRIPT = `
(() => {
  if (window.__OG_CAPTURE_AUDIO__) return;

  const streamDestByCtx = new WeakMap();
  const tappedNodes = new WeakMap();
  let activeCtx = null;
  let activeStreamDest = null;
  let recorder = null;
  let recordedChunks = [];
  let audioStartPerfNow = 0;

  function ensureStreamDest(ctx) {
    if (!ctx || typeof ctx.createMediaStreamDestination !== 'function') return null;
    let dest = streamDestByCtx.get(ctx);
    if (!dest) {
      dest = ctx.createMediaStreamDestination();
      try {
        dest.channelCount = 2;
        dest.channelCountMode = 'explicit';
      } catch (_) {}
      // Source silencieuse continue pour garantir une piste audio ininterrompue dès t=0
      try {
        const keepAlive = ctx.createConstantSource();
        keepAlive.offset.value = 0;
        keepAlive.connect(dest);
        keepAlive.start(0);
      } catch (_) {}
      streamDestByCtx.set(ctx, dest);
    }
    activeCtx = ctx;
    activeStreamDest = dest;
    return dest;
  }

  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, outputIndex, inputIndex) {
    const result = arguments.length === 1
      ? origConnect.call(this, destination)
      : arguments.length === 2
        ? origConnect.call(this, destination, outputIndex)
        : origConnect.call(this, destination, outputIndex, inputIndex);

    try {
      const ctx = this.context;
      if (ctx && destination && destination === ctx.destination) {
        const tapDest = ensureStreamDest(ctx);
        if (tapDest) {
          let outs = tappedNodes.get(this);
          if (!outs) { outs = new Set(); tappedNodes.set(this, outs); }
          const outKey = outputIndex ?? 0;
          if (!outs.has(outKey)) {
            outs.add(outKey);
            origConnect.call(this, tapDest, outKey);
          }
        }
      }
    } catch (_) {}

    return result;
  };

  function pickMimeType() {
    const candidates = [
      'audio/webm;codecs=pcm',
      'audio/webm;codecs=opus',
      'audio/webm',
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
    }
    return '';
  }

  window.__OG_CAPTURE_AUDIO__ = {
    async startRecording() {
      if (activeCtx && activeCtx.state !== 'running') {
        try { await activeCtx.resume(); } catch (_) {}
      }
      if (!activeStreamDest) return { ok: false, reason: 'no-audio-context-destination-yet' };
      recordedChunks = [];
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(activeStreamDest.stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 320000,
      });
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
      };
      audioStartPerfNow = performance.now();
      recorder.start(100);
      return {
        ok: true,
        mimeType: recorder.mimeType,
        sampleRate: activeCtx ? activeCtx.sampleRate : 48000,
        audioStartPerfNow,
      };
    },

    stopRecordingBase64() {
      return new Promise((resolve) => {
        if (!recorder || recorder.state === 'inactive') {
          resolve({ ok: false, base64: '' });
          return;
        }
        const mimeType = recorder.mimeType || 'audio/webm';
        recorder.onstop = async () => {
          const audioStopPerfNow = performance.now();
          const blob = new Blob(recordedChunks, { type: mimeType });
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          const chunkSize = 0x8000;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
          }
          resolve({
            ok: true,
            mimeType,
            base64: btoa(binary),
            audioStartPerfNow,
            audioStopPerfNow,
            sampleRate: activeCtx ? activeCtx.sampleRate : 48000,
          });
        };
        recorder.stop();
      });
    },
  };
})();
`;
