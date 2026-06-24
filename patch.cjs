const fs = require('fs');
let c = fs.readFileSync('src/components/TimelineSequencer.tsx', 'utf8');

c = c.replace(/import \{ useAudio \} from '\.\.\/contexts\/AudioContext';\n?/, '');

c = c.replace(/onLoadCloudSection\?: \(insertAtMeasure: number\) => void;/g, `onLoadCloudSection?: (insertAtMeasure: number) => void;
  onNavigate?: (measureIdx: number, stepIdx: number) => void;
  maxTicksRef?: React.MutableRefObject<number>;`);

c = c.replace(/onLoadCloudSection,\n\}\) => \{/g, `onLoadCloudSection,
  onNavigate,
  maxTicksRef,
}) => {`);

c = c.replace(/\s*const audio = useAudio\(\);\s*/g, '\n  ');

c = c.replace(/\s*const \{\s*maxTicksRef,\s*handleTimelineNavigate: onNavigate,\s*\} = audio;\s*/g, '\n  ');

c = c.replace(/const maxTicks = maxTicksRef\.current;/g, 'const maxTicks = maxTicksRef ? maxTicksRef.current : 0;');

c = c.replace(/<TimelineTrackRow key=\{track\.id\} trackId=\{track\.id\} \/>/g, '<TimelineTrackRow key={track.id} trackId={track.id} onNavigate={onNavigate} />');

fs.writeFileSync('src/components/TimelineSequencer.tsx', c);
console.log('TimelineSequencer patched');
