const text=(value,max)=>String(value||'').trim().slice(0,max);
const verified=artwork=>artwork?.verificationStatus==='verified'||artwork?.verification?.status==='verified';

export function periodLearningStats({periodId,artworks=[],lessons=[],lessonProgress=[]}){
 const periodArtworks=[...new Map(artworks.filter(item=>item?.periodId===periodId&&verified(item)).map(item=>[item.id,item])).values()];
 const periodLessons=[...new Map(lessons.filter(item=>item?.periodId===periodId&&item.id).map(item=>[item.id,item])).values()];
 const completedIds=new Set(lessonProgress.filter(item=>item?.status==='completed').map(item=>item.lessonId));
 const completedLessons=periodLessons.filter(item=>completedIds.has(item.id)).length,totalLessons=periodLessons.length;
 return{artists:new Set(periodArtworks.map(item=>item.artistId).filter(Boolean)).size,artworks:periodArtworks.length,lessons:totalLessons,completedLessons,progressPercent:totalLessons?Math.round(completedLessons/totalLessons*100):null};
}

export function compactEpochLessonPayload({topicId,mode,artistId,artworkIds,level,style,localArtworks=[],localQuestions=[]}){
 const selected=[...new Set((artworkIds||[]).filter(value=>typeof value==='string'))].slice(0,6),selectedIds=new Set(selected);
 const artworks=localArtworks.filter(item=>item?.periodId===topicId&&item.verificationStatus==='verified'&&selectedIds.has(item.id)).slice(0,6).map(item=>({id:text(item.id,120),title:text(item.title,140),artist:text(item.artist,100),artistId:text(item.artistId,120),year:text(item.year,50),movement:text(item.movement,100),features:(item.features||[]).map(value=>text(value,90)).filter(Boolean).slice(0,4),periodId:text(item.periodId,80),provider:text(item.provider,20),externalId:text(item.externalId,120),sourceUrl:text(item.sourceUrl||item.source,400),verificationStatus:'verified'}));
 const questions=localQuestions.filter(item=>item?.periodId===topicId&&item.source==='local-verified'&&Array.isArray(item.artworkIds)&&item.artworkIds.length&&item.artworkIds.every(id=>selectedIds.has(id))&&Array.isArray(item.options)&&item.options.length===4).slice(0,4).map(item=>({id:text(item.id,120),periodId:text(item.periodId,80),prompt:text(item.prompt,180),options:item.options.map(option=>({id:text(option.id,120),label:text(option.label,100)})),correct:text(item.correct,120),explanation:text(item.explanation,280),artworkIds:item.artworkIds.map(id=>text(id,120)).slice(0,2),source:'local-verified'}));
 return{topicId,mode,artistId,artworkIds:selected,level,style,catalog:{artworks,questions}};
}
