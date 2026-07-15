import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MidiTarget {
  trackId: string;
  instrumentId: string;
  symbol: string;
}

export type TransportAction = 'play' | 'stop' | 'record' | 'loop' | 'nextMeasure' | 'prevMeasure';

export interface TransportMapping {
  type: 'note' | 'cc';
  number: number;
}

interface MidiState {
  mappings: Record<number, MidiTarget>;
  isMidiLearnActive: boolean;
  waitingForMidiStroke: MidiTarget | null;
  transportMappings: Record<TransportAction, TransportMapping | null>;
  waitingForTransportAction: TransportAction | null;
  
  setMidiLearnActive: (active: boolean) => void;
  setWaitingForMidiStroke: (stroke: MidiTarget | null) => void;
  addMidiMapping: (note: number, stroke: MidiTarget) => void;
  removeMidiMapping: (note: number) => void;
  clearMidiMappings: () => void;
  
  setWaitingForTransportAction: (action: TransportAction | null) => void;
  addTransportMapping: (action: TransportAction, mapping: TransportMapping) => void;
  removeTransportMapping: (action: TransportAction) => void;
}

/* CPU / Audio justification: A simple, persistent Zustand store for MIDI configuration.
   To bypass React's virtual DOM overhead in high-frequency live playing,
   the MIDI event listener accesses this store's raw state via `useMidiStore.getState()` (non-reactive). */
export const useMidiStore = create<MidiState>()(
  persist(
    (set) => ({
      mappings: {},
      isMidiLearnActive: false,
      waitingForMidiStroke: null,
      transportMappings: {
        play: null,
        stop: null,
        record: null,
        loop: null,
        nextMeasure: null,
        prevMeasure: null,
      },
      waitingForTransportAction: null,
      
      setMidiLearnActive: (active) => set({ 
        isMidiLearnActive: active,
        waitingForMidiStroke: null
      }),
      
      setWaitingForMidiStroke: (stroke) => set({ waitingForMidiStroke: stroke }),
      
      addMidiMapping: (note, stroke) => set((state) => {
        // Clean up duplicates: if this target (track + symbol) was already mapped to another note, remove it.
        const updatedMappings = { ...state.mappings };
        for (const key in updatedMappings) {
          const numKey = Number(key);
          const m = updatedMappings[numKey];
          if (m && String(m.trackId) === String(stroke.trackId) && m.symbol === stroke.symbol) {
            delete updatedMappings[numKey];
          }
        }
        updatedMappings[note] = stroke;
        return { mappings: updatedMappings };
      }),
      
      removeMidiMapping: (note) => set((state) => {
        const updatedMappings = { ...state.mappings };
        delete updatedMappings[note];
        return { mappings: updatedMappings };
      }),
      
      clearMidiMappings: () => set({ mappings: {} }),
      
      setWaitingForTransportAction: (action) => set({ waitingForTransportAction: action }),
      
      addTransportMapping: (action, mapping) => set((state) => {
        // Clean up duplicates: if this key (type + number) was mapped to another transport action, clear that action first
        const next = { ...state.transportMappings };
        for (const act in next) {
          const m = next[act as TransportAction];
          if (m && m.type === mapping.type && m.number === mapping.number) {
            next[act as TransportAction] = null;
          }
        }
        next[action] = mapping;
        return { transportMappings: next };
      }),
      
      removeTransportMapping: (action) => set((state) => ({
        transportMappings: {
          ...state.transportMappings,
          [action]: null
        }
      })),
    }),
    {
      name: 'o-girador-midi-mappings',
    }
  )
);
