import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {arrowStrokeColors} from '../src/ui.js';

test('art arrow fills missing strokes with neutral grays',()=>{
 assert.deepEqual(arrowStrokeColors([]),['#777B77','#929692','#A8ABA7']);
 assert.deepEqual(arrowStrokeColors([{hex:'#112233'}]),['#112233','#929692','#A8ABA7']);
 assert.deepEqual(arrowStrokeColors(['#112233','#445566']),['#112233','#445566','#A8ABA7']);
});

test('art arrow uses only the last three supplied colors deterministically',()=>{
 const colors=['#000000','#111111','#222222','#333333'];
 assert.deepEqual(arrowStrokeColors(colors),['#111111','#222222','#333333']);
 assert.deepEqual(arrowStrokeColors(colors),arrowStrokeColors(colors));
});

test('lesson cards expose a full-card button without nesting their actions',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/class="library-card-hit"[^>]+openLesson\(lesson\.id,'library'\)/);
 assert.match(html,/class="card-actions"/);
 assert.ok(html.indexOf('class="library-card-hit"')<html.indexOf('class="card-actions"'));
});

test('approved vector assets drive arrows, palettes and gallery frames',async()=>{const [html,ui]=await Promise.all([readFile(new URL('../index.html',import.meta.url),'utf8'),readFile(new URL('../src/ui.js',import.meta.url),'utf8')]);assert.match(ui,/ui\/three-stroke-arrow/);assert.match(ui,/ui\/artist-palette/);assert.match(html,/name="ui\/mini-frame"/);assert.match(html,/<art-arrow-icon\s+direction="left"\s+:colors="activeIconColors"><\/art-arrow-icon>\s*Мои уроки/);assert.doesNotMatch(html,/←/)});

test('artwork palette is wired to real artwork images and the shared save action',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/class="artwork-full"[\s\S]*?<artwork-quick-palette-trigger\s+:artwork="activeArtwork"[^>]+@toggle-color="toggleSavedColor"/);
 assert.match(html,/class="practice-images"[\s\S]*?<artwork-quick-palette-trigger\s+:artwork="by\(artworks,id\)"[^>]+@toggle-color="toggleSavedColor"/);
 assert.match(html,/class="gallery-grid"[\s\S]*?name="ui\/mini-frame"[\s\S]*?<artwork-quick-palette-trigger :artwork="art"[^>]+@toggle-color="toggleSavedColor"/);
 assert.match(html,/class="library-card"[\s\S]*?<artwork-palette-swatches[^>]+@toggle-color="toggleSavedColor"/);
});

test('K-001 and K-002 vectors are bound in rendered exhibit templates',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/:name="`k001\/overlays\/\$\{k001Exhibit\.school\}`"/);
 assert.match(html,/:name="`k001\/levels\/level-\$\{k001Exhibit\.level\}`"/);
 assert.match(html,/:name="`k001\/status\/\$\{k001Exhibit\.status\}`"/);
 assert.match(html,/:name="`k002\/levels\/level-\$\{k002Exhibit\.level\}`"/);
});

test('production build copies every local module imported by the app',async()=>{
 const [app,build,worker]=await Promise.all([
  readFile(new URL('../src/app.js',import.meta.url),'utf8'),
  readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8'),
  readFile(new URL('../sw.js',import.meta.url),'utf8')
 ]);
 const imports=[...app.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)].map(match=>new URL(match[1],new URL('../src/app.js',import.meta.url)).pathname.split('/ATELIER-MVP/')[1]);
 for(const file of imports){assert.match(build,new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${file} is missing from build`);assert.match(worker,new RegExp(`/${file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`),`${file} is missing from service worker cache`)}
});

test('epoch discovery and lesson creation are reachable from the rendered period screen',async()=>{
 const [html,app]=await Promise.all([readFile(new URL('../index.html',import.meta.url),'utf8'),readFile(new URL('../src/app.js',import.meta.url),'utf8')]);
 assert.match(html,/Сгенерировать ознакомление|discoveryActionLabel/);
 assert.match(html,/@click="runDiscovery"/);
 assert.match(html,/Создать урок по эпохе/);
 assert.match(html,/value="compare">Сравнение художников/);
 assert.match(app,/discoverEpoch\(\{period,db/);
 assert.match(app,/storeGeneratedLesson\(body\.lesson,'period'\)/);
});
test('profile links to reactive interface color settings',async()=>{const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/class="profile-settings-link"/);assert.match(html,/page==='settings'/);assert.match(html,/:style="interfaceThemeStyle"/);assert.match(html,/setInterfaceColorMode\('automatic'\)/);assert.match(html,/setManualInterfaceColor\(selectedThemeSlot,color\.hex\)/)});
test('practice UI exposes contextual scopes, four modes and image answers',async()=>{const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/openPractice\('period',activePeriod\.id,'period'\)/);assert.match(html,/openPractice\('artist',activeArtist\.id,'artist'\)/);assert.match(html,/class="practice-mode-grid"/);assert.match(html,/activeSession\.mode==='find'/);assert.match(html,/repeatPracticeSession/);assert.match(html,/chooseAnotherPracticeMode/)});

test('mobile navigation is icon-only with enlarged targets and the artwork palette button has no shadow',async()=>{
 const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(css,/\.bottom-nav button\s*\{[^}]*min-height\s*:\s*60px/);
 assert.match(css,/\.bottom-nav button>span\s*\{[^}]*clip\s*:\s*rect\(0,\s*0,\s*0,\s*0\)/);
 assert.match(css,/\.bottom-nav \.app-icon\s*\{[^}]*width\s*:\s*31px;[^}]*height\s*:\s*31px/);
 assert.match(css,/\.bottom-nav button\.current::before\s*\{[^}]*background\s*:\s*rgba\(219,\s*222,\s*218,\s*\.55\)/);
 assert.match(css,/\.artwork-quick-trigger\s*\{[^}]*background\s*:\s*rgba\(248,\s*248,\s*246,\s*\.72\)[^}]*box-shadow\s*:\s*none/);
 assert.match(css,/\.artwork-palette-popover\s*\{[^}]*box-shadow\s*:\s*none/);
});
