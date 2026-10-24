import {spawn} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),profile=await mkdtemp(join(tmpdir(),'art-color-picker-')),debugPort=9300+Math.floor(Math.random()*500),server=spawn(process.execPath,['scripts/serve-color-picker-audit.mjs'],{cwd:process.cwd(),stdio:'inherit'}),chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
async function waitForPage(){for(let attempt=0;attempt<80;attempt+=1){try{const response=await fetch(`http://127.0.0.1:${debugPort}/json/new?http://127.0.0.1:8091/`,{method:'PUT',signal:AbortSignal.timeout(300)});if(response.ok)return(await response.json()).webSocketDebuggerUrl}catch{}await pause(100)}throw Error('Chrome DevTools did not start')}
try{await pause(250);console.log('Starting browser audit…');const endpoint=await waitForPage();console.log('Chrome DevTools ready.');const audit=spawn(process.execPath,['scripts/audit-color-picker-browser.mjs',endpoint],{cwd:process.cwd(),stdio:'inherit'}),limit=setTimeout(()=>audit.kill('SIGTERM'),24000),code=await new Promise(resolve=>audit.on('close',resolve));clearTimeout(limit);if(code!==0)process.exitCode=code??1}finally{server.kill('SIGTERM');chrome.kill('SIGTERM')}
