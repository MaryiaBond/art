// Server-only Gemini REST adapter. NEVER import this module from the browser.
// See https://ai.google.dev/gemini-api/docs/generate-content/structured-output
export const DEFAULT_GEMINI_MODEL='gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_TIMEOUT_MS=45000;
export const DIAGNOSTIC_GEMINI_TIMEOUT_MS=15000;

export const lessonSchema = {
  type:'object',
  properties:{
    title:{type:'string'},
    summary:{type:'string'},
    blocks:{type:'array',minItems:3,maxItems:6,items:{type:'object',additionalProperties:false,properties:{
      type:{type:'string',enum:['text','context','artwork','compare','detail','question','reflection']},
      title:{type:'string'},text:{type:'string'},artworkIds:{type:'array',minItems:0,maxItems:2,items:{type:'string'}},questionId:{type:'string'}
    },required:['type','title','text','artworkIds','questionId']}}
  },required:['title','summary','blocks'],additionalProperties:false
};

export const editorialSchema={
  ...lessonSchema,properties:{...lessonSchema.properties,blocks:{...lessonSchema.properties.blocks,maxItems:7},reviewChecklist:{type:'array',items:{type:'string'}}},
  required:[...lessonSchema.required,'reviewChecklist']
};

export const discoveryPlanSchema={type:'object',additionalProperties:false,properties:{overview:{type:'string'},features:{type:'array',minItems:2,maxItems:8,items:{type:'string'}},candidates:{type:'array',minItems:1,maxItems:10,items:{type:'object',additionalProperties:false,properties:{name:{type:'string'},region:{type:'string'},query:{type:'string'},biography:{type:'string'}},required:['name','region','query','biography']}}},required:['overview','features','candidates']};
export const artworkEnrichmentSchema={type:'object',additionalProperties:false,properties:{items:{type:'array',maxItems:6,items:{type:'object',additionalProperties:false,properties:{provider:{type:'string'},externalId:{type:'string'},description:{type:'string'},features:{type:'array',minItems:2,maxItems:6,items:{type:'string'}},palette:{type:'array',minItems:2,maxItems:5,items:{type:'string'}}},required:['provider','externalId','description','features','palette']}}},required:['items']};
export const artistDiscoverySchema={type:'object',additionalProperties:false,properties:{fullName:{type:'string'},nameVariants:{type:'array',maxItems:12,items:{type:'string'}},lifeYears:{type:'string'},activityPlaces:{type:'array',maxItems:10,items:{type:'string'}},movements:{type:'array',maxItems:10,items:{type:'string'}},sections:{type:'array',minItems:3,maxItems:7,items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},text:{type:'string'}},required:['title','text']}},creativeStages:{type:'array',minItems:1,maxItems:6,items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},text:{type:'string'}},required:['title','text']}},notableWorks:{type:'array',maxItems:10,items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},query:{type:'string'}},required:['title','query']}}},required:['fullName','nameVariants','lifeYears','activityPlaces','movements','sections','creativeStages','notableWorks']};

const nonEmpty=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;

export class GeminiRequestError extends Error{
  constructor(type,message,{status=null,cause}={}){super(message,{cause});this.name='GeminiRequestError';this.type=type;this.status=status;}
}

export class LessonValidationError extends Error{
  constructor(message){super(message);this.name='LessonValidationError';this.type='validation';}
}

export function validateLesson(raw,approvedIds,{editorial=false,approvedQuestionIds=new Set()}={}){
  const maxBlocks=editorial?7:6,types=new Set(['text','context','artwork','compare','detail','question','reflection']);
  if(!raw||typeof raw!=='object'||!nonEmpty(raw.title,160)||!nonEmpty(raw.summary,700)||!Array.isArray(raw.blocks)||raw.blocks.length<3||raw.blocks.length>maxBlocks)throw new LessonValidationError('Invalid Gemini lesson structure');
  const blocks=raw.blocks.map((b,index)=>{
    if(!b||!types.has(b.type)||!nonEmpty(b.title,140)||!nonEmpty(b.text,1200)||!Array.isArray(b.artworkIds)||b.artworkIds.length>2||b.artworkIds.some(id=>!approvedIds.has(id)))throw new LessonValidationError('Invalid artwork or text in Gemini lesson');
    if(b.type==='question'&&!approvedQuestionIds.has(b.questionId))throw new LessonValidationError('Invalid question in Gemini lesson');
    return {id:`generated-block-${index+1}`,type:b.type,title:b.title.trim(),text:b.text.trim(),artworkIds:[...new Set(b.artworkIds)],...(b.type==='question'?{questionId:b.questionId}:{})};
  });
  if(!blocks.some(b=>['artwork','compare','detail'].includes(b.type))||!blocks.some(b=>b.type==='question')||!blocks.some(b=>b.type==='reflection'))throw new LessonValidationError('Lesson must contain visual, question and reflection blocks');
  const result={title:raw.title.trim(),summary:raw.summary.trim(),blocks};
  if(editorial){
    if(!Array.isArray(raw.reviewChecklist)||!raw.reviewChecklist.length||raw.reviewChecklist.length>10||raw.reviewChecklist.some(v=>!nonEmpty(v,240)))throw new LessonValidationError('Invalid Gemini review checklist');
    result.reviewChecklist=raw.reviewChecklist.map(s=>s.trim());
  }
  return result;
}

