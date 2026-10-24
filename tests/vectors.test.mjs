import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {VECTOR_DEFINITIONS} from '../src/vector-art.generated.js';
import {vectorPalette} from '../src/vector-art.js';

test('runtime vector kit has all 26 required trusted inline definitions',()=>{assert.equal(Object.keys(VECTOR_DEFINITIONS).length,26);for(const [name,definition] of Object.entries(VECTOR_DEFINITIONS)){assert.match(definition.viewBox,/^0 0 \d+ \d+$/);assert.ok(definition.children.length,`${name} is empty`);assert.ok(definition.children.every(([tag])=>['path','circle','rect'].includes(tag)))}});
test('vector palette fills missing slots neutrally and keeps the last three',()=>{assert.deepEqual(vectorPalette([]),['#898989','#ADADAD','#777777']);assert.deepEqual(vectorPalette(['#111111']),['#111111','#ADADAD','#777777']);assert.deepEqual(vectorPalette(['#111111','#222222','#333333','#444444']),['#222222','#333333','#444444'])});
test('published vector sources contain no raster images or unsafe runtime HTML',async()=>{const files=[];for(const folder of ['k001/levels','k001/overlays','k001/status','k002/levels','ui'])for(const file of await readdir(new URL(`../assets/vectors/${folder}/`,import.meta.url)))files.push(new URL(`../assets/vectors/${folder}/${file}`,import.meta.url));assert.equal(files.length,26);for(const file of files){const svg=await readFile(file,'utf8');assert.doesNotMatch(svg,/<image\b|<script\b|javascript:/i);assert.match(svg,/viewBox=/)}const component=await readFile(new URL('../src/vector-art.js',import.meta.url),'utf8');assert.doesNotMatch(component,/v-html|innerHTML/)});
