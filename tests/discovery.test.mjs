import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyArchive,normalizeArchive} from '../src/storage.js';
import {discoverEpoch,discoverArtistInitial,discoverArtistMore,mergeVerifiedBatch} from '../src/discovery.js';
import discoveryHandler,{classifyMuseumRecords,matchesCandidate,matchesKnownTitle} from '../netlify/functions/discover-epoch.mjs';

const period={id:'impressionism',title:'Импрессионизм'};
const artist=(id,name)=>({id,name,periodId:period.id,region:'Франция',biography:'Проверяемый учебный текст.',provider:'cleveland',externalId:`cleveland:${id}`,sourceUrl:'https://www.clevelandart.org/',verifiedAt:'2026-10-23T10:00:00.000Z',verificationStatus:'verified'});
const artwork=(externalId,artistId,name,title)=>({id:`local-cleveland-${externalId}`.replace(/[^a-zA-Z0-9:_-]/g,'-'),provider:'cleveland',externalId,title,artistId,artist:name,periodId:period.id,year:'1890',movement:'Импрессионизм',region:'Франция',material:'Холст, масло',technique:'Живопись',type:'Картина',detail:'Нейтральное описание произведения.',features:['Свет','Цвет'],palette:['#AABBCC','#334455'],imageUrl:`https://openaccess-cdn.clevelandart.org/${externalId}.jpg`,sourceUrl:`https://www.clevelandart.org/art/${externalId}`,museum:'Cleveland Museum of Art',license:'CC0',licenseUrl:'https://www.clevelandart.org/open-access',attribution:'Open Access',verifiedAt:'2026-10-23T10:00:00.000Z',verificationStatus:'verified'});
const response=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});

test('verified batches are validated, deduplicated by museum record and never overwrite an existing record',()=>{
 const db=createEmptyArchive(),monet=artist('monet','Claude Monet'),original=artwork('1960.81','monet','Claude Monet','Кувшинки');
 assert.equal(mergeVerifiedBatch(db,{artist:monet,artworks:[original]}).length,1);
 assert.equal(mergeVerifiedBatch(db,{artist:{...monet,biography:'Перезапись'},artworks:[{...original,title:'Перезапись'}]}).length,0);
 assert.equal(db.localArtworks[0].title,'Кувшинки');
 assert.equal(db.localArtists[0].biography,'Проверяемый учебный текст.');
 assert.throws(()=>mergeVerifiedBatch(db,{artist:monet,artworks:[{...artwork('bad','monet','Claude Monet','Без изображения'),imageUrl:''}]}),/изображение/);
});

test('discovery persists each batch and resumes without repeating the plan',async()=>{
 const db=createEmptyArchive(),calls=[],snapshots=[];let renoirFailures=0;
 const fetchImpl=async(_url,options)=>{const input=JSON.parse(options.body);calls.push(`${input.action}:${input.candidate?.name||'epoch'}`);
  if(input.action==='plan')return response(200,{overview:'Проверенный обзор эпохи.',features:['Свет','Пленэр'],sources:['https://www.clevelandart.org/open-access'],candidates:[{name:'Claude Monet',region:'Франция',query:'Claude Monet',biography:'Клод Моне.'},{name:'Pierre-Auguste Renoir',region:'Франция',query:'Pierre-Auguste Renoir',biography:'Огюст Ренуар.'}]});
  if(input.candidate.name==='Claude Monet')return response(200,{artist:artist('monet','Claude Monet'),artworks:[artwork('1960.81','monet','Claude Monet','Кувшинки')],message:'Подтверждено: 1'});
  if(renoirFailures++<2)throw Error('temporary network error');
  return response(200,{artist:artist('renoir','Pierre-Auguste Renoir'),artworks:[artwork('1942.1094','renoir','Pierre-Auguste Renoir','Яблоки')],message:'Подтверждено: 1'});
 };
 const persist=async()=>snapshots.push(normalizeArchive(structuredClone(db)));
 await assert.rejects(()=>discoverEpoch({period,db,fetchImpl,persist}),/temporary network error/);
 assert.equal(db.discoveryJobs[0].status,'paused');
 assert.equal(db.discoveryJobs[0].currentIndex,1);
 assert.equal(db.discoveryJobs[0].addedCount,1);
 const result=await discoverEpoch({period,db,fetchImpl,persist});
 assert.equal(result.runAdded,2);
 assert.equal(db.localArtworks.length,2);
 assert.equal(db.epochDiscoveries[0].runCount,1);
 assert.equal(db.epochDiscoveries[0].status,'complete');
 assert.equal(calls.filter(value=>value==='plan:epoch').length,1);
 assert.ok(snapshots.length>=5);
});

