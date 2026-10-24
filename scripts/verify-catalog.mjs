// Catalog integrity check. Add --network to probe public HTTPS records without downloading images.
import {access} from 'node:fs/promises';
import {artworks,validateCatalog} from '../data/catalog.js';

validateCatalog();
const failures=[],warnings=[];
for(const artwork of artworks){
 try{await access(new URL(`..${artwork.image}`,import.meta.url))}catch{failures.push(`${artwork.id}: local image is missing`)}
 for(const field of ['source','imageSource','licenseUrl']){
  try{const url=new URL(artwork[field]);if(url.protocol!=='https:')throw Error()}catch{failures.push(`${artwork.id}: invalid ${field}`)}
 }
 if(!artwork.license?.trim())failures.push(`${artwork.id}: license is missing`);
}

if(process.argv.includes('--network')){
 const targets=[...new Map(artworks.flatMap(artwork=>['source','imageSource','licenseUrl'].map(field=>[artwork[field],`${artwork.id}.${field}`]))).entries()];
 const probe=async([url,label])=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   let response=await fetch(url,{method:'HEAD',redirect:'follow',signal:controller.signal,headers:{'User-Agent':'ART-catalog-verifier/1.0'}});
   if(response.status===405||response.status===501)response=await fetch(url,{method:'GET',redirect:'follow',signal:controller.signal,headers:{Range:'bytes=0-0','User-Agent':'ART-catalog-verifier/1.0'}});
   if(!response.ok){const message=`${label}: HTTP ${response.status}`;(response.status===403||response.status===408||response.status===429||response.status>=500?warnings:failures).push(message)}
  }catch(error){warnings.push(`${label}: ${error.name==='AbortError'?'timeout':'network error'}`)}finally{clearTimeout(timer)}
 };
 for(let index=0;index<targets.length;index+=4)await Promise.all(targets.slice(index,index+4).map(probe));
}

if(warnings.length)console.warn(`Inconclusive network probes (rate limit, protection or temporary outage):\n${warnings.join('\n')}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`Catalog valid: ${artworks.length} works, local images present, source and license fields valid${process.argv.includes('--network')?', with no confirmed broken links':''}.`);
