const hash=value=>{let out=2166136261;for(const char of String(value)){out^=char.charCodeAt(0);out=Math.imul(out,16777619)}return out>>>0};
const randomFrom=seed=>{let state=(seed>>>0)||1;return()=>{state=(state+0x6D2B79F5)|0;let value=Math.imul(state^state>>>15,1|state);value^=value+Math.imul(value^value>>>7,61|value);return((value^value>>>14)>>>0)/4294967296}};
export function shuffledOnce(values,seed){const output=[...values],random=randomFrom(hash(seed));for(let index=output.length-1;index>0;index--){const target=Math.floor(random()*(index+1));[output[index],output[target]]=[output[target],output[index]]}return output}

export const PRACTICE_MODES=Object.freeze([
 {id:'recognize',icon:'artworks',title:'Узнай картину',summary:'Выбери название по изображению.'},
 {id:'find',icon:'compare',title:'Найди произведение',summary:'Выбери изображение по названию.'},
 {id:'detail',icon:'curiosity',title:'Внимание к деталям',summary:'Проверенные вопросы о деталях и материалах.'},
 {id:'chronology',icon:'time',title:'До или после?',summary:'Сравни произведения с точными датировками.'}
]);

const verified=artwork=>artwork?.verificationStatus==='verified'||artwork?.verification?.status==='verified';
const uniqueBy=(items,key)=>[...new Map(items.map(item=>[item[key],item])).values()];
const exactYear=artwork=>{if(!/точн/i.test(artwork.dateAccuracy||'')||/приблиз|диапазон/i.test(artwork.dateAccuracy||''))return null;const match=String(artwork.year||'').match(/(?:^|\D)(\d{3,4})$/);return match?Number(match[1]):null};
const explanation=artwork=>`${artwork.title} — ${artwork.artist}, ${artwork.year}.`;

export function scopedPracticeArtworks(artworks,scopeType='all',scopeId=''){
 return uniqueBy((artworks||[]).filter(item=>verified(item)&&(scopeType==='period'?item.periodId===scopeId:scopeType==='artist'?item.artistId===scopeId:true)),'id');
}

export function buildPracticeMode({mode,artworks=[],questionBank=[],scopeType='all',scopeId='',limit=5,seed='practice'}){
 const scope=scopedPracticeArtworks(artworks,scopeType,scopeId),scopeIds=new Set(scope.map(item=>item.id)),key=`${scopeType}:${scopeId||'all'}`,questions=[];
 if(mode==='recognize'||mode==='find'){
  const choices=uniqueBy(scope.filter(item=>item.image&&item.title),'title');
  if(choices.length<4)return{available:false,count:0,reason:'Нужно минимум четыре произведения с уникальными названиями.',questions:[]};
  for(const artwork of shuffledOnce(choices,`${seed}:${mode}:targets`).slice(0,limit)){
   const alternatives=shuffledOnce(choices.filter(item=>item.id!==artwork.id),`${seed}:${mode}:${artwork.id}`).slice(0,3),options=[artwork,...alternatives].map(item=>({id:item.id,label:item.title}));
   questions.push({id:`practice-${mode}-${hash(`${key}:${artwork.id}`).toString(36)}`,type:mode,prompt:mode==='recognize'?'Как называется это произведение?':`Найди произведение «${artwork.title}»`,options,correct:artwork.id,explanation:explanation(artwork),reviewTopic:artwork.artist,artworkIds:[artwork.id]});
  }
 }
 if(mode==='detail'){
  const structured=questionBank.filter(question=>question.type==='detail'&&question.artworkIds?.length&&question.artworkIds.every(id=>scopeIds.has(id))&&question.options?.length===4&&new Set(question.options.map(option=>option.id)).size===4&&question.options.filter(option=>option.id===question.correct).length===1);
  questions.push(...shuffledOnce(structured,`${seed}:detail`).slice(0,limit).map(question=>({...question})));
  if(!questions.length)return{available:false,count:0,reason:'Для этой области пока нет структурированных вопросов о деталях.',questions:[]};
 }
 if(mode==='chronology'){
  const dated=scope.map(artwork=>({artwork,year:exactYear(artwork)})).filter(item=>item.year!==null),pairs=[];
  for(let left=0;left<dated.length;left+=1)for(let right=left+1;right<dated.length;right+=1)if(dated[left].year!==dated[right].year)pairs.push([dated[left],dated[right]]);
  for(const [left,right] of shuffledOnce(pairs,`${seed}:chronology`).slice(0,limit)){const earlier=left.year<right.year?left:right;questions.push({id:`practice-chronology-${hash(`${key}:${left.artwork.id}:${right.artwork.id}`).toString(36)}`,type:'chronology',prompt:'Какое произведение создано раньше?',options:[left,right].map(item=>({id:item.artwork.id,label:item.artwork.title})),correct:earlier.artwork.id,explanation:`${earlier.artwork.title} создано раньше: ${earlier.artwork.year}.`,reviewTopic:'Хронология',artworkIds:[left.artwork.id,right.artwork.id]})}
  if(!questions.length)return{available:false,count:0,reason:'Нужны как минимум две однозначные непересекающиеся точные датировки.',questions:[]};
 }
 return{available:questions.length>0,count:questions.length,reason:'',questions};
}