const gemini3Config=model=>model.startsWith('gemini-3')?{thinkingConfig:{thinkingLevel:'MINIMAL'}}:{};
const statusErrorType=status=>status===400?'http_400':status===401?'http_401':status===403?'http_403':status===429?'http_429':status>=500?'http_5xx':'http_error';
const extractText=data=>(data?.candidates?.[0]?.content?.parts||[]).filter(part=>part?.thought!==true&&typeof part?.text==='string').map(part=>part.text).join('');
const logDiagnostic=(logger,details)=>{try{const method=details.errorType?logger?.error:logger?.info;method?.call(logger,'Gemini request diagnostic',details)}catch{}};

async function requestGemini({apiKey,model,system,prompt,generationConfig,timeoutMs,fetchImpl,logger,operation,parse}){
  if(!apiKey)throw new GeminiRequestError('configuration','GEMINI_API_KEY is missing');
  if(!/^[a-z0-9][a-z0-9.-]{0,80}$/i.test(model))throw new GeminiRequestError('configuration','Invalid GEMINI_MODEL');
  const startedAt=Date.now();let httpStatus=null,errorType=null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
      method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:system}]},
        contents:[{role:'user',parts:[{text:prompt}]}],
        generationConfig
      })
    });
    httpStatus=res.status;
    if(!res.ok)throw new GeminiRequestError(statusErrorType(res.status),`Gemini HTTP ${res.status}`,{status:res.status});
    let data;try{data=await res.json();}catch(cause){throw new GeminiRequestError('provider_json','Gemini returned an invalid response envelope',{status:res.status,cause});}
    const text=extractText(data);
    if(!text)throw new GeminiRequestError('empty_response','Gemini returned no text',{status:res.status});
    return parse(text);
  }catch(error){
    let normalized=error;
    if(!(error instanceof GeminiRequestError)){
      const timedOut=controller.signal.aborted||error?.name==='AbortError';
      normalized=new GeminiRequestError(timedOut?'timeout':'network',timedOut?'Gemini request timed out':'Gemini network request failed',{status:httpStatus,cause:error});
    }
    errorType=normalized.type;throw normalized;
  }finally{
    clearTimeout(timer);
    logDiagnostic(logger,{operation,model,httpStatus,durationMs:Date.now()-startedAt,errorType});
  }
}

export async function generateGeminiJSON({apiKey,model=DEFAULT_GEMINI_MODEL,system,prompt,schema=lessonSchema,maxOutputTokens=1024,timeoutMs=DEFAULT_GEMINI_TIMEOUT_MS,fetchImpl=fetch,logger=console,operation='lesson'}){
  return requestGemini({apiKey,model,system,prompt,timeoutMs,fetchImpl,logger,operation,generationConfig:{maxOutputTokens,...gemini3Config(model),responseFormat:{text:{mimeType:'APPLICATION_JSON',schema}}},parse:text=>{
    try{return JSON.parse(text);}catch(cause){throw new GeminiRequestError('output_json','Gemini output was not valid JSON',{status:200,cause});}
  }});
}

export async function checkGeminiConnection({apiKey,model=DEFAULT_GEMINI_MODEL,timeoutMs=DIAGNOSTIC_GEMINI_TIMEOUT_MS,fetchImpl=fetch,logger=console}){
  await requestGemini({apiKey,model,timeoutMs,fetchImpl,logger,operation:'diagnostic',system:'Это техническая проверка доступности модели. Ответь кратко.',prompt:'Ответь только словом OK.',generationConfig:{maxOutputTokens:16,...gemini3Config(model)},parse:text=>text});
  return {ok:true,model};
}
