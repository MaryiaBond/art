import test from 'node:test';
import assert from 'node:assert/strict';
import {ArtworkViewer,mapPointerToImage,rgbToHex} from '../src/artwork-viewer.js';
import imageProxy,{trustedMuseumImageUrl} from '../netlify/functions/image-proxy.mjs';
import {createEmptyArchive,normalizeArchive,mergeArchives,createExport} from '../src/storage.js';

test('viewer maps a transformed image rectangle to exact source pixels',()=>{
 const point=mapPointerToImage({clientX:350,clientY:250,rect:{left:100,top:50,width:500,height:400},naturalWidth:2000,naturalHeight:1000});
 assert.deepEqual(point,{x:1000,y:500,relativeX:.5,relativeY:.5});
 assert.equal(mapPointerToImage({clientX:50,clientY:250,rect:{left:100,top:50,width:500,height:400},naturalWidth:2000,naturalHeight:1000}),null);
 assert.equal(rgbToHex(10,127.6,255),'#0A80FF');
});

test('visible viewer image never requests anonymous CORS and sampler stays opt-in',()=>{
 assert.doesNotMatch(ArtworkViewer.template,/crossorigin=/i);
 assert.doesNotMatch(ArtworkViewer.setup.toString(),/onMounted\([^)]*prepareSampler/);
 assert.match(ArtworkViewer.setup.toString(),/image\.crossOrigin='anonymous'/);
});

test('user-picked colors survive normalization, dedupe per artwork and remain separate across artworks',()=>{
 const archive=createEmptyArchive(),base={index:0,hex:'#aabbcc',source:'user-picked',savedAt:'2026-10-23T12:00:00.000Z',createdAt:'2026-10-23T12:00:00.000Z',savedOrder:1,x:.25,y:.75};
 archive.colors=[{...base,id:'pick-a',artworkId:'venus'},{...base,id:'pick-a-duplicate',artworkId:'venus'},{...base,id:'pick-b',artworkId:'mona'}];
 const clean=normalizeArchive(archive);
 assert.equal(clean.colors.length,2);
 assert.equal(clean.colors[0].source,'user-picked');
 assert.equal(clean.colors[0].hex,'#AABBCC');
 assert.equal(clean.colors[0].x,.25);
 const merged=mergeArchives(createEmptyArchive(),clean);
 assert.equal(merged.colors.length,2);
 assert.equal(createExport(merged,'test').colors[0].source,'user-picked');
});

test('image proxy accepts only explicit HTTPS museum image hosts and never caches responses',async()=>{
 assert.ok(trustedMuseumImageUrl('https://images.metmuseum.org/CRDImages/ep/original/DP.jpg'));
 assert.ok(trustedMuseumImageUrl('https://www.artic.edu/iiif/2/id/full/843,/0/default.jpg'));
 assert.equal(trustedMuseumImageUrl('http://images.metmuseum.org/image.jpg'),null);
 assert.equal(trustedMuseumImageUrl('https://images.metmuseum.org.evil.example/image.jpg'),null);
 const rejected=await imageProxy(new Request('https://art.example/.netlify/functions/image-proxy?url=https%3A%2F%2Fevil.example%2Fimage.jpg'));
 assert.equal(rejected.status,400);
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(new Uint8Array([1,2,3]),{status:200,headers:{'content-type':'image/jpeg','content-length':'3'}});
 try{const response=await imageProxy(new Request('https://art.example/.netlify/functions/image-proxy?url=https%3A%2F%2Fimages.metmuseum.org%2Fimage.jpg'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store, max-age=0');assert.equal(response.headers.get('access-control-allow-origin'),'*');assert.equal(response.headers.get('content-type'),'image/jpeg');assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3])}finally{globalThis.fetch=originalFetch}
});