export function createPracticeSession({practiceSetId,questionIds,questionBank,embeddedQuestions=[],kind='standard',scopeType='',scopeId='',scopeLabel='',mode='',seed=Date.now(),now=new Date().toISOString(),sessionId=`session-${Date.now()}-${Math.floor(Math.random()*1e6)}`}){
 const available=new Map(questionBank.map(question=>[question.id,question]));
 const valid=[...new Set(questionIds)].filter(id=>available.has(id));
 if(!valid.length)throw Error('Для этой тренировки пока нет проверенных вопросов.');
 const ordered=shuffledOnce(valid,`${seed}:questions`),choiceOrders={};
 for(const questionId of ordered)choiceOrders[questionId]=shuffledOnce(available.get(questionId).options.map(option=>option.id),`${seed}:${questionId}`);
 return {id:sessionId,practiceSetId,kind:kind==='review'?'review':'standard',scopeType,scopeId,scopeLabel,mode,questions:embeddedQuestions,status:'in-progress',questionIds:ordered,choiceOrders,answers:{},currentIndex:0,startedAt:now,completedAt:'',score:0,questionCount:ordered.length,correctCount:0,mistakeArtworkIds:[]};
}

export function answerPracticeSession(session,question,selectedId,answeredAt=new Date().toISOString()){
 if(session.status!=='in-progress'||session.answers[question.id])return null;
 const correct=selectedId===question.correct;
 session.answers[question.id]={selectedId,correct,answeredAt};
 if(correct)session.score+=1;
 return {id:`${session.id}:${question.id}`,sessionId:session.id,questionId:question.id,selectedId,correct,answeredAt};
}

export function advancePracticeSession(session,completedAt=new Date().toISOString()){
 if(!session.answers[session.questionIds[session.currentIndex]])return false;
 if(session.currentIndex<session.questionIds.length-1){session.currentIndex+=1;return true}
 session.status='completed';session.completedAt=completedAt;return true;
}

export function summarizePracticeSession(session,questionBank){
 const questions=new Map([...(questionBank||[]),...(session.questions||[])].map(question=>[question.id,question]));
 const mistakes=session.questionIds.filter(id=>session.answers[id]&&!session.answers[id].correct).map(id=>questions.get(id)).filter(Boolean);
 return {total:session.questionIds.length,correct:session.score,mistakes,topics:[...new Set(mistakes.map(question=>question.reviewTopic).filter(Boolean))],mistakeArtworkIds:[...new Set(mistakes.flatMap(question=>question.artworkIds||[]))]};
}

export function unresolvedMistakeIds(answerHistory,questionBank){
 const valid=new Set(questionBank.map(question=>question.id)),last=new Map();
 for(const answer of answerHistory)if(valid.has(answer.questionId))last.set(answer.questionId,answer.correct);
 return [...last.entries()].filter(([,correct])=>!correct).map(([id])=>id);
}
