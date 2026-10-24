import test from 'node:test';
import assert from 'node:assert/strict';
import {getK002Level,getK002Exhibit,shouldUnlockK002,uniqueCreatedLessonIds} from '../src/features/k002/exhibit.mjs';

test('K-002 unlocks at three unique created lesson IDs',()=>{assert.equal(shouldUnlockK002(['a','b']),false);assert.equal(shouldUnlockK002(['a','b','a']),false);assert.equal(shouldUnlockK002(['a','b','c']),true);assert.deepEqual(uniqueCreatedLessonIds(['a','a','b']),['a','b'])});
test('K-002 uses all specified level boundaries',()=>{for(const [count,level] of [[2,null],[3,1],[6,1],[7,2],[14,2],[15,3],[29,3],[30,4],[59,4],[60,5]])assert.equal(getK002Level(count)?.level||null,level)});
test('K-002 counter and palette are independent from favorites',()=>{const exhibit=getK002Exhibit({createdLessonIds:['a','b','c'],savedColors:[{hex:'#112233'},{hex:'#445566'}]});assert.equal(exhibit.count,3);assert.equal(exhibit.level,1);assert.equal(exhibit.nextAt,7);assert.deepEqual(exhibit.palette,['#112233','#445566'])});
