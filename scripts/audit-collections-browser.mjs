import {mkdir,writeFile} from 'node:fs/promises';

const endpoint=process.argv[2];
if(!endpoint)throw Error('Pass a Chrome DevTools websocket endpoint.');
const socket=new WebSocket(endpoint),pending=new Map();let sequence=0;
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(!message.id)return;const task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(Error(message.error.message)):task.resolve(message.result)});
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=async expression=>(await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
const output=new URL('../artifacts/collections-audit/',import.meta.url);await mkdir(output,{recursive:true});
await call('Runtime.enable');await call('Page.enable');
await evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open('art-local-v1',2);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['favorites','colors','lessonProgress'],'readwrite'),favorites=tx.objectStore('favorites'),colors=tx.objectStore('colors'),progress=tx.objectStore('lessonProgress'),ids=['venus','primavera','mona','ermine','vermeer-water-pitcher','horse-fair','waterlilies','sunrise','van-gogh-cypresses','af-klint-adulthood'];favorites.clear();colors.clear();progress.clear();ids.forEach((artworkId,index)=>favorites.put({artworkId,createdAt:new Date(Date.UTC(2026,9,index+1)).toISOString()}));[['venus',['#C8B69A','#8AA9A1','#C69E79']],['mona',['#373930','#6C6A4B','#A39372']],['waterlilies',['#638B9D','#77978C','#8D83A3','#C9AD92']],['sunrise',['#697D8B','#D7885D']],['af-klint-adulthood',['#D98E9B','#E8C975','#6F82A6']]].forEach(([artworkId,values],artIndex)=>values.forEach((hex,index)=>colors.put({id:artworkId+':'+index,artworkId,index,hex,savedAt:new Date(Date.UTC(2026,9,artIndex*5+index+1)).toISOString(),createdAt:new Date(Date.UTC(2026,9,artIndex*5+index+1)).toISOString(),savedOrder:artIndex*5+index+1})));progress.put({lessonId:'lesson-renaissance',source:'official',status:'in-progress',currentBlock:1,completedBlocks:['ren-context'],startedAt:'2026-10-20T10:00:00.000Z',updatedAt:'2026-10-22T10:00:00.000Z',completedAt:'',answers:{},reflection:''});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)}})`);
await call('Page.reload',{ignoreCache:true});await pause(900);
const results={};
for(const width of [375,390,430]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
 for(const page of ['profile','gallery','colors','library']){
  await evaluate(`location.hash='#${page}'`);await pause(250);
  results[`${page}-${width}`]=await evaluate(`({cloak:document.querySelector('[v-cloak]')!==null,title:document.querySelector('main h1')?.innerText||'',filterButtons:document.querySelectorAll('.collection-tool-button').length,navIcons:document.querySelectorAll('.bottom-nav .app-icon').length,navLabels:[...document.querySelectorAll('.bottom-nav button>span')].map(node=>getComputedStyle(node).position),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})`);
  if(width===390){const shot=await call('Page.captureScreenshot',{format:'png',fromSurface:true});await writeFile(new URL(`${page}-${width}.png`,output),Buffer.from(shot.data,'base64'))}
 }
}
await evaluate(`location.hash='#gallery'`);await pause(200);await evaluate(`document.querySelector('.gallery-piece-open')?.click()`);await pause(200);
results.galleryArtworkRoute=await evaluate(`({hash:location.hash,backLabel:document.querySelector('.back')?.innerText.trim(),arrow:!!document.querySelector('.back svg.art-arrow-icon')})`);
await call('Page.navigate',{url:'http://127.0.0.1:8088/#period-artworks?period=renaissance'});await pause(500);
results.directPeriodWorks=await evaluate(`({title:document.querySelector('main h1')?.innerText||'',cards:document.querySelectorAll('.work-card').length,found:document.querySelector('.collection-result-count')?.innerText||''})`);
await call('Page.navigate',{url:'http://127.0.0.1:8088/#profile'});await pause(350);
results.profileLimits=await evaluate(`({favorites:document.querySelectorAll('.gallery-piece').length,colors:document.querySelectorAll('.profile-colors button').length,lessons:document.querySelectorAll('.profile-lessons>button').length,frames:document.querySelectorAll('.gallery-mini-frame').length})`);
await evaluate(`location.hash='#period?period=renaissance'`);await pause(250);
results.periodLimits=await evaluate(`({artists:document.querySelectorAll('.entity-chips>button').length,works:document.querySelectorAll('.works-grid .work-card').length,lessons:document.querySelectorAll('.lesson-card').length})`);
await call('Page.navigate',{url:'http://127.0.0.1:8088/#lesson?lesson=lesson-renaissance&from=library'});await pause(350);
results.directLesson=await evaluate(`({title:document.querySelector('main h1')?.innerText||'',progress:!!document.querySelector('.lesson-step-line'),back:document.querySelector('.back')?.innerText.trim()})`);
console.log(JSON.stringify(results,null,2));socket.close();
