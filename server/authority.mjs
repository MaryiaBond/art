const clean=value=>typeof value==='string'?value.trim():'';
const unique=values=>[...new Set(values.filter(Boolean))];
const anonymous=value=>/(anonymous|unknown|workshop|school|culture|tradition|master of|аноним|неизвест|мастер|школ|традиц|культур)/i.test(clean(value));

async function getJSON(url,{fetchImpl=fetch,timeoutMs=9000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetchImpl(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'ART-Discovery/1.0'}});if(!response.ok)throw Error(`Authority HTTP ${response.status}`);return await response.json()}finally{clearTimeout(timer)}
}

const year=value=>{const date=clean(value);if(!date)return'';const parsed=new Date(date);return Number.isNaN(parsed.valueOf())?'':String(parsed.getUTCFullYear())};

export async function fetchWikidataArtist(name,{fetchImpl=fetch}={}){
 if(!clean(name)||anonymous(name))return null;
 let match=null;
 for(const language of ['ru','en']){const search=new URL('https://www.wikidata.org/w/api.php');search.searchParams.set('action','wbsearchentities');search.searchParams.set('search',name);search.searchParams.set('language',language);search.searchParams.set('uselang',language);search.searchParams.set('type','item');search.searchParams.set('limit','5');search.searchParams.set('format','json');search.searchParams.set('origin','*');const payload=await getJSON(search,{fetchImpl}).catch(()=>null);match=payload?.search?.find(item=>/^Q\d+$/.test(item.id)&&/(artist|painter|sculptor|худож|живопис|скульптор)/i.test(`${item.description||''}`))||payload?.search?.find(item=>/^Q\d+$/.test(item.id));if(match)break}
 if(!match)return null;
 const sparql=`SELECT ?itemLabel ?altLabel ?birth ?death ?birthPlaceLabel ?workLocationLabel ?movementLabel WHERE { VALUES ?item { wd:${match.id} } OPTIONAL { ?item wdt:P569 ?birth. } OPTIONAL { ?item wdt:P570 ?death. } OPTIONAL { ?item wdt:P19 ?birthPlace. } OPTIONAL { ?item wdt:P937 ?workLocation. } OPTIONAL { ?item wdt:P135 ?movement. } SERVICE wikibase:label { bd:serviceParam wikibase:language "ru,en". ?item rdfs:label ?itemLabel. ?item skos:altLabel ?altLabel. ?birthPlace rdfs:label ?birthPlaceLabel. ?workLocation rdfs:label ?workLocationLabel. ?movement rdfs:label ?movementLabel. } }`;
 const url=new URL('https://query.wikidata.org/sparql');url.searchParams.set('query',sparql);url.searchParams.set('format','json');const payload=await getJSON(url,{fetchImpl,timeoutMs:12000}).catch(()=>null),rows=payload?.results?.bindings||[],entityUrl=`https://www.wikidata.org/wiki/${match.id}`,birth=year(rows.find(row=>row.birth?.value)?.birth?.value),death=year(rows.find(row=>row.death?.value)?.death?.value);
 return{id:match.id,fullName:clean(rows.find(row=>row.itemLabel?.value)?.itemLabel?.value)||clean(match.label)||name,nameVariants:unique([clean(match.label),...rows.map(row=>clean(row.altLabel?.value))]).slice(0,20),lifeYears:birth&&death?`${birth}–${death}`:birth?`род. ${birth}`:'',birthPlace:clean(rows.find(row=>row.birthPlaceLabel?.value)?.birthPlaceLabel?.value),activityPlaces:unique(rows.map(row=>clean(row.workLocationLabel?.value))).slice(0,20),movements:unique(rows.map(row=>clean(row.movementLabel?.value))).slice(0,20),description:clean(match.description),sourceUrl:entityUrl,verifiedAt:new Date().toISOString()};
}

export function authorityFacts(authority){
 if(!authority)return[];const facts=[];
 if(authority.fullName)facts.push({label:'Полное имя',value:authority.fullName,sourceUrl:authority.sourceUrl});
 if(authority.lifeYears)facts.push({label:'Годы жизни',value:authority.lifeYears,sourceUrl:authority.sourceUrl});
 if(authority.birthPlace)facts.push({label:'Место рождения',value:authority.birthPlace,sourceUrl:authority.sourceUrl});
 if(authority.activityPlaces?.length)facts.push({label:'Места деятельности',value:authority.activityPlaces.join(', '),sourceUrl:authority.sourceUrl});
 if(authority.movements?.length)facts.push({label:'Направления',value:authority.movements.join(', '),sourceUrl:authority.sourceUrl});
 return facts;
}
