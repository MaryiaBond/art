import {normalizeLocalArtist,normalizeLocalArtwork,normalizeArtistDiscovery,normalizeArtistDiscoveryJob} from './storage.js';

const activeRuns=new Set();
const now=()=>new Date().toISOString();
const providerKey=item=>`${item.provider}:${item.externalId}`;
const upsert=(items,value,key='id')=>[...items.filter(item=>item[key]!==value[key]),value];

async function postJSON(url,payload,{fetchImpl=fetch,retry=true}={}){
 let response;
 try{response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}catch(error){if(retry)return postJSON(url,payload,{fetchImpl,retry:false});throw error}
 const body=await response.json().catch(()=>null);
 if(!response.ok){if(retry&&response.status>=500)return postJSON(url,payload,{fetchImpl,retry:false});const error=Error(body?.error||'Сервис исследования недоступен.');error.code=body?.code;error.status=response.status;throw error}
 return body;
}

export function mergeVerifiedBatch(db,{artist,artworks}){
 const existing=new Map(db.localArtworks.map(item=>[providerKey(item),item])),knownSources=new Set(db.localArtworks.flatMap(item=>[item.sourceUrl,item.imageUrl].filter(Boolean))),added=[];
 for(const value of artworks||[]){const artwork=normalizeLocalArtwork(value),key=providerKey(artwork);if(existing.has(key)||knownSources.has(artwork.sourceUrl)||knownSources.has(artwork.imageUrl))continue;existing.set(key,artwork);knownSources.add(artwork.sourceUrl);knownSources.add(artwork.imageUrl);added.push(artwork)}
 db.localArtworks=[...existing.values()];
 if(artist&&added.length&&!db.localArtists.some(item=>item.id===artist.id))db.localArtists.push(normalizeLocalArtist(artist));
 return added;
}

export function createVerifiedQuestions(periodId,artworks,artists,existing=[]){
 const names=[...new Map(artists.filter(item=>item.periodId===periodId).map(item=>[item.id,item])).values()];if(names.length<4)return existing;
 const output=[...existing],known=new Set(existing.map(item=>item.id));
 for(const artwork of artworks.filter(item=>item.periodId===periodId&&item.verificationStatus==='verified')){const correct=names.find(item=>item.id===artwork.artistId);if(!correct)continue;const alternatives=names.filter(item=>item.id!==correct.id).sort((a,b)=>a.name.localeCompare(b.name,'ru')).slice(0,3);if(alternatives.length!==3)continue;const id=`local-q-${artwork.id}`;if(known.has(id))continue;const options=[correct,...alternatives].map(item=>({id:item.id,label:item.name}));output.push({id,periodId,type:'artist',prompt:'Кто автор этого произведения?',options,correct:correct.id,explanation:`Автор произведения — ${correct.name}. Источник атрибуции: ${artwork.museum}.`,artworkIds:[artwork.id],lessonIds:[],topics:[periodId],source:'local-verified'});known.add(id)}
 return output;
}

export function discoveryFor(db,periodId){return db.epochDiscoveries.find(item=>item.periodId===periodId)||null}
export function resumableJobFor(db,periodId){return [...db.discoveryJobs].reverse().find(item=>item.periodId===periodId&&['planned','running','paused','error'].includes(item.status))||null}
export function artistDiscoveryFor(db,artistId){return db.artistDiscoveries.find(item=>item.artistId===artistId)||null}
export function artistDiscoveryJobFor(db,artistId,mode){return[...db.artistDiscoveryJobs].reverse().find(item=>item.artistId===artistId&&item.mode===mode&&['planned','running','paused'].includes(item.status))||null}
const emptyDiagnostics=()=>({fetched:0,duplicates:0,rejectedByReason:{},accepted:0,saved:0,records:[]});
const mergeDiagnostics=(left={},right={})=>({fetched:(left.fetched||0)+(right.fetched||0),duplicates:(left.duplicates||0)+(right.duplicates||0),rejectedByReason:Object.fromEntries([...new Set([...Object.keys(left.rejectedByReason||{}),...Object.keys(right.rejectedByReason||{})])].map(key=>[key,(left.rejectedByReason?.[key]||0)+(right.rejectedByReason?.[key]||0)])),accepted:(left.accepted||0)+(right.accepted||0),saved:(left.saved||0)+(right.saved||0),records:[...(left.records||[]),...(right.records||[])].slice(-100)});
const verifiedKeys=(db,officialKeys)=>[...new Set([...officialKeys,...db.localArtworks.filter(item=>item.verificationStatus==='verified').map(providerKey)])];

