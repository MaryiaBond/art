// Public AI is OFF by default. Enable only with provider budgets and alerts.
import {generateGeminiJSON,validateLesson,lessonSchema,DEFAULT_GEMINI_MODEL} from '../../server/gemini.mjs';
import {periods,artworks,questionBank,practiceSets} from '../../data/catalog.js';

const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const publicGeminiError=error=>{
 const type=error?.type||'unknown';
 if(type==='timeout')return[504,{code:'gemini_timeout',error:'Gemini не успел ответить. Попробуй ещё раз позже.'}];
 if(type==='http_400')return[502,{code:'gemini_http_400',error:'Gemini отклонил структуру запроса.'}];
 if(type==='http_401')return[503,{code:'gemini_http_401',error:'Gemini отклонил серверный API-ключ.'}];
 if(type==='http_403')return[503,{code:'gemini_http_403',error:'У серверного ключа нет доступа к выбранной модели.'}];
 if(type==='http_429')return[429,{code:'gemini_http_429',error:'Лимит Gemini временно исчерпан. Попробуй позже.'}];
 if(type==='http_5xx')return[503,{code:'gemini_http_5xx',error:'Gemini временно недоступен.'}];
 if(type==='provider_json')return[502,{code:'gemini_provider_json',error:'Gemini вернул повреждённый служебный ответ.'}];
 if(type==='output_json')return[502,{code:'gemini_output_json',error:'Gemini вернул невалидный JSON.'}];
 if(type==='empty_response')return[502,{code:'gemini_empty_response',error:'Gemini вернул пустой ответ.'}];
 if(type==='validation')return[502,{code:'gemini_validation',error:'Урок не прошёл проверку ссылок на каталог.'}];
 if(type==='configuration')return[503,{code:'gemini_configuration',error:'Gemini не настроен на сервере.'}];
 return[502,{code:'gemini_network',error:'Не удалось связаться с Gemini.'}];
};

