export function scheduleBeep(
  ctx: AudioContext,
  timeSec: number,
  frequency: number,
  gainLevel = 0.4
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, timeSec);
  gain.gain.setValueAtTime(gainLevel, timeSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, timeSec + 0.045);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(timeSec);
  osc.stop(timeSec + 0.05);
  return osc;
}

export function flashLed(el: HTMLElement | null, isAccent: boolean) {
  if (!el) return;
  try {
    el.animate(
      [
        {
          transform: isAccent ? 'scale(1.35)' : 'scale(1.2)',
          backgroundColor: isAccent ? '#22c55e' : '#eab308',
          boxShadow: isAccent ? '0 0 12px #22c55e' : '0 0 8px #eab308',
          opacity: 1
        },
        { transform: 'scale(1)', backgroundColor: '#3a2e22', boxShadow: 'none', opacity: 0.6 }
      ],
      { duration: isAccent ? 220 : 160, easing: 'ease-out' }
    );
  } catch (_) {}
}