export async function discoverArtistInitial({artist,db,allArtists=[],existingArtworkKeys=[],fetchImpl=fetch,persist=async()=>{},onProgress=()=>{}}){
 const runKey=`artist:first:${artist.id}`;if(activeRuns.has(runKey))throw Error('Исследование этого художника уже выполняется.');activeRuns.add(runKey);
 try{let discovery=artistDiscoveryFor(db,artist.id),job=artistDiscoveryJobFor(db,artist.id,'first');
  if(!discovery){onProgress({phase:'biography',done:0,total:1,message:'Проверяем биографические сведения…'});const response=await postJSON('/.netlify/functions/discover-epoch',{action:'artist-plan',artist:{id:artist.id,name:artist.name,periodId:artist.periodId,region:artist.region||''},artistQuery:artist.name},{fetchImpl});discovery=normalizeArtistDiscovery(response.profile);db.artistDiscoveries=upsert(db.artistDiscoveries,discovery,'artistId');job=normalizeArtistDiscoveryJob({id:`artist-first-${artist.id}-${Date.now()}`,artistId:artist.id,mode:'first',status:'planned',candidateIndex:0,candidates:discovery.notableWorks,cursors:{met:0,aic:1,cleveland:0},exhaustedProviders:[],addedCount:0,startedAt:now(),updatedAt:now(),error:''});db.artistDiscoveryJobs.push(job);await persist()}
  if(!job){discovery.status='ready';return{addedCount:0,discovery}}
  job.status='running';job.error='';discovery.status='expanding';await persist();let addedCount=0;
  for(;job.candidateIndex<job.candidates.length;job.candidateIndex+=1){const work=job.candidates[job.candidateIndex];onProgress({phase:'notable',done:job.candidateIndex,total:job.candidates.length,message:`Проверяем: ${work.title}`});try{const response=await postJSON('/.netlify/functions/discover-epoch',{action:'artist-verify',artist:{id:artist.id,name:artist.name,periodId:artist.periodId,region:artist.region||''},artistQuery:[discovery.fullName,...discovery.nameVariants].filter(Boolean).join(' '),work,existingKeys:verifiedKeys(db,existingArtworkKeys)},{fetchImpl}),added=mergeVerifiedBatch(db,{artist:null,artworks:response.artworks});addedCount+=added.length;job.addedCount+=added.length;job.updatedAt=now();discovery.diagnostics=mergeDiagnostics(discovery.diagnostics,response.diagnostics||emptyDiagnostics());discovery.diagnostics.saved=(discovery.diagnostics.saved||0)-(response.diagnostics?.saved||0)+added.length;discovery.lastMessage=response.message||'';discovery.updatedAt=now();db.localQuestions=createVerifiedQuestions(artist.periodId,db.localArtworks,allArtists,db.localQuestions);await persist()}catch(error){job.status='paused';job.error=error.message;job.updatedAt=now();discovery.status='paused';discovery.lastMessage=error.message;discovery.updatedAt=now();await persist();throw error}}
  job.status='complete';job.updatedAt=now();discovery.status='ready';discovery.updatedAt=now();discovery.lastMessage=`Биография и первая подборка готовы. Добавлено произведений: ${job.addedCount}.`;await persist();onProgress({phase:'complete',done:job.candidates.length,total:job.candidates.length,message:discovery.lastMessage});return{addedCount,discovery,job};
 }finally{activeRuns.delete(runKey)}
}

