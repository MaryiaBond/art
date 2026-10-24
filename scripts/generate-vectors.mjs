import {readdir,readFile,writeFile} from 'node:fs/promises';

const base=new URL('../',import.meta.url),source=new URL('assets/vectors/',base),output=new URL('src/vector-art.generated.js',base);
const allowedTags=new Set(['path','circle','rect']);
const files=[];
async function walk(directory,prefix=''){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(entry.isDirectory())await walk(new URL(`${entry.name}/`,directory),`${prefix}${entry.name}/`);
  else if(entry.name.endsWith('.svg'))files.push({name:`${prefix}${entry.name.slice(0,-4)}`,url:new URL(entry.name,directory)});
 }
}
const attrs=text=>Object.fromEntries([...text.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match=>[match[1],match[2]]));
await walk(source);
const vectors={};
for(const file of files){
 const svg=await readFile(file.url,'utf8'),root=svg.match(/<svg\s+([^>]+)>/);
 if(!root)throw Error(`${file.name}: invalid SVG root`);
 const rootAttrs=attrs(root[1]),children=[];
 for(const match of svg.matchAll(/<(path|circle|rect)\s+([^>]*?)(?:\s*\/?>)/g)){
  if(!allowedTags.has(match[1]))throw Error(`${file.name}: unsupported ${match[1]}`);
  children.push([match[1],attrs(match[2])]);
 }
 if(!rootAttrs.viewBox||!children.length)throw Error(`${file.name}: missing viewBox or vector elements`);
 vectors[file.name]={viewBox:rootAttrs.viewBox,label:rootAttrs['aria-label']||file.name,children};
}
await writeFile(output,`// Generated from trusted local assets/vectors by scripts/generate-vectors.mjs.\nexport const VECTOR_DEFINITIONS=Object.freeze(${JSON.stringify(vectors,null,1)});\n`);
console.log(`Generated ${files.length} trusted inline SVG definitions.`);
