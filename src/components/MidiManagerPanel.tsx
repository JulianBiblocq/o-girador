import React from 'react';
import { MidiPadsSection } from './midi-manager/MidiPadsSection';
import { MidiTransportSection } from './midi-manager/MidiTransportSection';

export const MidiManagerPanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 text-left font-sans">
      <MidiPadsSection />
      <MidiTransportSection />
    </div>
  );
};
