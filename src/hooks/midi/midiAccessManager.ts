export function setupWebMidiAccess(onMIDIMessage: (event: Event) => void): () => void {
  if (typeof window === 'undefined' || !navigator.requestMIDIAccess) return () => {};

  let midiAccess: MIDIAccess | null = null;
  const activeInputs = new Set<MIDIInput>();

  const setupInputs = (access: MIDIAccess) => {
    activeInputs.forEach((input) => { try { input.onmidimessage = null; } catch (_) {} });
    activeInputs.clear();
    access.inputs.forEach((input) => {
      input.onmidimessage = onMIDIMessage;
      activeInputs.add(input);
    });
  };

  const onStateChange = (event: Event) => {
    const port = (event as MIDIConnectionEvent).port;
    if (port?.type === 'input' && midiAccess) setupInputs(midiAccess);
  };

  navigator.requestMIDIAccess({ sysex: false }).then(
    (access) => {
      midiAccess = access;
      setupInputs(access);
      access.onstatechange = onStateChange;
    },
    (err) => { console.error('Failed to get MIDI access', err); }
  );

  const handleSimulatedMidiMessage = (e: Event) => {
    const customEvt = e as CustomEvent<{ data: number[] | Uint8Array }>;
    if (customEvt.detail?.data) onMIDIMessage({ data: new Uint8Array(customEvt.detail.data) } as any);
  };
  window.addEventListener('o-girador-simulate-midi', handleSimulatedMidiMessage);
  (window as any).__oGiradorSimulateMidi = (status: number, note: number, velocity: number) => {
    onMIDIMessage({ data: new Uint8Array([status, note, velocity]) } as any);
  };

  return () => {
    window.removeEventListener('o-girador-simulate-midi', handleSimulatedMidiMessage);
    delete (window as any).__oGiradorSimulateMidi;
    if (midiAccess) {
      midiAccess.onstatechange = null;
      midiAccess.inputs.forEach(input => { try { input.onmidimessage = null; } catch (_) {} });
    }
    activeInputs.forEach(input => { try { input.onmidimessage = null; } catch (_) {} });
  };
}