export default async function handler(req){
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 if(process.env.AI_PUBLIC_ENABLED!=='true')return reply(503,{code:'ai_disabled',error:'Персональные AI-уроки временно отключены.'});
 if(!process.env.GEMINI_API_KEY)return reply(503,{code:'gemini_configuration',error:'Gemini не настроен на сервере.'});
 const origin=req.headers.get('origin'),site=process.env.URL;
 if(origin&&site){try{if(new URL(origin).host!==new URL(site).host)return reply(403,{error:'Origin not allowed'});}catch{return reply(403,{error:'Invalid origin'});}}
 if(Number(req.headers.get('content-length')||0)>24000)return reply(413,{error:'Payload too large'});
 let input;try{const raw=await req.text();if(raw.length>24000)return reply(413,{error:'Payload too large'});input=JSON.parse(raw)}catch{return reply(400,{error:'Invalid JSON'});}
 const period=periods.find(item=>item.id===input?.topicId);
 if(!period||!['simple','deep'].includes(input.level)||!['visual','context','compare'].includes(input.style)||input.mode&&!['overview','artist','artwork','compare','visual'].includes(input.mode))return reply(400,{error:'Invalid topic, level, style or mode'});
 const staticReferences=artworks.filter(item=>period.artworkIds.includes(item.id)).map(item=>({id:item.id,title:item.title,artist:item.artist,artistId:item.artistId,year:item.year,movement:item.movement,features:item.features,source:item.source,provider:'official',externalId:item.verification?.recordId||item.id,verificationStatus:'verified'}));
 const localReferences=(Array.isArray(input.catalog?.artworks)?input.catalog.artworks:[]).filter(item=>item&&typeof item.id==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(item.id)&&item.periodId===period.id&&['met','aic','cleveland'].includes(item.provider)&&typeof item.externalId==='string'&&item.verificationStatus==='verified'&&/^https:\/\//.test(item.sourceUrl||'')).slice(0,6).map(item=>({id:item.id,title:String(item.title||'').slice(0,240),artist:String(item.artist||'').slice(0,180),artistId:String(item.artistId||'').slice(0,160),year:String(item.year||'').slice(0,160),movement:String(item.movement||'').slice(0,180),features:(Array.isArray(item.features)?item.features:[]).map(value=>String(value).slice(0,160)).slice(0,6),source:item.sourceUrl,provider:item.provider,externalId:item.externalId,verificationStatus:'verified'}));
 let references=[...staticReferences,...localReferences];const selectedIds=new Set((Array.isArray(input.artworkIds)?input.artworkIds:[]).filter(value=>typeof value==='string').slice(0,6));if(selectedIds.size)references=references.filter(item=>selectedIds.has(item.id));
 const referenceIds=new Set(references.map(item=>item.id));
 const staticQuestions=questionBank.filter(item=>item.lessonIds.some(id=>period.lessonIds.includes(id))&&item.artworkIds.every(id=>referenceIds.has(id))).map(item=>({id:item.id,type:item.type,prompt:item.prompt,options:item.options,correct:item.correct,explanation:item.explanation}));
 const localQuestions=(Array.isArray(input.catalog?.questions)?input.catalog.questions:[]).filter(item=>item&&item.periodId===period.id&&item.source==='local-verified'&&typeof item.id==='string'&&Array.isArray(item.options)&&item.options.length===4&&item.options.filter(option=>option?.id===item.correct).length===1&&Array.isArray(item.artworkIds)&&item.artworkIds.length&&item.artworkIds.every(id=>referenceIds.has(id))).slice(0,4).map(item=>({id:item.id,type:'artist',prompt:String(item.prompt||'').slice(0,300),options:item.options.map(option=>({id:String(option.id),label:String(option.label).slice(0,180)})),correct:String(item.correct),explanation:String(item.explanation||'').slice(0,700)}));
 const questions=[...staticQuestions,...localQuestions];
 if(!references.length||!questions.length)return reply(422,{code:'catalog_gap',error:'Для этой темы пока недостаточно проверенных произведений или вопросов.'});
 const model=process.env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL,startedAt=Date.now();
 try{
  const raw=await generateGeminiJSON({apiKey:process.env.GEMINI_API_KEY,model,schema:lessonSchema,maxOutputTokens:1600,
   system:'Ты музейный редактор ART. Верни только JSON по схеме. Создай интерактивный урок на русском из 4–6 коротких блоков. Обязательно включи визуальный блок (artwork, compare или detail), question с одним переданным questionId и reflection. Используй только переданные artworkId и questionId. Не генерируй HTML, новые произведения, атрибуции, диагнозы или неподтверждённые факты.',
   prompt:JSON.stringify({topic:{id:period.id,title:period.title,context:period.context},mode:input.mode||'overview',artistId:typeof input.artistId==='string'?input.artistId:null,level:input.level,style:input.style,artworks:references,questions})});
  const validated=validateLesson(raw,new Set(references.map(item=>item.id)),{approvedQuestionIds:new Set(questions.map(item=>item.id))});
  const createdAt=new Date().toISOString(),lesson={id:`ai-${crypto.randomUUID()}`,periodId:period.id,artistId:typeof input.artistId==='string'?input.artistId:'',mode:input.mode||'overview',source:'personal',createdAt,artworkIds:[...new Set(validated.blocks.flatMap(block=>block.artworkIds))],practiceSetIds:period.practiceSetIds.filter(id=>practiceSets.some(set=>set.id===id)),...validated};
  return reply(200,{lesson,disclaimer:'Материал создан AI. Проверяй факты по музейным источникам произведений.'});
 }catch(error){console.error('AI lesson diagnostic',{model,httpStatus:error?.status??null,durationMs:Date.now()-startedAt,errorType:error?.type||'unknown'});const[status,body]=publicGeminiError(error);return reply(status,body)}
}
export const config={path:'/.netlify/functions/ai-lesson',rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:3600,windowLimit:3}};
