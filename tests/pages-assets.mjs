import { readFileSync, existsSync } from 'node:fs';
const html=readFileSync('docs/index.html','utf8');
const paths=[...html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)].map(m=>m[1]);
if(paths.length<2)throw Error('Missing Pages asset references');
for(const path of paths)if(!existsSync('docs/'+path.slice(2)))throw Error('Missing '+path);
console.log('GitHub Pages relative assets verified:',paths.length);
