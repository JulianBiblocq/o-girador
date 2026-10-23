
import { useSequencerStore } from '../../stores/useSequencerStore';

export function commitGroupedAutomationValues(
  type: 'tempo' | 'volume' | 'pan' | 'reverb',
  trackId: number | null,
  totalMeasures: number,
  start: number,
  end: number,
  localValues: number[]
): void {
  const store = useSequencerStore.getState();

  if (type === 'tempo') {
    const nextBpms = [...store.measureBpms];
    while (nextBpms.length < totalMeasures) nextBpms.push(store.bpm || 83);
    for (let i = start; i <= end; i++) nextBpms[i] = localValues[i];
    useSequencerStore.setState({
      measureBpms: nextBpms,
      bpm: start === 0 ? nextBpms[0] : store.bpm,
      tracksVersion: store.tracksVersion + 1,
    });
    return;
  }

  if (type === 'volume' && (trackId === null || trackId === undefined)) {
    const nextVols = [...store.measureVols];
    while (nextVols.length < totalMeasures) nextVols.push(100);
    for (let i = start; i <= end; i++) nextVols[i] = localValues[i];
    useSequencerStore.setState({ measureVols: nextVols, tracksVersion: store.tracksVersion + 1 });
    return;
  }

  const prop = type === 'volume' ? 'measureVols' : type === 'pan' ? 'measurePans' : 'measureReverbs';
  const fallback = type === 'volume' ? 'volumeVal' : type === 'pan' ? 'panVal' : 'reverbVal';
  const defVal = type === 'volume' ? 75 : 0;

  const nextTracks = store.tracks.map(t => {
    if (t.id !== trackId) return t;
    const current = (t as any)[prop] ? [...(t as any)[prop]] : Array(totalMeasures).fill((t as any)[fallback] ?? defVal);
    while (current.length < totalMeasures) current.push((t as any)[fallback] ?? defVal);
    for (let i = start; i <= end; i++) current[i] = localValues[i];
    return { ...t, [prop]: current };
  });

  useSequencerStore.setState({ tracks: nextTracks, tracksVersion: store.tracksVersion + 1 });
}
