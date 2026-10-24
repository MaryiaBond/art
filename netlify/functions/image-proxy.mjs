const TRUSTED_IMAGE_HOSTS=new Set([
 'images.metmuseum.org',
 'www.artic.edu',
 'artic-web.imgix.net',
 'openaccess-cdn.clevelandart.org'
]);
const ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const MAX_BYTES=15_000_000;
const reply=(status,message)=>new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}});

export function trustedMuseumImageUrl(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&TRUSTED_IMAGE_HOSTS.has(url.hostname)&&!url.port?url:null}catch{return null}
}

async function fetchTrusted(url,{fetchImpl=fetch,signal,redirects=0}={}){
 const response=await fetchImpl(url,{signal,redirect:'manual',headers:{Accept:'image/jpeg,image/png,image/webp,image/gif','User-Agent':'ART-Color-Picker/1.0'}});
 if(response.status>=300&&response.status<400){if(redirects>=2)return null;const location=response.headers.get('location'),next=location?trustedMuseumImageUrl(new URL(location,url).href):null;return next?fetchTrusted(next.href,{fetchImpl,signal,redirects:redirects+1}):null}
 return response;
}

async function boundedBody(response){
 const declared=Number(response.headers.get('content-length')||0);if(declared>MAX_BYTES)throw Object.assign(Error('too_large'),{status:413});
 if(!response.body){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>MAX_BYTES)throw Object.assign(Error('too_large'),{status:413});return bytes}
 const reader=response.body.getReader(),parts=[];let total=0;
 while(true){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel();throw Object.assign(Error('too_large'),{status:413})}parts.push(value)}
 const output=new Uint8Array(total);let offset=0;for(const part of parts){output.set(part,offset);offset+=part.byteLength}return output;
}

export default async function handler(request){
 if(request.method!=='GET')return reply(405,'Method not allowed');
 const source=trustedMuseumImageUrl(new URL(request.url).searchParams.get('url'));if(!source)return reply(400,'Unsupported museum image URL');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetchTrusted(source.href,{signal:controller.signal});if(!response?.ok)return reply(response?.status===404?404:502,'Museum image unavailable');const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();if(!ALLOWED_TYPES.has(type))return reply(415,'Unsupported image type');const body=await boundedBody(response);return new Response(body,{status:200,headers:{'Content-Type':type,'Content-Length':String(body.byteLength),'Cache-Control':'no-store, max-age=0','Access-Control-Allow-Origin':'*','Cross-Origin-Resource-Policy':'cross-origin','X-Content-Type-Options':'nosniff'}})}catch(error){return reply(error?.status||504,error?.name==='AbortError'?'Museum image timed out':'Museum image unavailable')}finally{clearTimeout(timer)}
}

export const config={path:'/.netlify/functions/image-proxy'};
