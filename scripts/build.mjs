// Safe static publish directory: NEVER copy .env, drafts, server functions or scripts.
import {rm,mkdir,copyFile,cp} from 'node:fs/promises';
import './generate-vectors.mjs';
const base=new URL('../',import.meta.url);
await rm(new URL('dist/',base),{recursive:true,force:true});
for(const name of ['','src/','src/features/k001/','src/features/k002/','data/','assets/'])await mkdir(new URL(`dist/${name}`,base),{recursive:true});
for(const file of ['index.html','manifest.webmanifest','sw.js','src/app.js','src/artwork-viewer.js','src/collections.js','src/discovery.js','src/icons.js','src/learning.js','src/ui.js','src/vector-art.js','src/vector-art.generated.js','src/practice.js','src/storage.js','src/styles.css','src/features/k001/exhibit.mjs','src/features/k001/k001.css','src/features/k002/exhibit.mjs','data/catalog.js','data/editorial-approved.js','assets/vue.global.js','assets/icon.svg','assets/icon-192.png','assets/icon-512.png'])await copyFile(new URL(file,base),new URL(`dist/${file}`,base));
await cp(new URL('assets/icons/',base),new URL('dist/assets/icons/',base),{recursive:true});
await cp(new URL('assets/artworks/',base),new URL('dist/assets/artworks/',base),{recursive:true});
await cp(new URL('assets/vectors/',base),new URL('dist/assets/vectors/',base),{recursive:true});
await copyFile(new URL('src/artwork-images.js',base),new URL('dist/src/artwork-images.js',base));
console.log('Static ART build ready: dist/');