export async function discoverArtistMore({artist,db,allArtists=[],existingArtworkKeys=[],fetchImpl=fetch,persist=async()=>{},onProgress=()=>{}}){
 const runKey=`artist:all:${artist.id}`;if(activeRuns.has(runKey))throw Error('Расширенное исследование уже выполняется.');activeRuns.add(runKey);
 try{const discovery=artistDiscoveryFor(db,artist.id);if(!discovery)throw Error('Сначала исследуй биографию художника.');let job=artistDiscoveryJobFor(db,artist.id,'all');if(!job){job=normalizeArtistDiscoveryJob({id:`artist-all-${artist.id}-${Date.now()}`,artistId:artist.id,mode:'all',status:'planned',candidateIndex:0,candidates:[],cursors:{met:0,aic:1,cleveland:0},exhaustedProviders:[],addedCount:0,startedAt:now(),updatedAt:now(),error:''});db.artistDiscoveryJobs.push(job)}
  job.status='running';job.error='';discovery.status='expanding';discovery.updatedAt=now();await persist();onProgress({phase:'all',done:job.exhaustedProviders.length,total:3,message:'Проверяем следующий музейный пакет…'});
  try{const response=await postJSON('/.netlify/functions/discover-epoch',{action:'artist-page',artist:{id:artist.id,name:artist.name,periodId:artist.periodId,region:artist.region||''},artistQuery:[discovery.fullName,...discovery.nameVariants].filter(Boolean).join(' '),existingKeys:verifiedKeys(db,existingArtworkKeys),cursors:job.cursors,exhaustedProviders:job.exhaustedProviders},{fetchImpl}),added=mergeVerifiedBatch(db,{artist:null,artworks:response.artworks});job.cursors=response.cursors;job.exhaustedProviders=response.exhaustedProviders;job.addedCount+=added.length;job.updatedAt=now();discovery.diagnostics=mergeDiagnostics(discovery.diagnostics,response.diagnostics||emptyDiagnostics());discovery.diagnostics.saved=(discovery.diagnostics.saved||0)-(response.diagnostics?.saved||0)+added.length;db.localQuestions=createVerifiedQuestions(artist.periodId,db.localArtworks,allArtists,db.localQuestions);const complete=job.exhaustedProviders.length===3&&!response.providerErrors?.length;job.status=complete?'complete':'paused';discovery.status=complete?'complete':'paused';discovery.lastMessage=response.message||'';discovery.updatedAt=now();await persist();onProgress({phase:complete?'complete':'all',done:job.exhaustedProviders.length,total:3,message:discovery.lastMessage});return{addedCount:added.length,complete,discovery,job,response}}
  catch(error){job.status='paused';job.error=error.message;job.updatedAt=now();discovery.status='paused';discovery.lastMessage=error.message;discovery.updatedAt=now();await persist();throw error}
 }finally{activeRuns.delete(runKey)}
}

