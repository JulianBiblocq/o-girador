const fs = require('fs');
let c = fs.readFileSync('src/stores/useSequencerStore.ts', 'utf8');

c = c.replace(/typeof updater === 'function' \? updater\(state\.tracks\) : updater/g, "typeof updater === 'function' ? (updater as any)(state.tracks) : updater");

c = c.replace(/typeof \$1 === 'function' \? \$1\(state\.(.+?)\) : \$1/g, "typeof \\$1 === 'function' ? (\\$1 as any)(state.$1) : \\$1");

fs.writeFileSync('src/stores/useSequencerStore.ts', c);
