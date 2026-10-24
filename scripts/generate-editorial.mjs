// Creates a review draft only. It never changes the published catalog.
import {artworks,periods,questionBank,CATALOG_VERSION} from '../data/catalog.js';
import {generateGeminiJSON,validateLesson,editorialSchema} from '../server/gemini.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

const periodId=process.argv[2]||'renaissance',period=periods.find(item=>item.id===periodId);
if(!period){console.error(`Unknown period: ${periodId}`);process.exit(1)}
if(!process.env.GEMINI_API_KEY){console.error('Set GEMINI_API_KEY locally. It must never enter browser code or a committed file.');process.exit(2)}
const refs=artworks.filter(item=>period.artworkIds.includes(item.id)).map(item=>({id:item.id,title:item.title,artist:item.artist,year:item.year,movement:item.movement,features:item.features,source:item.source,license:item.license}));
const questions=questionBank.filter(item=>item.lessonIds.some(id=>period.lessonIds.includes(id))).map(item=>({id:item.id,type:item.type,prompt:item.prompt,options:item.options,correct:item.correct,explanation:item.explanation}));
if(!refs.length||!questions.length){console.error('The approved catalog does not contain enough references and questions for this period.');process.exit(1)}
const raw=await generateGeminiJSON({apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL||undefined,schema:editorialSchema,maxOutputTokens:2600,
 system:'Ты работаешь в редакторской мастерской ART. Верни только JSON по схеме: 4–7 коротких учебных блоков и checklist. Используй только переданные artworkId и questionId. Не выдумывай факты, авторство, источники и лицензии. Обязательны визуальный блок, question и reflection.',
 prompt:JSON.stringify({period:{id:period.id,title:period.title,context:period.context},artworks:refs,questions})});
const lesson=validateLesson(raw,new Set(refs.map(item=>item.id)),{editorial:true,approvedQuestionIds:new Set(questions.map(item=>item.id))});
const stamp=new Date().toISOString(),packageId=`editorial-${periodId}-${stamp.replace(/\D/g,'').slice(0,14)}`;
const draft={schemaVersion:1,packageId,status:'needs-review',catalogVersion:CATALOG_VERSION,createdAt:stamp,provider:'gemini',sources:refs.map(item=>({kind:'artwork',recordId:item.id,url:item.source,status:'verified'})),review:{facts:false,sources:false,rights:false,structure:false,reviewer:'',approvedAt:''},artists:[],periods:[],artworks:[],lessons:[{id:`${packageId}-lesson`,periodId:period.id,source:'official',minutes:6,artworkIds:[...new Set(lesson.blocks.flatMap(block=>block.artworkIds))],practiceSetIds:period.practiceSetIds,title:lesson.title,summary:lesson.summary,blocks:lesson.blocks}],questions:[],practiceSets:[],reviewChecklist:raw.reviewChecklist};
await mkdir('editorial/drafts',{recursive:true});const path=`editorial/drafts/${packageId}.json`;await writeFile(path,JSON.stringify(draft,null,2));
console.log(`Draft created: ${path}`);console.log('Open it in the local studio, verify every source and right, then publish explicitly.');