test('a later discovery run keeps existing museum records and changes the action to extension semantics',async()=>{
 const db=createEmptyArchive(),monet=artist('monet','Claude Monet'),work=artwork('1960.81','monet','Claude Monet','Кувшинки');
 mergeVerifiedBatch(db,{artist:monet,artworks:[work]});
 const fetchImpl=async(_url,options)=>{const input=JSON.parse(options.body);return input.action==='plan'?response(200,{overview:'Дополненный обзор.',features:['Свет','Цвет'],sources:['https://www.clevelandart.org/open-access'],candidates:[{name:'Claude Monet',region:'Франция',query:'Claude Monet',biography:'Клод Моне.'}]}):response(200,{artist:monet,artworks:[{...work,title:'Не должна заменить сохранённую запись'}],message:'Новых записей нет'})};
 const result=await discoverEpoch({period,db,fetchImpl});
 assert.equal(result.addedCount,0);
 assert.equal(db.localArtworks[0].title,'Кувшинки');
 assert.equal(db.epochDiscoveries[0].status,'empty');
});

test('plan receives official artists and verify receives only persisted verified museum keys',async()=>{
 const db=createEmptyArchive(),payloads=[];
 db.localArtworks.push(artwork('saved-local','monet','Claude Monet','Сохранённая работа'),{...artwork('partial-local','monet','Claude Monet','Неполная запись'),verificationStatus:'partial'});
 const fetchImpl=async(_url,options)=>{const input=JSON.parse(options.body);payloads.push(input);if(input.action==='plan')return response(200,{overview:'Обзор.',features:['Свет','Цвет'],sources:[],candidates:[{name:'Рембрандт',region:'Нидерланды',query:'Rembrandt van Rijn',biography:'Биография.'}]});return response(200,{artist:null,artworks:[],diagnostics:{fetched:0,duplicates:0,rejectedByReason:{},accepted:0,saved:0},message:'Новых записей нет'})};
 await discoverEpoch({period:{id:'baroque',title:'Барокко'},db,existingArtistNames:['Ян Вермеер'],existingArtworkKeys:['met:437881'],fetchImpl});
 assert.deepEqual(payloads[0].existingArtistNames,['Ян Вермеер']);
 assert.deepEqual(payloads[1].existingKeys.sort(),['cleveland:saved-local','met:437881']);
});

test('museum diagnostics accept English Rembrandt attribution for a Russian candidate and count every rejection reason',()=>{
 const candidate={name:'Рембрандт',query:'Rembrandt van Rijn'};
 assert.equal(matchesCandidate('Rembrandt van Rijn (Dutch, 1606–1669)',candidate),true);
 const base={provider:'met',verificationStatus:'verified',imageUrl:'https://museum.test/image.jpg',sourceUrl:'https://museum.test/art',licenseUrl:'https://museum.test/license'};
 const result=classifyMuseumRecords({artworks:[{...base,externalId:'accepted',artist:'Rembrandt'},{...base,externalId:'duplicate',artist:'Rembrandt'},{...base,externalId:'mismatch',artist:'Frans Hals'},{...base,externalId:'no-image',artist:'Rembrandt',imageUrl:''},{...base,externalId:'no-license',artist:'Rembrandt',licenseUrl:''},{...base,externalId:'no-source',artist:'Rembrandt',sourceUrl:''}],errors:[{provider:'aic',status:403,type:'MuseumRequestError'}]},{candidate,existingKeys:new Set(['met:duplicate'])});
 assert.equal(result.diagnostics.fetched,6);
 assert.equal(result.diagnostics.duplicates,1);
 assert.equal(result.diagnostics.accepted,1);
 assert.deepEqual(result.diagnostics.rejectedByReason,{duplicate:1,artist_mismatch:1,missing_image:1,missing_license:1,missing_source:1,provider_error:1});
});

