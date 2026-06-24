let stepIdx = -1;
let currentTicks = 96;
let measureCount = 0;

for (let tick = 0; tick < 100; tick++) {
  let nextStepIdx = stepIdx + 1;

  if (stepIdx === -1) {
    nextStepIdx = 0;
  } else if (stepIdx === currentTicks - 1) {
    nextStepIdx = 0;
    measureCount++;
  } else {
    nextStepIdx = nextStepIdx % currentTicks;
  }

  stepIdx = nextStepIdx;
  
  if (stepIdx === 90 || stepIdx === 94 || stepIdx === 95 || stepIdx === 0) {
    console.log(`Tick ${tick}: played stepIdx=${stepIdx}, measure=${measureCount}`);
  }
}
