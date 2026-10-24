// Safe server-side connectivity check. It never prints the API key or model output.
import {checkGeminiConnection,DEFAULT_GEMINI_MODEL} from '../server/gemini.mjs';

const apiKey=process.env.GEMINI_API_KEY;
const model=process.env.GEMINI_MODEL||DEFAULT_GEMINI_MODEL;

if(!apiKey){
 console.error('Gemini diagnostic skipped: GEMINI_API_KEY is not available in this server environment.');
 process.exitCode=2;
}else{
 try{
  await checkGeminiConnection({apiKey,model});
  console.log(`Gemini diagnostic succeeded for model ${model}.`);
 }catch(error){
  console.error('Gemini diagnostic failed',{model,httpStatus:error?.status??null,errorType:error?.type||'unknown'});
  process.exitCode=1;
 }
}
