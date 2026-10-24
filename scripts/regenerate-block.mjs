// Regenerates one block in a review draft; never publishes it.
import {readFile,writeFile} from 'node:fs/promises';
import {artworks,questionBank,practiceSets} from '../data/catalog.js';
import {generateGeminiJSON} from '../server/gemini.mjs';
const [path,blockId]=process.argv.slice(2);
if(!path||!blockId){console.error('Usage: node scripts/regenerate-block.mjs <draft.json> <block-id>');process.exit(2)}
if(!process.env.GEMINI_API_KEY){console.error('Set GEMINI_API_KEY locally.');process.exit(2)}
const draft=JSON.parse(await readFile(path,'utf8')),lesson=draft.lessons?.find(item=>item.blocks?.some(block=>block.id===blockId)),index=lesson?.blocks.findIndex(block=>block.id===blockId)??-1;
if(!lesson||index<0||draft.status==='approved'){console.error('Editable block not found or package is already approved.');process.exit(1)}
const questionIds=new Set(practiceSets.filter(set=>lesson.practiceSetIds.includes(set.id)).flatMap(set=>set.questionIds));
const current=lesson.blocks[index],allowedArtworks=artworks.filter(item=>lesson.artworkIds.includes(item.id)).map(item=>({id:item.id,title:item.title,artist:item.artist,features:item.features,source:item.source})),allowedQuestions=questionBank.filter(item=>questionIds.has(item.id)).map(item=>({id:item.id,prompt:item.prompt,explanation:item.explanation}));
const schema={type:'object',additionalProperties:false,properties:{type:{type:'string',enum:[current.type]},title:{type:'string'},text:{type:'string'},artworkIds:{type:'array',minItems:0,maxItems:2,items:{type:'string'}},questionId:{type:'string'}},required:['type','title','text','artworkIds','questionId']};
const updated=await generateGeminiJSON({apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL||undefined,schema,maxOutputTokens:600,system:'Ты редактор ART. Перепиши только один учебный блок на русском. Используй только переданные ID. Не добавляй факты, которых нет во входных данных. Верни JSON по схеме.',prompt:JSON.stringify({lesson:{title:lesson.title,summary:lesson.summary},current,artworks:allowedArtworks,questions:allowedQuestions})});
const allowedIds=new Set(allowedArtworks.map(item=>item.id));if(updated.artworkIds.some(id=>!allowedIds.has(id)))throw Error('Gemini returned an unapproved artwork ID');if(updated.type==='question'&&!allowedQuestions.some(item=>item.id===updated.questionId))throw Error('Gemini returned an unapproved question ID');
lesson.blocks[index]={id:blockId,type:updated.type,title:updated.title.trim(),text:updated.text.trim(),artworkIds:[...new Set(updated.artworkIds)],...(updated.type==='question'?{questionId:updated.questionId}:{})};draft.review={facts:false,sources:false,rights:false,structure:false,reviewer:'',approvedAt:''};draft.status='needs-review';await writeFile(path,JSON.stringify(draft,null,2));console.log(`Updated ${blockId} in ${path}. Human review reset.`);
