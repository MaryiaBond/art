import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {ICON_DEFINITIONS,ICON_NAMES,recentUniqueColors,activeInterfaceColors,iconPaletteStyle} from '../src/icons.js';

const root=new URL('../',import.meta.url);

test('inline icon set has valid independent paint parts',()=>{
 assert.equal(ICON_NAMES.length,14);
 for(const [name,shapes] of Object.entries(ICON_DEFINITIONS)){
  assert.ok(shapes.length>0,`${name} has geometry`);
  for(const [tag,part,geometry] of shapes){
   assert.ok(tag==='path'||tag==='circle',`${name} uses a safe primitive`);
   assert.ok(['ink','edge','a','b','c'].includes(part),`${name} has a valid paint part`);
   assert.ok(geometry.d||Number.isFinite(geometry.r),`${name} has geometry data`);
  }
 }
 for(const emotion of ['joy','calm','melancholy','curiosity']){
  const parts=new Set(ICON_DEFINITIONS[emotion].map(([,part])=>part));
  assert.ok(parts.has('a')&&parts.has('b')&&parts.has('c'),`${emotion} keeps three colorable parts`);
 }
});

test('page uses inline icon component instead of an external SVG use tree',async()=>{
 const html=await readFile(new URL('index.html',root),'utf8');
 assert.doesNotMatch(html,/<use\b|sprite\.svg#/);
 assert.match(html,/<art-icon name="time"/);
 assert.match(html,/<art-icon name="practice"/);
 assert.match(html,/<art-icon name="self"/);
 assert.match(html,/<art-icon :name="feeling\.icon"/);
});

test('standalone SVG assets have intrinsic size and an unclipped common viewBox',async()=>{
 const iconDir=new URL('assets/icons/',root);
 const files=(await readdir(iconDir)).filter(name=>name.endsWith('.svg')&&name!=='sprite.svg');
 assert.equal(files.length,14);
 for(const file of files){
  const svg=await readFile(new URL(file,iconDir),'utf8');
  assert.match(svg,/^<svg[^>]*width="64"[^>]*height="64"[^>]*viewBox="0 0 64 64"/);
  assert.doesNotMatch(svg,/<(?:clipPath|mask)\b/);
 }
});

test('header is in document flow while bottom navigation stays fixed',async()=>{
 const css=await readFile(new URL('src/styles.css',root),'utf8');
 const topbar=css.match(/\.topbar\{([^}]*)\}/)?.[1]||'';
 assert.doesNotMatch(topbar,/position\s*:\s*(?:sticky|fixed)/);
 assert.match(css,/\.bottom-nav\s*\{[^}]*position\s*:\s*fixed/);
 assert.match(css,/\.shell\s*\{[^}]*padding-bottom\s*:\s*calc\(92px \+ env\(safe-area-inset-bottom\)\)/);
});

const color=(id,hex,savedOrder)=>({id,hex,savedOrder,savedAt:`2026-10-22T10:00:0${savedOrder}.000Z`});
test('fourth saved color replaces the oldest slot in the active trio',()=>{const active=recentUniqueColors([color('d','#444444',4),color('b','#222222',2),color('a','#111111',1),color('c','#333333',3)]);assert.deepEqual(active.map(item=>item.hex),['#222222','#333333','#444444'])});
test('deleting the latest color restores the next older saved color',()=>{const active=recentUniqueColors([color('a','#111111',1),color('b','#222222',2),color('c','#333333',3),color('d','#444444',4)].filter(item=>item.id!=='d'));assert.deepEqual(active.map(item=>item.hex),['#111111','#222222','#333333'])});
test('saving an existing shade again moves its unique shade to the newest slot',()=>{const active=recentUniqueColors([color('a','#111111',1),color('b','#222222',2),color('c','#333333',3),color('d','#444444',4),color('b-new','#222222',5)]);assert.deepEqual(active.map(item=>item.hex),['#333333','#444444','#222222']);assert.deepEqual(iconPaletteStyle(active,'nav-time'),iconPaletteStyle(active,'nav-time'))});
test('empty saved color collection produces a neutral icon palette',()=>{assert.deepEqual(recentUniqueColors([]),[]);const style=iconPaletteStyle([],'nav-time');assert.equal(style['--icon-c1'],'currentColor');assert.equal(style['--icon-ink'],'currentColor')});
test('automatic interface palette fills missing recent colors with neutral slots',()=>{assert.deepEqual(activeInterfaceColors([color('a','#112233',1)],{interfaceColorMode:'automatic'}),['#112233','#ADADAD','#777777'])});
test('manual interface palette stays independent from newly saved colors',()=>{const settings={interfaceColorMode:'manual',manualInterfacePalette:['#AABBCC','#DDEEFF','#102030']};assert.deepEqual(activeInterfaceColors([color('new','#FF0000',9)],settings),settings.manualInterfacePalette)});
