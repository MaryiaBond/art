import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshedMuseumImage,repairStoredArtworkImage} from '../src/artwork-images.js';

const response=data=>({ok:true,json:async()=>data});

test('refreshes public museum image URLs by provider without changing artwork identity',async()=>{
 const met=await refreshedMuseumImage({provider:'met',externalId:'245230'},{fetchImpl:async()=>response({isPublicDomain:true,primaryImageSmall:'https://images.metmuseum.org/refreshed.jpg'})});
 const aic=await refreshedMuseumImage({provider:'aic',externalId:'110643'},{fetchImpl:async()=>response({data:{is_public_domain:true,image_id:'image-uuid'},config:{iiif_url:'https://www.artic.edu/iiif/2'}})});
 const cleveland=await refreshedMuseumImage({provider:'cleveland',externalId:'106466'},{fetchImpl:async()=>response({data:{share_license_status:'CC0',images:{web:{url:'https://openaccess-cdn.clevelandart.org/refreshed.jpg'}}}})});
 assert.equal(met,'https://images.metmuseum.org/refreshed.jpg');
 assert.equal(aic,'https://www.artic.edu/iiif/2/image-uuid/full/843,/0/default.jpg');
 assert.equal(cleveland,'https://openaccess-cdn.clevelandart.org/refreshed.jpg');
});

test('repairs only the URL fields and preserves artworkId and user relations',async()=>{
 const artwork={id:'local-aic-110643',artworkId:'local-aic-110643',catalogSource:'local',provider:'aic',externalId:'110643',image:'https://old.example/image.jpg',imageUrl:'https://old.example/image.jpg',artistId:'ancient-cypriot'};
 const before={id:artwork.id,artworkId:artwork.artworkId,artistId:artwork.artistId};
 await repairStoredArtworkImage(artwork,{fetchImpl:async()=>response({data:{is_public_domain:true,image_id:'new-image'},config:{iiif_url:'https://www.artic.edu/iiif/2'}}),loadImage:async()=>{}});
 assert.deepEqual({id:artwork.id,artworkId:artwork.artworkId,artistId:artwork.artistId},before);
 assert.equal(artwork.image,'https://www.artic.edu/iiif/2/new-image/full/843,/0/default.jpg');
 assert.equal(artwork.imageUrl,artwork.image);
});
