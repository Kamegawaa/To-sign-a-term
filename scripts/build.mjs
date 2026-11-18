import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/vendor', { recursive: true });
await copyFile('node_modules/pdf-lib/dist/pdf-lib.min.js', 'dist/vendor/pdf-lib.min.js');
await copyFile('node_modules/fflate/umd/index.js', 'dist/vendor/fflate.min.js');
await copyFile('node_modules/pdf-lib/LICENSE.md', 'dist/vendor/pdf-lib-LICENSE.md');
await copyFile('node_modules/fflate/LICENSE', 'dist/vendor/fflate-LICENSE.txt');
console.log('Bibliotecas locais prontas.');
