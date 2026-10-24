export const ARCHIVE_SCHEMA_VERSION=4;
export const DB_NAME='art-local-v1';
export const STORE_NAMES=['favorites','colors','emotionPalettes','reflections','personalLessons','lessonProgress','practiceSessions','answerHistory','reviewResults','localArtists','localArtworks','epochDiscoveries','discoveryJobs','artistDiscoveries','artistDiscoveryJobs','localQuestions'];
export const ALLOWED_EXHIBIT_IDS=Object.freeze(['k001','k002']);

export const createEmptyArchive=()=>({
 schemaVersion:ARCHIVE_SCHEMA_VERSION,
 favorites:[],colors:[],emotionPalettes:[],reflections:[],personalLessons:[],lessonProgress:[],practiceSessions:[],answerHistory:[],reviewResults:[],localArtists:[],localArtworks:[],epochDiscoveries:[],discoveryJobs:[],artistDiscoveries:[],artistDiscoveryJobs:[],localQuestions:[],discoveredExhibits:[],createdPersonalLessonIds:[],
 settings:{emotionShuffleSeed:1,colorSaveSequence:0,interfaceColorMode:'automatic',manualInterfacePalette:['#898989','#ADADAD','#777777']}
});

const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const timestamp=value=>value===''||(typeof value==='string'&&!Number.isNaN(Date.parse(value)));
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(value);
const unique=values=>[...new Set(values)];
const cleanStringArray=(value,max=100)=>unique((Array.isArray(value)?value:[]).filter(item=>id(item))).slice(0,max);
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:''}catch{return''}};
const cleanText=(value,max=1200)=>typeof value==='string'?value.trim().slice(0,max):'';
const hexes=value=>unique((Array.isArray(value)?value:[]).filter(item=>/^#[0-9A-Fa-f]{6}$/.test(item)).map(item=>item.toUpperCase())).slice(0,5);

export function normalizeLocalArtist(value){
 if(!object(value)||!id(value.id)||!text(value.name,180)||!id(value.periodId)||!['met','aic','cleveland','multiple'].includes(value.provider))throw Error('Некорректная локальная запись художника.');
 return{id:value.id,name:value.name.trim(),periodId:value.periodId,region:cleanText(value.region,200),biography:cleanText(value.biography,1200),provider:value.provider,externalId:cleanText(value.externalId,160),sourceUrl:safeUrl(value.sourceUrl),verifiedAt:timestamp(value.verifiedAt)?value.verifiedAt:'',verificationStatus:value.verificationStatus==='verified'?'verified':'partial'};
}

export function normalizeLocalArtwork(value){
 if(!object(value)||!id(value.id)||!text(value.title,240)||!id(value.artistId)||!id(value.periodId)||!['met','aic','cleveland'].includes(value.provider)||!cleanText(value.externalId,160))throw Error('Некорректная локальная запись произведения.');
 const imageUrl=safeUrl(value.imageUrl||value.image),sourceUrl=safeUrl(value.sourceUrl||value.source);if(!sourceUrl||!imageUrl)throw Error('У произведения отсутствует подтверждённый музейный источник или изображение.');
 return{id:value.id,artworkId:value.id,provider:value.provider,externalId:cleanText(value.externalId,160),title:value.title.trim(),alternativeTitles:[],artistId:value.artistId,artist:cleanText(value.artist,180)||'Неизвестный мастер',year:cleanText(value.year,160)||'Датировка не указана',dateAccuracy:cleanText(value.dateAccuracy,240)||'По музейной записи',periodId:value.periodId,movement:cleanText(value.movement,180)||'Направление не указано',region:cleanText(value.region,200)||'Регион не указан',material:cleanText(value.material,300)||'Материал не указан',technique:cleanText(value.technique,300)||'Техника не указана',type:cleanText(value.type,160)||'Произведение',detail:cleanText(value.detail,1200)||'Описание уточняется по музейной записи.',features:(Array.isArray(value.features)?value.features:[]).map(item=>cleanText(item,160)).filter(Boolean).slice(0,8),palette:hexes(value.palette),image:imageUrl,imageUrl,source:sourceUrl,sourceUrl,museum:cleanText(value.museum,200)||value.provider,license:cleanText(value.license,240)||'Условия использования указаны музеем',licenseUrl:safeUrl(value.licenseUrl)||sourceUrl,attribution:cleanText(value.attribution,300),verifiedAt:timestamp(value.verifiedAt)?value.verifiedAt:'',verification:{status:'verified',checkedAt:timestamp(value.verifiedAt)?value.verifiedAt:'',sourceType:'museum-api',recordId:`${value.provider}:${cleanText(value.externalId,160)}`},verificationStatus:value.verificationStatus==='verified'?'verified':'partial',catalogSource:'local'};
}

export function normalizeEpochDiscovery(value){
 if(!object(value)||!id(value.periodId))throw Error('Некорректное состояние исследования эпохи.');
 return{periodId:value.periodId,overview:cleanText(value.overview,5000),features:(Array.isArray(value.features)?value.features:[]).map(item=>cleanText(item,240)).filter(Boolean).slice(0,20),sources:(Array.isArray(value.sources)?value.sources:[]).map(safeUrl).filter(Boolean).slice(0,50),runCount:Number.isInteger(value.runCount)&&value.runCount>=0?value.runCount:0,status:['idle','partial','complete','empty','error'].includes(value.status)?value.status:'idle',updatedAt:timestamp(value.updatedAt)?value.updatedAt:'',lastMessage:cleanText(value.lastMessage,500)};
}

export function normalizeDiscoveryJob(value){
 if(!object(value)||!id(value.id)||!id(value.periodId))throw Error('Некорректная задача исследования.');
 return{id:value.id,periodId:value.periodId,status:['planned','running','paused','complete','empty','error'].includes(value.status)?value.status:'paused',phase:cleanText(value.phase,40)||'plan',candidates:(Array.isArray(value.candidates)?value.candidates:[]).filter(item=>object(item)&&text(item.name,180)).slice(0,12).map(item=>({name:item.name.trim(),region:cleanText(item.region,160),query:cleanText(item.query,200)||item.name.trim(),biography:cleanText(item.biography,800)})),currentIndex:Number.isInteger(value.currentIndex)&&value.currentIndex>=0?value.currentIndex:0,addedCount:Number.isInteger(value.addedCount)&&value.addedCount>=0?value.addedCount:0,startedAt:timestamp(value.startedAt)?value.startedAt:'',updatedAt:timestamp(value.updatedAt)?value.updatedAt:'',error:cleanText(value.error,500)};
}

const cleanSource=value=>object(value)&&safeUrl(value.url)?{label:cleanText(value.label,180)||'Источник',url:safeUrl(value.url),kind:['wikidata','museum','authority'].includes(value.kind)?value.kind:'authority'}:null;
const cleanBiographyBlock=(value,index)=>object(value)&&text(value.title,180)&&text(value.text,1800)?{id:id(value.id)?value.id:`section-${index+1}`,title:value.title.trim(),text:value.text.trim()}:null;
const cleanDiscoveryDiagnostics=value=>{if(!object(value))return{fetched:0,duplicates:0,rejectedByReason:{},accepted:0,saved:0,records:[]};return{fetched:Number.isInteger(value.fetched)&&value.fetched>=0?value.fetched:0,duplicates:Number.isInteger(value.duplicates)&&value.duplicates>=0?value.duplicates:0,rejectedByReason:object(value.rejectedByReason)?Object.fromEntries(Object.entries(value.rejectedByReason).filter(([key,count])=>id(key)&&Number.isInteger(count)&&count>=0)): {},accepted:Number.isInteger(value.accepted)&&value.accepted>=0?value.accepted:0,saved:Number.isInteger(value.saved)&&value.saved>=0?value.saved:0,records:(Array.isArray(value.records)?value.records:[]).filter(object).slice(-100).map(record=>({provider:cleanText(record.provider,40),externalId:cleanText(record.externalId,160),decision:record.decision==='accepted'?'accepted':'rejected',reasons:cleanStringArray(record.reasons,10),saved:record.saved===true}))}};

export function normalizeArtistDiscovery(value){
 if(!object(value)||!id(value.artistId))throw Error('Некорректное исследование художника.');
 return{artistId:value.artistId,status:['ready','expanding','paused','complete'].includes(value.status)?value.status:'paused',fullName:cleanText(value.fullName,240),nameVariants:(Array.isArray(value.nameVariants)?value.nameVariants:[]).map(item=>cleanText(item,180)).filter(Boolean).slice(0,20),lifeYears:cleanText(value.lifeYears,100),activityPlaces:(Array.isArray(value.activityPlaces)?value.activityPlaces:[]).map(item=>cleanText(item,180)).filter(Boolean).slice(0,20),movements:(Array.isArray(value.movements)?value.movements:[]).map(item=>cleanText(item,180)).filter(Boolean).slice(0,20),verifiedFacts:(Array.isArray(value.verifiedFacts)?value.verifiedFacts:[]).filter(object).slice(0,30).map(item=>({label:cleanText(item.label,180),value:cleanText(item.value,500),sourceUrl:safeUrl(item.sourceUrl)})).filter(item=>item.label&&item.value&&item.sourceUrl),generatedSections:(Array.isArray(value.generatedSections)?value.generatedSections:[]).map(cleanBiographyBlock).filter(Boolean).slice(0,12),creativeStages:(Array.isArray(value.creativeStages)?value.creativeStages:[]).map(cleanBiographyBlock).filter(Boolean).slice(0,12),sources:(Array.isArray(value.sources)?value.sources:[]).map(cleanSource).filter(Boolean).slice(0,30),notableWorks:(Array.isArray(value.notableWorks)?value.notableWorks:[]).filter(object).slice(0,10).map(item=>({title:cleanText(item.title,240),query:cleanText(item.query,240)})).filter(item=>item.title&&item.query),diagnostics:cleanDiscoveryDiagnostics(value.diagnostics),verifiedAt:timestamp(value.verifiedAt)?value.verifiedAt:'',updatedAt:timestamp(value.updatedAt)?value.updatedAt:'',lastMessage:cleanText(value.lastMessage,500)};
}

export function normalizeArtistDiscoveryJob(value){
 if(!object(value)||!id(value.id)||!id(value.artistId))throw Error('Некорректная задача исследования художника.');
 const cursors=object(value.cursors)?value.cursors:{};
 return{id:value.id,artistId:value.artistId,mode:value.mode==='all'?'all':'first',status:['planned','running','paused','complete'].includes(value.status)?value.status:'paused',candidateIndex:Number.isInteger(value.candidateIndex)&&value.candidateIndex>=0?value.candidateIndex:0,candidates:(Array.isArray(value.candidates)?value.candidates:[]).filter(object).slice(0,10).map(item=>({title:cleanText(item.title,240),query:cleanText(item.query,240)})).filter(item=>item.title&&item.query),cursors:{met:Number.isInteger(cursors.met)&&cursors.met>=0?cursors.met:0,aic:Number.isInteger(cursors.aic)&&cursors.aic>=1?cursors.aic:1,cleveland:Number.isInteger(cursors.cleveland)&&cursors.cleveland>=0?cursors.cleveland:0},exhaustedProviders:cleanStringArray(value.exhaustedProviders,10).filter(provider=>['met','aic','cleveland'].includes(provider)),addedCount:Number.isInteger(value.addedCount)&&value.addedCount>=0?value.addedCount:0,startedAt:timestamp(value.startedAt)?value.startedAt:'',updatedAt:timestamp(value.updatedAt)?value.updatedAt:'',error:cleanText(value.error,500)};
}

export function normalizeLocalQuestion(value,{artworkIds}={}){
 if(!object(value)||!id(value.id)||!id(value.periodId)||!text(value.prompt,300)||!Array.isArray(value.options)||value.options.length!==4||!id(value.correct))throw Error('Некорректный локальный вопрос.');
 const options=value.options.filter(item=>object(item)&&id(item.id)&&text(item.label,180)).map(item=>({id:item.id,label:item.label.trim()}));if(options.length!==4||unique(options.map(item=>item.id)).length!==4||options.filter(item=>item.id===value.correct).length!==1)throw Error('Локальный вопрос должен иметь четыре уникальных варианта и один ответ.');
 const refs=cleanStringArray(value.artworkIds,2);if(artworkIds&&refs.some(ref=>!artworkIds.has(ref)))throw Error('Локальный вопрос содержит неизвестное произведение.');
 return{id:value.id,periodId:value.periodId,type:'artist',prompt:value.prompt.trim(),options,correct:value.correct,explanation:cleanText(value.explanation,700),artworkIds:refs,lessonIds:cleanStringArray(value.lessonIds,20),topics:cleanStringArray(value.topics,20),source:'local-verified'};
}

export function normalizePersonalLesson(value,{artworkIds}={}){
 if(!object(value)||!id(value.id)||!text(value.title,160)||!text(value.summary,700)||!id(value.periodId)||!Array.isArray(value.blocks)||value.blocks.length<2||value.blocks.length>8)throw Error('Некорректный персональный урок.');
 const allowedTypes=new Set(['text','context','artwork','compare','detail','question','reflection']);
 const blocks=value.blocks.map((block,index)=>{
  if(!object(block)||!allowedTypes.has(block.type)||!text(block.title,140)||!text(block.text,1200))throw Error('Некорректный блок персонального урока.');
  const refs=cleanStringArray(block.artworkIds,4);
  if(artworkIds&&refs.some(ref=>!artworkIds.has(ref)))throw Error('Персональный урок содержит неизвестное произведение.');
  return {id:id(block.id)?block.id:`${value.id}-block-${index+1}`,type:block.type,title:block.title.trim(),text:block.text.trim(),artworkIds:refs,...(id(block.questionId)?{questionId:block.questionId}:{})};
 });
 const refs=cleanStringArray(value.artworkIds,12);
 if(artworkIds&&refs.some(ref=>!artworkIds.has(ref)))throw Error('Персональный урок содержит неизвестное произведение.');
 return {id:value.id,title:value.title.trim(),summary:value.summary.trim(),periodId:value.periodId,artistId:id(value.artistId)?value.artistId:'',mode:['overview','artist','artwork','compare','visual'].includes(value.mode)?value.mode:'overview',source:'personal',createdAt:timestamp(value.createdAt)?value.createdAt:new Date().toISOString(),artworkIds:refs,practiceSetIds:cleanStringArray(value.practiceSetIds,10),blocks};
}

export function normalizeArchive(raw,{artworkIds}={}){
 if(!object(raw)||![2,3,ARCHIVE_SCHEMA_VERSION].includes(raw.schemaVersion))throw Error('Архив создан несовместимой версией ART.');
 const out=createEmptyArchive();
 const arrays=STORE_NAMES;
 for(const name of arrays)if(raw[name]!==undefined&&!Array.isArray(raw[name]))throw Error(`Поле ${name} должно быть массивом.`);
 out.localArtists=(raw.localArtists||[]).slice(0,2000).map(normalizeLocalArtist);
 out.localArtworks=(raw.localArtworks||[]).slice(0,10000).map(normalizeLocalArtwork);
 const allowedArtworkIds=new Set([...(artworkIds||[]),...out.localArtworks.map(item=>item.id)]);
 const validateArtworkIds=artworkIds instanceof Set;
 out.favorites=(raw.favorites||[]).filter(item=>object(item)&&id(item.artworkId)&&(!validateArtworkIds||allowedArtworkIds.has(item.artworkId))).slice(0,5000).map((item,index)=>({artworkId:item.artworkId,createdAt:timestamp(item.createdAt)?item.createdAt:'',__index:index})).sort((left,right)=>(Date.parse(left.createdAt)||0)-(Date.parse(right.createdAt)||0)||left.__index-right.__index).map(({__index,...item})=>item);
 out.colors=(raw.colors||[]).filter(item=>{const userPicked=item?.source==='user-picked';return object(item)&&id(item.id)&&id(item.artworkId)&&Number.isInteger(item.index)&&item.index>=0&&(userPicked||item.index<5)&&/^#[0-9A-Fa-f]{6}$/.test(item.hex)&&(!validateArtworkIds||allowedArtworkIds.has(item.artworkId))}).slice(0,5000).map((item,index)=>{const savedAt=timestamp(item.savedAt)?item.savedAt:timestamp(item.createdAt)?item.createdAt:'',userPicked=item.source==='user-picked';return{id:item.id,artworkId:item.artworkId,index:item.index,hex:item.hex.toUpperCase(),source:userPicked?'user-picked':'catalog',...(userPicked&&Number.isFinite(item.x)&&Number.isFinite(item.y)?{x:Math.min(1,Math.max(0,item.x)),y:Math.min(1,Math.max(0,item.y))}:{}),savedAt,createdAt:savedAt,savedOrder:Number.isInteger(item.savedOrder)&&item.savedOrder>0?item.savedOrder:index+1}});
 const colorIds=new Set(out.colors.map(item=>item.id));
 out.emotionPalettes=(raw.emotionPalettes||[]).filter(item=>object(item)&&id(item.emotionId)).slice(0,100).map(item=>({emotionId:item.emotionId,colorIds:cleanStringArray(item.colorIds,20).filter(colorId=>colorIds.has(colorId)),seed:Number.isInteger(item.seed)?item.seed:1}));
 out.reflections=(raw.reflections||[]).filter(item=>object(item)&&id(item.artworkId)&&(!validateArtworkIds||allowedArtworkIds.has(item.artworkId))).slice(0,5000).map(item=>({artworkId:item.artworkId,feelings:cleanStringArray(item.feelings,20),note:typeof item.note==='string'?item.note.slice(0,1200):'',lessonPreference:typeof item.lessonPreference==='string'?item.lessonPreference.slice(0,200):'',updatedAt:timestamp(item.updatedAt)?item.updatedAt:''}));
 out.personalLessons=(raw.personalLessons||[]).slice(0,300).map(item=>normalizePersonalLesson(item,{artworkIds:validateArtworkIds?allowedArtworkIds:undefined}));
 out.lessonProgress=(raw.lessonProgress||[]).filter(item=>object(item)&&id(item.lessonId)&&['new','in-progress','completed'].includes(item.status)&&Number.isInteger(item.currentBlock)&&item.currentBlock>=0).slice(0,1000).map(item=>({lessonId:item.lessonId,source:item.source==='personal'?'personal':'official',status:item.status,currentBlock:item.currentBlock,completedBlocks:cleanStringArray(item.completedBlocks,30),startedAt:timestamp(item.startedAt)?item.startedAt:'',updatedAt:timestamp(item.updatedAt)?item.updatedAt:'',completedAt:timestamp(item.completedAt)?item.completedAt:'',answers:object(item.answers)?item.answers:{},reflection:typeof item.reflection==='string'?item.reflection.slice(0,1200):''}));
 out.practiceSessions=(raw.practiceSessions||[]).filter(item=>object(item)&&id(item.id)&&id(item.practiceSetId)&&['in-progress','completed'].includes(item.status)&&Array.isArray(item.questionIds)&&object(item.choiceOrders)&&object(item.answers)).slice(-1000).map(item=>{const questions=(Array.isArray(item.questions)?item.questions:[]).filter(question=>object(question)&&id(question.id)&&['recognize','find','detail','chronology','artist','period','style','compare'].includes(question.type)&&text(question.prompt,300)&&Array.isArray(question.options)&&question.options.length>=2&&question.options.length<=4&&id(question.correct)).slice(0,5).map(question=>({id:question.id,type:question.type,prompt:question.prompt.trim(),options:question.options.filter(option=>object(option)&&id(option.id)&&text(option.label,180)).slice(0,4).map(option=>({id:option.id,label:option.label.trim()})),correct:question.correct,explanation:cleanText(question.explanation,700),reviewTopic:cleanText(question.reviewTopic,180),artworkIds:cleanStringArray(question.artworkIds,4)})).filter(question=>question.options.some(option=>option.id===question.correct));const score=Number.isInteger(item.score)&&item.score>=0?item.score:0;return{id:item.id,practiceSetId:item.practiceSetId,kind:item.kind==='review'?'review':'standard',scopeType:['all','period','artist'].includes(item.scopeType)?item.scopeType:'',scopeId:id(item.scopeId)?item.scopeId:'',scopeLabel:cleanText(item.scopeLabel,180),mode:['recognize','find','detail','chronology'].includes(item.mode)?item.mode:'',questions,status:item.status,questionIds:cleanStringArray(item.questionIds,30),choiceOrders:Object.fromEntries(Object.entries(item.choiceOrders).filter(([key,value])=>id(key)&&Array.isArray(value)).map(([key,value])=>[key,cleanStringArray(value,8)])),answers:Object.fromEntries(Object.entries(item.answers).filter(([key,value])=>id(key)&&object(value)).map(([key,value])=>[key,{selectedId:String(value.selectedId||''),correct:value.correct===true}])),currentIndex:Number.isInteger(item.currentIndex)&&item.currentIndex>=0?item.currentIndex:0,startedAt:timestamp(item.startedAt)?item.startedAt:'',completedAt:timestamp(item.completedAt)?item.completedAt:'',score,questionCount:Number.isInteger(item.questionCount)&&item.questionCount>=0?item.questionCount:item.questionIds.length,correctCount:Number.isInteger(item.correctCount)&&item.correctCount>=0?item.correctCount:score,mistakeArtworkIds:cleanStringArray(item.mistakeArtworkIds,30)}});
 out.answerHistory=(raw.answerHistory||[]).filter(item=>object(item)&&id(item.id)&&id(item.sessionId)&&id(item.questionId)&&typeof item.selectedId==='string'&&typeof item.correct==='boolean').slice(-10000).map(item=>({id:item.id,sessionId:item.sessionId,questionId:item.questionId,selectedId:item.selectedId,correct:item.correct,answeredAt:timestamp(item.answeredAt)?item.answeredAt:''}));
 out.reviewResults=(raw.reviewResults||[]).filter(item=>object(item)&&id(item.id)&&Array.isArray(item.questionIds)&&Number.isInteger(item.score)).slice(-1000).map(item=>({id:item.id,questionIds:cleanStringArray(item.questionIds,50),score:item.score,completedAt:timestamp(item.completedAt)?item.completedAt:''}));
 out.epochDiscoveries=(raw.epochDiscoveries||[]).slice(0,100).map(normalizeEpochDiscovery);
 out.discoveryJobs=(raw.discoveryJobs||[]).slice(-100).map(normalizeDiscoveryJob);
 out.artistDiscoveries=(raw.artistDiscoveries||[]).slice(0,2000).map(normalizeArtistDiscovery);
 out.artistDiscoveryJobs=(raw.artistDiscoveryJobs||[]).slice(-2000).map(normalizeArtistDiscoveryJob);
 out.localQuestions=(raw.localQuestions||[]).slice(0,5000).map(item=>normalizeLocalQuestion(item,{artworkIds:validateArtworkIds?allowedArtworkIds:undefined}));
 if(raw.discoveredExhibits!==undefined&&!Array.isArray(raw.discoveredExhibits))throw Error('Поле discoveredExhibits должно быть массивом.');
 out.discoveredExhibits=unique((raw.discoveredExhibits||[]).filter(item=>ALLOWED_EXHIBIT_IDS.includes(item)));
 if(raw.createdPersonalLessonIds!==undefined&&!Array.isArray(raw.createdPersonalLessonIds))throw Error('Поле createdPersonalLessonIds должно быть массивом.');
 out.createdPersonalLessonIds=cleanStringArray(raw.createdPersonalLessonIds,5000);
 const highestColorOrder=out.colors.reduce((highest,item)=>Math.max(highest,item.savedOrder),0);
 const manualInterfacePalette=['#898989','#ADADAD','#777777'].map((fallback,index)=>/^#[0-9A-Fa-f]{6}$/.test(raw.settings?.manualInterfacePalette?.[index]||'')?raw.settings.manualInterfacePalette[index].toUpperCase():fallback);
 out.settings={emotionShuffleSeed:Number.isInteger(raw.settings?.emotionShuffleSeed)?raw.settings.emotionShuffleSeed:1,colorSaveSequence:Math.max(highestColorOrder,Number.isInteger(raw.settings?.colorSaveSequence)?raw.settings.colorSaveSequence:0),interfaceColorMode:raw.settings?.interfaceColorMode==='manual'?'manual':'automatic',manualInterfacePalette};
 return dedupeArchive(out);
}

const dedupeBy=(items,key)=>[...new Map(items.map(item=>[item[key],item])).values()];
export function dedupeArchive(archive){
 const colors=[...new Map(archive.colors.map(item=>[item.source==='user-picked'?`picked:${item.artworkId}:${item.hex.toUpperCase()}`:`catalog:${item.id}`,item])).values()];
 return {...archive,favorites:dedupeBy(archive.favorites,'artworkId'),colors,emotionPalettes:dedupeBy(archive.emotionPalettes,'emotionId'),reflections:dedupeBy(archive.reflections,'artworkId'),personalLessons:dedupeBy(archive.personalLessons,'id'),lessonProgress:dedupeBy(archive.lessonProgress,'lessonId'),practiceSessions:dedupeBy(archive.practiceSessions,'id'),answerHistory:dedupeBy(archive.answerHistory,'id'),reviewResults:dedupeBy(archive.reviewResults,'id'),localArtists:dedupeBy(archive.localArtists,'id'),localArtworks:[...new Map(archive.localArtworks.map(item=>[`${item.provider}:${item.externalId}`,item])).values()],epochDiscoveries:dedupeBy(archive.epochDiscoveries,'periodId'),discoveryJobs:dedupeBy(archive.discoveryJobs,'id'),artistDiscoveries:dedupeBy(archive.artistDiscoveries,'artistId'),artistDiscoveryJobs:dedupeBy(archive.artistDiscoveryJobs,'id'),localQuestions:dedupeBy(archive.localQuestions,'id')};
}

export function mergeArchives(current,incoming,options={}){
 const left=normalizeArchive(current,options),right=normalizeArchive(incoming,options);
 return dedupeArchive({...left,
  favorites:[...left.favorites,...right.favorites],colors:[...left.colors,...right.colors],emotionPalettes:[...left.emotionPalettes,...right.emotionPalettes],reflections:[...left.reflections,...right.reflections],personalLessons:[...left.personalLessons,...right.personalLessons],lessonProgress:[...left.lessonProgress,...right.lessonProgress],practiceSessions:[...left.practiceSessions,...right.practiceSessions],answerHistory:[...left.answerHistory,...right.answerHistory],reviewResults:[...left.reviewResults,...right.reviewResults],localArtists:[...left.localArtists,...right.localArtists],localArtworks:[...left.localArtworks,...right.localArtworks],epochDiscoveries:[...left.epochDiscoveries,...right.epochDiscoveries],discoveryJobs:[...left.discoveryJobs,...right.discoveryJobs],artistDiscoveries:[...left.artistDiscoveries,...right.artistDiscoveries],artistDiscoveryJobs:[...left.artistDiscoveryJobs,...right.artistDiscoveryJobs],localQuestions:[...left.localQuestions,...right.localQuestions],discoveredExhibits:unique([...left.discoveredExhibits,...right.discoveredExhibits]),createdPersonalLessonIds:unique([...left.createdPersonalLessonIds,...right.createdPersonalLessonIds]),settings:{...left.settings,...right.settings,colorSaveSequence:Math.max(left.settings.colorSaveSequence,right.settings.colorSaveSequence)}
 });
}

export function createExport(archive,catalogVersion){return {...normalizeArchive(archive),catalogVersion,exportedAt:new Date().toISOString()}}

const requestResult=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
export function openDatabase(indexedDBImpl=globalThis.indexedDB){
 if(!indexedDBImpl)return Promise.reject(Error('IndexedDB недоступна.'));
 const keyPath=name=>name==='favorites'?'artworkId':name==='emotionPalettes'?'emotionId':name==='reflections'?'artworkId':name==='lessonProgress'?'lessonId':name==='epochDiscoveries'?'periodId':name==='artistDiscoveries'?'artistId':'id';
 return new Promise((resolve,reject)=>{const request=indexedDBImpl.open(DB_NAME,3);request.onupgradeneeded=()=>{const db=request.result;for(const name of STORE_NAMES)if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:keyPath(name)});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
}

export async function loadArchive(){
 const db=await openDatabase();
 try{const transaction=db.transaction([...STORE_NAMES,'meta'],'readonly');const archive=createEmptyArchive();for(const name of STORE_NAMES)archive[name]=await requestResult(transaction.objectStore(name).getAll());const settings=await requestResult(transaction.objectStore('meta').get('settings')),discovered=await requestResult(transaction.objectStore('meta').get('discoveredExhibits')),created=await requestResult(transaction.objectStore('meta').get('createdPersonalLessonIds'));archive.settings=settings?.value||archive.settings;archive.discoveredExhibits=discovered?.value||[];archive.createdPersonalLessonIds=created?.value||archive.personalLessons.map(lesson=>lesson.id);return archive;}finally{db.close()}
}

export async function replaceArchive(archive){
 const clean=normalizeArchive(archive);const db=await openDatabase();
 try{await new Promise((resolve,reject)=>{const transaction=db.transaction([...STORE_NAMES,'meta'],'readwrite');for(const name of STORE_NAMES){const store=transaction.objectStore(name);store.clear();for(const value of clean[name])store.put(value)}const meta=transaction.objectStore('meta');meta.put({key:'settings',value:clean.settings});meta.put({key:'discoveredExhibits',value:clean.discoveredExhibits});meta.put({key:'createdPersonalLessonIds',value:clean.createdPersonalLessonIds});transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('IndexedDB transaction aborted'));});}finally{db.close()}
 return clean;
}
