const httpsUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:''}catch{return''}};
const openLicense=value=>/cc0|public domain/i.test(String(value||''));

export async function refreshedMuseumImage(artwork,{fetchImpl=fetch}={}){
 if(!artwork?.externalId)return'';
 if(artwork.provider==='met'){
  const response=await fetchImpl(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${encodeURIComponent(artwork.externalId)}`,{headers:{Accept:'application/json'}});
  if(!response.ok)return'';const item=await response.json();return item.isPublicDomain===true?httpsUrl(item.primaryImageSmall||item.primaryImage):'';
 }
 if(artwork.provider==='aic'){
  const response=await fetchImpl(`https://api.artic.edu/api/v1/artworks/${encodeURIComponent(artwork.externalId)}?fields=id,image_id,is_public_domain`,{headers:{Accept:'application/json'}});
  if(!response.ok)return'';const payload=await response.json(),item=payload?.data,base=httpsUrl(payload?.config?.iiif_url)||'https://www.artic.edu/iiif/2';return item?.is_public_domain===true&&item.image_id?`${base}/${item.image_id}/full/843,/0/default.jpg`:'';
 }
 if(artwork.provider==='cleveland'){
  const response=await fetchImpl(`https://openaccess-api.clevelandart.org/api/artworks/${encodeURIComponent(artwork.externalId)}`,{headers:{Accept:'application/json'}});
  if(!response.ok)return'';const item=(await response.json())?.data;return openLicense(item?.share_license_status)?httpsUrl(item?.images?.web?.url||item?.images?.print?.url):'';
 }
 return'';
}

export const loadImageWithoutCors=(url,{ImageCtor=globalThis.Image,timeoutMs=8000}={})=>new Promise((resolve,reject)=>{if(!ImageCtor)return reject(Error('image-api-unavailable'));const image=new ImageCtor(),timer=setTimeout(()=>{image.src='';reject(Error('image-timeout'))},timeoutMs),done=callback=>value=>{clearTimeout(timer);callback(value)};image.onload=done(()=>resolve(url));image.onerror=done(()=>reject(Error('image-load')));image.src=url});

export async function repairStoredArtworkImage(artwork,options={}){
 if(!artwork||artwork.catalogSource!=='local')return'';
 const next=await refreshedMuseumImage(artwork,options);if(!next)return'';
 await (options.loadImage||((url)=>loadImageWithoutCors(url,options)))(next);
 artwork.image=next;artwork.imageUrl=next;return next;
}
