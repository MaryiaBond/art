import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLECTION_PAGE_SIZE,visibleItems,nextVisibleCount,artworkYear,colorFamily,spectrumValue} from '../src/collections.js';

test('collection pagination starts at 24 and advances by 24',()=>{
 const items=Array.from({length:61},(_,index)=>index);
 assert.equal(visibleItems(items,0).length,COLLECTION_PAGE_SIZE);
 assert.equal(nextVisibleCount(24,61),48);
 assert.equal(nextVisibleCount(48,61),61);
});

test('artwork chronology understands dates before common era',()=>{
 assert.equal(artworkYear('ок. 590–580 до н. э.'),-590);
 assert.equal(artworkYear('7 декабря 1972'),1972);
});

test('color families keep low-saturation shades neutral',()=>{
 assert.equal(colorFamily('#777A78'),'neutral');
 assert.equal(colorFamily('#C7372F'),'red');
 assert.equal(colorFamily('#315EA8'),'blue');
 assert.ok(spectrumValue('#C7372F')<spectrumValue('#315EA8'));
});
