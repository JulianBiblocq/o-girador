import fs from 'fs';

const filePath = 'src/data/audioConfig.ts';
let content = fs.readFileSync(filePath, 'utf8');
const before = (content.match(/E:\/projets\/Roda de maracatu\/Mixdown\//g) || []).length;
content = content.split('E:/projets/Roda de maracatu/Mixdown/').join('/Mixdown/');
fs.writeFileSync(filePath, content, 'utf8');
console.log(`Fixed ${before} absolute path(s) in ${filePath}`);
