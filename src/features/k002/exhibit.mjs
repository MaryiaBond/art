import {getK001Palette} from '../k001/exhibit.mjs';

export const K002_ID='k002';
export const K002_REQUIRED_LESSONS=3;
export const K002_LEVELS=Object.freeze([
 {level:1,min:3,max:6,title:'Причастный к созданию'},
 {level:2,min:7,max:14,title:'Кустарное производство'},
 {level:3,min:15,max:29,title:'Деятель просвещения'},
 {level:4,min:30,max:59,title:'Промышленного масштаба'},
 {level:5,min:60,max:Infinity,title:'Министерство культуры'}
]);
const reports=Object.freeze([
 'Комиссия подтверждает устойчивую склонность к созданию образовательных маршрутов. Производственный шум находится в пределах музейной нормы.',
 'Экспонат самостоятельно расширяет культурную программу. Ответственность за последствия распределена между вдохновением и любопытством.',
 'Зафиксировано систематическое производство знаний. Отдел учёта просит больше не приносить идеи без инвентарного номера.'
]);
export const uniqueCreatedLessonIds=value=>[...new Set((Array.isArray(value)?value:[]).filter(id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(id)))];
export const shouldUnlockK002=ids=>uniqueCreatedLessonIds(ids).length>=K002_REQUIRED_LESSONS;
export function getK002Level(count=0){const safe=Math.max(0,Math.floor(Number(count)||0));return[...K002_LEVELS].reverse().find(stage=>safe>=stage.min)||null}
const lessonNoun=count=>{const mod100=count%100,mod10=count%10;return mod100>=11&&mod100<=14?'уроков':mod10===1?'урок':mod10>=2&&mod10<=4?'урока':'уроков'};
export function getK002Exhibit({createdLessonIds=[],savedColors=[],revision=0}={}){const ids=uniqueCreatedLessonIds(createdLessonIds),count=ids.length,stage=getK002Level(count),next=stage&&stage.level<5?K002_LEVELS[stage.level]:null,safeRevision=Math.max(0,Math.floor(Number(revision)||0));return{id:'К-002',name:'МУЖИЧОК-СОЗДАТЕЛЬ',count,countLabel:`${count} ${lessonNoun(count)}`,level:stage?.level||0,title:stage?.title||'',nextAt:next?.min||null,palette:getK001Palette(savedColors),report:reports[safeRevision%reports.length],status:stage?`Уровень ${stage.level} из 5`:'Не обнаружен'}}