test('notable-work matching rejects a different painting that only shares a generic title word',()=>{
 const vermeer={id:'vermeer',name:'Ян Вермеер'};
 assert.equal(matchesKnownTitle('The Milkmaid',{title:'Молочница',query:'Johannes Vermeer The Milkmaid'},vermeer),true);
 assert.equal(matchesKnownTitle('Girl Reading a Letter at an Open Window',{title:'Девушка с жемчужной серёжкой',query:'Johannes Vermeer Girl with a Pearl Earring'},vermeer),false);
});

test('verify response reports a Rembrandt museum record through enrichment as saved',async()=>{
 const before={enabled:process.env.AI_PUBLIC_ENABLED,key:process.env.GEMINI_API_KEY},originalFetch=globalThis.fetch,originalError=console.error;process.env.AI_PUBLIC_ENABLED='true';process.env.GEMINI_API_KEY='test';console.error=()=>{};
 globalThis.fetch=async(url)=>{const value=String(url);if(value.includes('collectionapi.metmuseum.org/public/collection/v1.1/search'))return new Response(JSON.stringify({objectIDs:[369807]}));if(value.includes('/objects/369807'))return new Response(JSON.stringify({objectID:369807,title:'Self-Portrait Etching at a Window',artistDisplayName:'Rembrandt (Rembrandt van Rijn)',objectDate:'1648',period:'Baroque',country:'Netherlands',medium:'Etching',objectName:'Print',classification:'Print',primaryImageSmall:'https://images.metmuseum.org/DP135654.jpg',objectURL:'https://www.metmuseum.org/art/collection/search/369807',isPublicDomain:true,creditLine:'The Sylmaris Collection'}));if(value.includes('api.artic.edu'))return new Response(JSON.stringify({data:[],config:{iiif_url:'https://www.artic.edu/iiif/2'}}));if(value.includes('openaccess-api.clevelandart.org'))return new Response(JSON.stringify({data:[]}));if(value.includes('generativelanguage.googleapis.com'))return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({items:[{provider:'met',externalId:'369807',description:'Автопортрет в технике офорта.',features:['Контраст света','Линейная штриховка'],palette:['#51463E','#9B8874','#D1C4AC']}]})}]}}]}));throw Error(`Unexpected URL ${value}`)};
 try{const request=new Request('https://art.example/.netlify/functions/discover-epoch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'verify',epochId:'baroque',candidate:{name:'Рембрандт',region:'Нидерланды',query:'Rembrandt van Rijn',biography:'Биография.'},existingKeys:['met:437881']})}),response=await discoveryHandler(request),body=await response.json();assert.equal(response.status,200);assert.equal(body.artworks[0].externalId,'369807');assert.equal(body.diagnostics.fetched,1);assert.equal(body.diagnostics.accepted,1);assert.equal(body.diagnostics.saved,1);assert.equal(body.diagnostics.records[0].saved,true)}finally{globalThis.fetch=originalFetch;console.error=originalError;if(before.enabled===undefined)delete process.env.AI_PUBLIC_ENABLED;else process.env.AI_PUBLIC_ENABLED=before.enabled;if(before.key===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=before.key}
});

