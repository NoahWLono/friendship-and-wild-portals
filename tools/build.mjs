import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { WORLDS } from '../src/catalog.js';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'src', 'LICENSE', 'THIRD-PARTY-NOTICES.txt']) await cp(file, `dist/${file}`, { recursive: true });
await cp('public', 'dist', { recursive: true });
await writeFile('dist/worlds.json', JSON.stringify(WORLDS, null, 2));
await writeFile('dist/.nojekyll', '');
console.log(`Built ${WORLDS.length} worlds into dist/ (self-contained static files)`);
