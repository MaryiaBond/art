import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const profile=await mkdtemp(join(tmpdir(),'art-theme-audit-')),port=9400+Math.floor(Math.random()*300);
const server=spawn('python3',['-m','http.server','8092','--directory','dist'],{cwd:process.cwd(),stdio:'ignore'});
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let socket;
try{
 let endpoint='';for(let attempt=0;attempt<80&&!endpoint;attempt+=1){try{const response=await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:8092/%23profile`,{method:'PUT',signal:AbortSignal.timeout(300)});if(response.ok)endpoint=(await response.json()).webSocketDebuggerUrl}catch{}if(!endpoint)await pause(100)}
 if(!endpoint)throw Error('Chrome DevTools did not start');socket=new WebSocket(endpoint);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
 const pending=new Map();let id=0;socket.addEventListener('message',async event=>{const message=JSON.parse(typeof event.data==='string'?event.data:await event.data.text()),task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(Error(message.error.message)):task.resolve(message.result)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}))});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
 const waitFor=async expression=>{for(let attempt=0;attempt<60;attempt+=1){const result=await evaluate(expression);if(result)return result;await pause(100)}throw Error(`Timed out: ${expression}`)};
 await call('Runtime.enable');await waitFor(`!document.querySelector('[v-cloak]')&&!!document.querySelector('.profile-settings-link')`);
 await evaluate(`document.querySelector('.profile-settings-link').click()`);await waitFor(`!!document.querySelector('.interface-color-settings')`);
 const initial=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.shell'));return{hash:location.hash,mode:document.querySelector('.theme-mode-switch button.active').innerText,colors:[s.getPropertyValue('--art-c1').trim(),s.getPropertyValue('--art-c2').trim(),s.getPropertyValue('--art-c3').trim()]}})()`);
 await evaluate(`document.querySelectorAll('.theme-mode-switch button')[1].click()`);await waitFor(`!!document.querySelector('.manual-color-slots input[type="color"]')`);await evaluate(`(()=>{const input=document.querySelector('.manual-color-slots input[type="color"]');input.value='#123456';input.dispatchEvent(new Event('input',{bubbles:true}))})()`);await pause(300);
 const manual=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.shell'));return{mode:document.querySelector('.theme-mode-switch button.active').innerText,colors:[s.getPropertyValue('--art-c1').trim(),s.getPropertyValue('--art-c2').trim(),s.getPropertyValue('--art-c3').trim()]}})()`);
 await evaluate(`history.pushState({},'', '#artwork?artwork=venus&from=settings');window.dispatchEvent(new PopStateEvent('popstate'))`);await waitFor(`!!document.querySelector('.artwork-palette-swatch')`);await evaluate(`document.querySelector('.artwork-palette-swatch').click()`);await pause(350);
 const afterSave=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('.shell'));return[s.getPropertyValue('--art-c1').trim(),s.getPropertyValue('--art-c2').trim(),s.getPropertyValue('--art-c3').trim()]})()`);
 const persisted=await evaluate(`new Promise(resolve=>{const request=indexedDB.open('art-local-v1',3);request.onsuccess=()=>{const get=request.result.transaction('meta','readonly').objectStore('meta').get('settings');get.onsuccess=()=>resolve(get.result?.value)}})`);
 if(initial.hash!=='#settings'||manual.mode!=='Вручную'||manual.colors[0]!=='#123456'||afterSave[0]!=='#123456'||persisted?.interfaceColorMode!=='manual'||persisted?.manualInterfacePalette?.[0]!=='#123456')throw Error(JSON.stringify({initial,manual,afterSave,persisted}));
 console.log(JSON.stringify({initial,manual,afterSave,persisted:true},null,2));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM')}