test('artist discovery keeps the stable artist id, skips known museum ids and persists the first selection',async()=>{const db=createEmptyArchive(),payloads=[],vermeer={id:'vermeer',name:'Ян Вермеер',periodId:'baroque',region:'Делфт'},newWork={...artwork('new-vermeer','vermeer','Johannes Vermeer','The Milkmaid'),periodId:'baroque'};const profile={artistId:'vermeer',status:'paused',fullName:'Йоханнес Вермеер',nameVariants:['Johannes Vermeer'],lifeYears:'1632–1675',activityPlaces:['Делфт'],movements:['Голландская живопись'],verifiedFacts:[{label:'Годы жизни',value:'1632–1675',sourceUrl:'https://www.wikidata.org/wiki/Q41264'}],generatedSections:[{id:'history-1',title:'Жизнь',text:'Проверяемый текст.'}],creativeStages:[{id:'stage-1',title:'Зрелость',text:'Проверяемый текст.'}],sources:[{label:'Wikidata',url:'https://www.wikidata.org/wiki/Q41264',kind:'wikidata'}],notableWorks:[{title:'Молодая женщина с кувшином воды',query:'Johannes Vermeer Young Woman with a Water Pitcher'},{title:'Молочница',query:'Johannes Vermeer The Milkmaid'}],diagnostics:{fetched:0,duplicates:0,rejectedByReason:{},accepted:0,saved:0,records:[]},verifiedAt:'2026-10-23T10:00:00.000Z',updatedAt:'2026-10-23T10:00:00.000Z',lastMessage:'Готово'};const fetchImpl=async(_url,options)=>{const input=JSON.parse(options.body);payloads.push(input);if(input.action==='artist-plan')return response(200,{profile});if(input.work.title.includes('кувшином'))return response(200,{artworks:[],diagnostics:{fetched:1,duplicates:1,rejectedByReason:{duplicate:1},accepted:0,saved:0,records:[]},message:'Уже сохранено'});return response(200,{artworks:[newWork],diagnostics:{fetched:1,duplicates:0,rejectedByReason:{},accepted:1,saved:1,records:[]},message:'Подтверждено'})};const result=await discoverArtistInitial({artist:vermeer,db,existingArtworkKeys:['met:437881'],fetchImpl,persist:async()=>{}});assert.equal(result.addedCount,1);assert.equal(db.localArtworks[0].artistId,'vermeer');assert.equal(db.artistDiscoveries[0].status,'ready');assert.equal(db.artistDiscoveryJobs[0].status,'complete');assert.ok(payloads.filter(item=>item.action==='artist-verify').every(item=>item.existingKeys.includes('met:437881')))});

test('extended artist discovery saves one bounded page and resumes from provider cursors',async()=>{const db=createEmptyArchive(),vermeer={id:'vermeer',name:'Ян Вермеер',periodId:'baroque',region:'Делфт'},profile={artistId:'vermeer',status:'ready',fullName:'Йоханнес Вермеер',nameVariants:['Johannes Vermeer'],lifeYears:'1632–1675',activityPlaces:['Делфт'],movements:[],verifiedFacts:[],generatedSections:[{id:'h1',title:'Жизнь',text:'Текст.'}],creativeStages:[{id:'s1',title:'Этап',text:'Текст.'}],sources:[],notableWorks:[],diagnostics:{fetched:0,duplicates:0,rejectedByReason:{},accepted:0,saved:0,records:[]},verifiedAt:'',updatedAt:'',lastMessage:''};db.artistDiscoveries.push(profile);const cursors=[];let call=0;const fetchImpl=async(_url,options)=>{const input=JSON.parse(options.body);cursors.push(input.cursors);call+=1;return response(200,{artworks:call===1?[{...artwork('page-one','vermeer','Johannes Vermeer','View of Delft'),periodId:'baroque'}]:[],cursors:{met:call*6,aic:call+1,cleveland:call*6},exhaustedProviders:call===1?['aic']:['met','aic','cleveland'],providerErrors:[],diagnostics:{fetched:call===1?3:0,duplicates:0,rejectedByReason:{},accepted:call===1?1:0,saved:call===1?1:0,records:[]},message:call===1?'Пакет сохранён':'Все доступные произведения из подключённых источников исследованы.'})};const first=await discoverArtistMore({artist:vermeer,db,fetchImpl,persist:async()=>{}});assert.equal(first.complete,false);assert.equal(db.artistDiscoveryJobs[0].cursors.met,6);const second=await discoverArtistMore({artist:vermeer,db,fetchImpl,persist:async()=>{}});assert.equal(second.complete,true);assert.equal(db.artistDiscoveries[0].status,'complete');assert.equal(cursors[1].met,6)});
