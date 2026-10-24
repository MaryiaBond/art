// Server-only adapters for open museum catalogues. They return metadata and URLs,
// never image bytes. Add providers through MUSEUM_ADAPTERS without changing callers.
const asText=(value,fallback='')=>typeof value==='string'&&value.trim()?value.trim():fallback;
const httpsUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:''}catch{return''}};
const iso=()=>new Date().toISOString();
const compact=values=>values.filter(Boolean);

export class MuseumRequestError extends Error{
 constructor(provider,message,{status=null,cause}={}){super(message,{cause});this.name='MuseumRequestError';this.provider=provider;this.status=status;}
}

async function getJSON(url,{provider,fetchImpl=fetch,timeoutMs=9000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetchImpl(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'ART-Discovery/1.0'}});if(!response.ok)throw new MuseumRequestError(provider,`${provider} HTTP ${response.status}`,{status:response.status});return await response.json()}
 catch(error){if(error instanceof MuseumRequestError)throw error;throw new MuseumRequestError(provider,error?.name==='AbortError'?`${provider} timeout`:`${provider} network error`,{cause:error})}
 finally{clearTimeout(timer)}
}

const common=(record)=>({...record,verifiedAt:iso(),verificationStatus:'verified'});

export async function searchMet(query,{fetchImpl=fetch,limit=2}={}){
 const provider='met',search=new URL('https://collectionapi.metmuseum.org/public/collection/v1.1/search');search.searchParams.set('q',query);search.searchParams.set('hasImages','true');search.searchParams.set('limit',String(Math.min(limit*4,12)));
 const listing=await getJSON(search,{provider,fetchImpl});const ids=(listing.objectIDs||[]).slice(0,Math.min(limit*4,12));const records=[];
 for(const externalId of ids){if(records.length>=limit)break;const item=await getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${externalId}`,{provider,fetchImpl}).catch(()=>null);if(!item?.objectID)continue;const imageUrl=item.isPublicDomain===true?httpsUrl(item.primaryImageSmall||item.primaryImage):'';records.push(common({provider,externalId:String(item.objectID),title:asText(item.title,'Без названия'),artist:asText(item.artistDisplayName,asText(item.culture,'Неизвестный мастер')),year:asText(item.objectDate,'Датировка не указана'),movement:asText(item.period,asText(item.objectName,'Направление не указано')),region:asText(item.country,asText(item.culture,'Регион не указан')),material:asText(item.medium,'Материал не указан'),technique:asText(item.objectName,'Техника не указана'),type:asText(item.classification,asText(item.objectName,'Произведение')),imageUrl,sourceUrl:httpsUrl(item.objectURL)||`https://www.metmuseum.org/art/collection/search/${item.objectID}`,museum:'The Metropolitan Museum of Art',license:imageUrl?'CC0 / Met Open Access':'Изображение не подтверждено для повторного использования',licenseUrl:'https://www.metmuseum.org/policies/image-resources',attribution:compact([item.creditLine,item.repository]).join(' · ')}));}
 return records;
}

export async function searchAic(query,{fetchImpl=fetch,limit=2}={}){
 const provider='aic',url=new URL('https://api.artic.edu/api/v1/artworks/search');url.searchParams.set('q',query);url.searchParams.set('limit',String(Math.min(limit*3,10)));url.searchParams.set('fields','id,title,date_display,artist_display,artist_title,image_id,medium_display,place_of_origin,style_title,classification_title,is_public_domain,credit_line');
 const payload=await getJSON(url,{provider,fetchImpl}),iiif=httpsUrl(payload?.config?.iiif_url)||'https://www.artic.edu/iiif/2';return(payload.data||[]).slice(0,limit).map(item=>{const imageUrl=item.is_public_domain===true&&item.image_id?`${iiif}/${item.image_id}/full/843,/0/default.jpg`:'';return common({provider,externalId:String(item.id),title:asText(item.title,'Без названия'),artist:asText(item.artist_title,asText(item.artist_display,'Неизвестный мастер').split('\n')[0]),year:asText(item.date_display,'Датировка не указана'),movement:asText(item.style_title,asText(item.classification_title,'Направление не указано')),region:asText(item.place_of_origin,'Регион не указан'),material:asText(item.medium_display,'Материал не указан'),technique:asText(item.classification_title,'Техника не указана'),type:asText(item.classification_title,'Произведение'),imageUrl,sourceUrl:`https://www.artic.edu/artworks/${item.id}`,museum:'Art Institute of Chicago',license:imageUrl?'Public Domain / Art Institute of Chicago':'Изображение не подтверждено для повторного использования',licenseUrl:'https://www.artic.edu/open-access/open-access-images',attribution:asText(item.credit_line)})});
}

export async function searchCleveland(query,{fetchImpl=fetch,limit=2}={}){
 const provider='cleveland',url=new URL('https://openaccess-api.clevelandart.org/api/artworks/');url.searchParams.set('q',query);url.searchParams.set('has_image','1');url.searchParams.set('limit',String(Math.min(limit*3,10)));
 const payload=await getJSON(url,{provider,fetchImpl});return(payload.data||[]).slice(0,limit).map(item=>{const license=asText(item.share_license_status),open=/cc0|public domain/i.test(license),imageUrl=open?httpsUrl(item.images?.web?.url||item.images?.print?.url):'';return common({provider,externalId:String(item.id),title:asText(item.title,'Без названия'),artist:asText(item.creators?.[0]?.description,asText(item.culture?.[0],'Неизвестный мастер')),year:asText(item.creation_date,'Датировка не указана'),movement:asText(item.style?.[0],asText(item.type,'Направление не указано')),region:asText(item.culture?.[0],asText(item.find_spot,'Регион не указан')),material:asText(item.technique,'Материал не указан'),technique:asText(item.technique,'Техника не указана'),type:asText(item.type,'Произведение'),imageUrl,sourceUrl:httpsUrl(item.url)||`https://www.clevelandart.org/art/${item.accession_number||item.id}`,museum:'Cleveland Museum of Art',license:license||'Условия использования указаны музеем',licenseUrl:'https://www.clevelandart.org/open-access',attribution:asText(item.creditline)})});
}

export async function searchMetPage(query,{fetchImpl=fetch,cursor=0,limit=6}={}){
 const provider='met',offset=Math.max(0,Number(cursor)||0),pageSize=Math.min(Math.max(limit*3,limit),24),search=new URL('https://collectionapi.metmuseum.org/public/collection/v1.1/search');search.searchParams.set('q',query);search.searchParams.set('artistOrCulture','true');search.searchParams.set('hasImages','true');search.searchParams.set('offset',String(offset));search.searchParams.set('limit',String(pageSize));
 const listing=await getJSON(search,{provider,fetchImpl}),ids=listing.objectIDs||[],records=[];let consumed=0;
 for(const externalId of ids){if(records.length>=limit)break;consumed+=1;const item=await getJSON(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${externalId}`,{provider,fetchImpl}).catch(()=>null);if(!item?.objectID)continue;const imageUrl=item.isPublicDomain===true?httpsUrl(item.primaryImageSmall||item.primaryImage):'';records.push(common({provider,externalId:String(item.objectID),title:asText(item.title,'Без названия'),artist:asText(item.artistDisplayName,asText(item.culture,'Неизвестный мастер')),year:asText(item.objectDate,'Датировка не указана'),movement:asText(item.period,asText(item.objectName,'Направление не указано')),region:asText(item.country,asText(item.culture,'Регион не указан')),material:asText(item.medium,'Материал не указан'),technique:asText(item.objectName,'Техника не указана'),type:asText(item.classification,asText(item.objectName,'Произведение')),imageUrl,sourceUrl:httpsUrl(item.objectURL)||`https://www.metmuseum.org/art/collection/search/${item.objectID}`,museum:'The Metropolitan Museum of Art',license:imageUrl?'CC0 / Met Open Access':'Изображение не подтверждено для повторного использования',licenseUrl:'https://www.metmuseum.org/policies/image-resources',attribution:compact([item.creditLine,item.repository]).join(' · ')}));}
 const nextCursor=offset+consumed,total=Number(listing.total)||0;return{provider,artworks:records,fetched:consumed,nextCursor,exhausted:!ids.length||nextCursor>=Math.min(total,10000)};
}

export async function searchAicPage(query,{fetchImpl=fetch,cursor=1,limit=6}={}){
 const provider='aic',page=Math.max(1,Number(cursor)||1),url=new URL('https://api.artic.edu/api/v1/artworks/search');url.searchParams.set('q',query);url.searchParams.set('page',String(page));url.searchParams.set('limit',String(Math.min(Math.max(limit,1),20)));url.searchParams.set('fields','id,title,date_display,artist_display,artist_title,image_id,medium_display,place_of_origin,style_title,classification_title,is_public_domain,credit_line');
 const payload=await getJSON(url,{provider,fetchImpl}),iiif=httpsUrl(payload?.config?.iiif_url)||'https://www.artic.edu/iiif/2',records=(payload.data||[]).map(item=>{const imageUrl=item.is_public_domain===true&&item.image_id?`${iiif}/${item.image_id}/full/843,/0/default.jpg`:'';return common({provider,externalId:String(item.id),title:asText(item.title,'Без названия'),artist:asText(item.artist_title,asText(item.artist_display,'Неизвестный мастер').split('\n')[0]),year:asText(item.date_display,'Датировка не указана'),movement:asText(item.style_title,asText(item.classification_title,'Направление не указано')),region:asText(item.place_of_origin,'Регион не указан'),material:asText(item.medium_display,'Материал не указан'),technique:asText(item.classification_title,'Техника не указана'),type:asText(item.classification_title,'Произведение'),imageUrl,sourceUrl:`https://www.artic.edu/artworks/${item.id}`,museum:'Art Institute of Chicago',license:imageUrl?'Public Domain / Art Institute of Chicago':'Изображение не подтверждено для повторного использования',licenseUrl:'https://www.artic.edu/open-access/open-access-images',attribution:asText(item.credit_line)})}),pagination=payload.pagination||{},totalPages=Math.min(Number(pagination.total_pages)||page,500);
 return{provider,artworks:records,fetched:records.length,nextCursor:page+1,exhausted:!records.length||page>=totalPages};
}

export async function searchClevelandPage(query,{fetchImpl=fetch,cursor=0,limit=6}={}){
 const provider='cleveland',skip=Math.max(0,Number(cursor)||0),pageSize=Math.min(Math.max(limit,1),20),url=new URL('https://openaccess-api.clevelandart.org/api/artworks/');url.searchParams.set('q',query);url.searchParams.set('has_image','1');url.searchParams.set('skip',String(skip));url.searchParams.set('limit',String(pageSize));
 const payload=await getJSON(url,{provider,fetchImpl}),records=(payload.data||[]).map(item=>{const license=asText(item.share_license_status),open=/cc0|public domain/i.test(license),imageUrl=open?httpsUrl(item.images?.web?.url||item.images?.print?.url):'';return common({provider,externalId:String(item.id),title:asText(item.title,'Без названия'),artist:asText(item.creators?.[0]?.description,asText(item.culture?.[0],'Неизвестный мастер')),year:asText(item.creation_date,'Датировка не указана'),movement:asText(item.style?.[0],asText(item.type,'Направление не указано')),region:asText(item.culture?.[0],asText(item.find_spot,'Регион не указан')),material:asText(item.technique,'Материал не указан'),technique:asText(item.technique,'Техника не указана'),type:asText(item.type,'Произведение'),imageUrl,sourceUrl:httpsUrl(item.url)||`https://www.clevelandart.org/art/${item.accession_number||item.id}`,museum:'Cleveland Museum of Art',license:license||'Условия использования указаны музеем',licenseUrl:'https://www.clevelandart.org/open-access',attribution:asText(item.creditline)})}),nextCursor=skip+(payload.data||[]).length,total=Number(payload.info?.total)||0;
 return{provider,artworks:records,fetched:records.length,nextCursor,exhausted:!records.length||(total>0&&nextCursor>=total)||(payload.data||[]).length<pageSize};
}

export const MUSEUM_ADAPTERS=Object.freeze([{id:'met',search:searchMet},{id:'aic',search:searchAic},{id:'cleveland',search:searchCleveland}]);
export const MUSEUM_PAGE_ADAPTERS=Object.freeze([{id:'met',search:searchMetPage},{id:'aic',search:searchAicPage},{id:'cleveland',search:searchClevelandPage}]);

export async function searchMuseums(query,{fetchImpl=fetch,limitPerProvider=2}={}){
 const settled=await Promise.allSettled(MUSEUM_ADAPTERS.map(adapter=>adapter.search(query,{fetchImpl,limit:limitPerProvider})));
 const artworks=settled.flatMap(result=>result.status==='fulfilled'?result.value:[]);
 const errors=settled.flatMap((result,index)=>result.status==='rejected'?[{provider:MUSEUM_ADAPTERS[index].id,status:result.reason?.status??null,type:result.reason?.name||'MuseumRequestError'}]:[]);
 return{artworks,errors,providers:MUSEUM_ADAPTERS.map(item=>item.id)};
}

export async function searchMuseumPages(query,{fetchImpl=fetch,limitPerProvider=6,cursors={},exhaustedProviders=[]}={}){
 const exhausted=new Set(exhaustedProviders),active=MUSEUM_PAGE_ADAPTERS.filter(adapter=>!exhausted.has(adapter.id)),settled=await Promise.allSettled(active.map(adapter=>adapter.search(query,{fetchImpl,limit:limitPerProvider,cursor:cursors[adapter.id]}))),pages=[],errors=[];
 settled.forEach((result,index)=>{const provider=active[index].id;if(result.status==='fulfilled')pages.push(result.value);else errors.push({provider,status:result.reason?.status??null,type:result.reason?.name||'MuseumRequestError'})});
 return{artworks:pages.flatMap(page=>page.artworks),pages,errors,providers:MUSEUM_PAGE_ADAPTERS.map(item=>item.id)};
}
