import {searchMuseumPages} from '../server/museums.mjs';
import {classifyMuseumRecords} from '../netlify/functions/discover-epoch.mjs';

const query=process.argv[2]||'Johannes Vermeer',museum=await searchMuseumPages(query,{limitPerProvider:2,cursors:{met:0,aic:1,cleveland:0}}),classified=classifyMuseumRecords(museum,{candidate:{name:'Ян Вермеер',query},existingKeys:new Set(['met:437881'])});
console.log(JSON.stringify({query,pages:museum.pages.map(page=>({provider:page.provider,fetched:page.fetched,nextCursor:page.nextCursor,exhausted:page.exhausted,ids:page.artworks.map(item=>item.externalId)})),providerErrors:museum.errors,diagnostics:classified.diagnostics,accepted:classified.accepted.map(item=>({provider:item.provider,externalId:item.externalId,title:item.title,artist:item.artist}))},null,2));
