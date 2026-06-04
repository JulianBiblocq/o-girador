import { Circle, TrackGroup, Pattern } from './types';

export function migrateCirclesToTracks(circles: Circle[], totalMeasures: number): TrackGroup[] {
  if (!circles || circles.length === 0) return [];

  // Group circles by instrumentIdx
  const grouped = new Map<number, Circle[]>();
  circles.forEach(c => {
    if (!grouped.has(c.instrumentIdx)) grouped.set(c.instrumentIdx, []);
    grouped.get(c.instrumentIdx)!.push(c);
  });

  const tracks: TrackGroup[] = [];
  
  grouped.forEach((groupCircles, instIdx) => {
    const patterns: Pattern[] = [];
    
    groupCircles.forEach((c, i) => {
      const measureAssignments = Array(totalMeasures).fill(false);
      
      const pattern: Pattern = {
        id: c.id,
        name: `Padrão ${i + 1}`,
        steps: c.steps,
        activeSteps: c.activeSteps,
        lyrics: c.lyrics,
        notes: c.notes,
        measureAssignments: measureAssignments,
      };
      patterns.push(pattern);
    });
    
    if (patterns.length === 1) {
      patterns[0].measureAssignments = Array(totalMeasures).fill(true);
    } else {
      const sumRepeats = groupCircles.reduce((sum, c) => sum + (c.repeats || 1), 0);
      for (let m = 0; m < totalMeasures; m++) {
        const cursor = m % sumRepeats;
        let runValue = 0;
        for (let i = 0; i < groupCircles.length; i++) {
          runValue += (groupCircles[i].repeats || 1);
          if (cursor < runValue) {
            patterns[i].measureAssignments[m] = true;
            break;
          }
        }
      }
    }
    
    const track: TrackGroup = {
      id: Date.now() + Math.floor(Math.random() * 10000) + instIdx,
      instrumentIdx: instIdx,
      patterns: patterns,
      isMute: groupCircles[0].isMute,
      isSolo: groupCircles[0].isSolo,
      isHidden: groupCircles[0].isHidden,
      volumeVal: groupCircles[0].volumeVal,
      selectedPatternId: patterns[0].id,
      radius: groupCircles[0].radius,
      reverbVal: 0,
      panVal: 0,
    };
    tracks.push(track);
  });
  
  return tracks;
}