export async function discoverEpoch({period,db,existingArtistNames=[],existingArtworkKeys=[],fetchImpl=fetch,persist=async()=>{},onProgress=()=>{}}){
 if(activeRuns.has(period.id))throw Error('Исследование этой эпохи уже выполняется.');activeRuns.add(period.id);
 let job=resumableJobFor(db,period.id),addedCount=0;
 try{
  if(!job||job.status==='error'&&job.currentIndex>=job.candidates.length){
   onProgress({phase:'plan',done:0,total:1,message:'Подбираем направления поиска…',artists:db.localArtists.filter(item=>item.periodId===period.id).length,artworks:db.localArtworks.filter(item=>item.periodId===period.id).length});
   const knownArtists=[...new Set([...existingArtistNames,...db.localArtists.filter(item=>item.periodId===period.id&&item.verificationStatus==='verified').map(item=>item.name)])];
   const plan=await postJSON('/.netlify/functions/discover-epoch',{action:'plan',epochId:period.id,existingArtistNames:knownArtists},{fetchImpl});
   const discovery={periodId:period.id,overview:plan.overview,features:plan.features,sources:plan.sources,runCount:(discoveryFor(db,period.id)?.runCount||0),status:'partial',updatedAt:now(),lastMessage:'План сохранён'};
   db.epochDiscoveries=upsert(db.epochDiscoveries,discovery,'periodId');job={id:`discover-${period.id}-${Date.now()}`,periodId:period.id,status:'planned',phase:'verify',candidates:plan.candidates,currentIndex:0,addedCount:0,startedAt:now(),updatedAt:now(),error:''};db.discoveryJobs.push(job);await persist();
  }
  job.status='running';job.error='';await persist();
  const existingKeys=()=>[...new Set([...existingArtworkKeys,...db.localArtworks.filter(item=>item.verificationStatus==='verified').map(providerKey)])];
  for(;job.currentIndex<job.candidates.length;job.currentIndex+=1){const candidate=job.candidates[job.currentIndex];onProgress({phase:'verify',done:job.currentIndex,total:job.candidates.length,message:`Проверяем: ${candidate.name}`,artists:db.localArtists.filter(item=>item.periodId===period.id).length,artworks:db.localArtworks.filter(item=>item.periodId===period.id).length});
   try{const batch=await postJSON('/.netlify/functions/discover-epoch',{action:'verify',epochId:period.id,candidate,existingKeys:existingKeys()},{fetchImpl});const added=mergeVerifiedBatch(db,batch);addedCount+=added.length;job.addedCount=(job.addedCount||0)+added.length;if(batch.diagnostics)console.info('ART Discovery verify',{candidate:candidate.name,...batch.diagnostics,saved:added.length});db.localQuestions=createVerifiedQuestions(period.id,db.localArtworks,db.localArtists,db.localQuestions);job.updatedAt=now();job.status='running';job.error='';const discovery=discoveryFor(db,period.id);if(discovery){discovery.updatedAt=now();discovery.lastMessage=batch.message||''}await persist();onProgress({phase:'verify',done:job.currentIndex+1,total:job.candidates.length,message:batch.message||`Проверено: ${candidate.name}`,artists:db.localArtists.filter(item=>item.periodId===period.id).length,artworks:db.localArtworks.filter(item=>item.periodId===period.id).length})}
   catch(error){job.status='paused';job.error=error.message;job.updatedAt=now();await persist();throw error}
  }
  const runAdded=job.addedCount||addedCount;job.status=runAdded?'complete':'empty';job.updatedAt=now();const discovery=discoveryFor(db,period.id);if(discovery){discovery.runCount+=1;discovery.status=runAdded?'complete':'empty';discovery.updatedAt=now();discovery.lastMessage=runAdded?`Добавлено подтверждённых произведений: ${runAdded}`:'Новых подтверждённых произведений пока не найдено'}await persist();onProgress({phase:'complete',done:job.candidates.length,total:job.candidates.length,message:discovery?.lastMessage||'',artists:db.localArtists.filter(item=>item.periodId===period.id).length,artworks:db.localArtworks.filter(item=>item.periodId===period.id).length});return{addedCount,runAdded,job};
 }finally{activeRuns.delete(period.id)}
}

export function filterGallery({favorites,artworks,artists,search='',artistId='all',movement='all',periodId='all',sort='saved-desc'}){
 const byId=new Map(artworks.map(item=>[item.id,item])),savedAt=new Map(favorites.map(item=>[item.artworkId,item.createdAt]));let result=favorites.map(item=>byId.get(item.artworkId)).filter(Boolean),query=search.trim().toLocaleLowerCase('ru');
 result=result.filter(item=>(!query||`${item.title} ${item.artist}`.toLocaleLowerCase('ru').includes(query))&&(artistId==='all'||item.artistId===artistId)&&(movement==='all'||item.movement===movement)&&(periodId==='all'||item.periodId===periodId));
 const year=item=>{const match=String(item.year).match(/-?\d{3,4}/);return match?Number(match[0]):0};
 return result.sort(sort==='title'?(a,b)=>a.title.localeCompare(b.title,'ru'):sort==='chronology'?(a,b)=>year(a)-year(b):(a,b)=>String(savedAt.get(b.id)||'').localeCompare(String(savedAt.get(a.id)||'')));
}

export function verifiedEditorialExport(db,catalogVersion){return{schemaVersion:1,catalogVersion,exportedAt:now(),artists:db.localArtists.filter(item=>item.verificationStatus==='verified'),artworks:db.localArtworks.filter(item=>item.verificationStatus==='verified'),periodLinks:db.epochDiscoveries.map(item=>({periodId:item.periodId,artistIds:db.localArtists.filter(artist=>artist.periodId===item.periodId).map(artist=>artist.id),artworkIds:db.localArtworks.filter(artwork=>artwork.periodId===item.periodId).map(artwork=>artwork.id)}))}}
