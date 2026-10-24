/** ART / K-001. Offline deterministic exhibit logic. */
export const K001_ID='k001';
export const K001_REQUIRED_ARTWORKS=7;
export const K001_NEUTRAL_COLORS=Object.freeze(['#B4B5B2','#D0D0CD','#747774']);
export const K001_LEVELS=Object.freeze([
 {level:1,min:7,max:11,title:'Неатрибутированный мужичок',status:'not-for-catalog',statusLabel:'Не для каталога'},
 {level:2,min:12,max:19,title:'Культурно значимый мужичок',status:'conditionally-admitted',statusLabel:'Условно допущен'},
 {level:3,min:20,max:34,title:'Мужичок музейного значения',status:'internal-fund',statusLabel:'Внутренний фонд'},
 {level:4,min:35,max:59,title:'Особо ценный мужичок',status:'special-storage',statusLabel:'Особое хранение'},
 {level:5,min:60,max:Infinity,title:'Мужичок — национальное достояние',status:'permanent-exhibition',statusLabel:'Постоянная экспозиция'}
]);
const schoolByEra=Object.freeze({prehistoric:'archaic',ancient:'sacred',classical:'archaic',medieval:'sacred',renaissance:'humanist',baroque:'dramatic',romanticism:'dramatic',impressionism:'natural-light',postimpressionism:'nervous',surrealism:'reality-disputed',modern:'constructive',contemporary:'reality-disputed'});

const profiles=Object.freeze({
 prehistoric:{heading:'Мужичок раннего периода',period:'Время создания: устанавливается по косвенным признакам',observation:'Экземпляр удивительно хорошо сохранился. Признаки цивилизации присутствуют выборочно.'},
 ancient:{heading:'Мужичок государственной важности',period:'Неустановленная древняя династия',observation:'Поза монументальна. Требования к окружающим соответствующие.'},
 classical:{heading:'Мужичок идеальных пропорций',period:'Классическая школа',observation:'Пропорции оспариваются, самооценка — нет.'},
 medieval:{heading:'Мужичок, обнаруженный в манускрипте',period:'Неизвестный монастырский скрипторий',observation:'На полях оставлены комментарии, не прошедшие церковную цензуру.'},
 renaissance:{heading:'Мужичок эпохи гуманизма',period:'Возрождение. Особо редкий экземпляр',observation:'Проявляет живой интерес к человеку. Особенно если человек — он сам.'},
 baroque:{heading:'Драматический мужичок с претензией на величие',period:'Барокко. Высокая степень театральности',observation:'Предпочитает эффектный свет и выходы с выражением лица.'},
 romanticism:{heading:'Мужичок на фоне сложной душевной погоды',period:'Романтизм. Пейзаж внутренний',observation:'Смотрит вдаль, поскольку поблизости всё уже прокомментировал.'},
 impressionism:{heading:'Мужичок при естественном освещении',period:'Импрессионизм. Состояние изменчивое',observation:'При попытке зафиксировать мгновение заявил, что оно уже прошло.'},
 postimpressionism:{heading:'Мужичок повышенной эмоциональной насыщенности',period:'Постимпрессионизм. Цветовая перегрузка',observation:'Объективность цвета отклонена экспертным советом.'},
 surrealism:{heading:'Мужичок. Авторство реальности оспаривается',period:'Сюрреализм. Происхождение неясно',observation:'По словам очевидцев, объект присутствовал одновременно в двух разговорах.'},
 modern:{heading:'Мужичок, выполненный с нарушением пропорций',period:'Авангард. Форма экспериментальная',observation:'Попытки объяснить объект привели к появлению новых вопросов.'},
 contemporary:{heading:'Мужичок как самостоятельное высказывание',period:'Современное искусство. Смешанная техника',observation:'Сам факт присутствия уже объявлен перформансом.'},
 mixed:{heading:'Мужичок. Сложная атрибуция',period:'Смешанный период. XXI век',observation:'Сочетает несовместимые художественные традиции и считает это личным достижением.'}
});

const conclusions=Object.freeze([
 'Объект демонстрирует признаки художественного вкуса. При попытке классификации назвал комиссию душнилами.',
 'В ходе реставрации обнаружен характер. Реставраторы просят больше его не трогать.',
 'Эксперты разошлись во мнениях. Экспонат потребовал книгу жалоб и лучший свет.',
 'На просьбу объяснить свой выбор цветов объект ответил: «Красиво же». Комиссия затруднилась возразить.',
 'Экспонат рекомендовано оставить в естественной среде обитания. Контактировать бережно.'
]);

const asId=entry=>typeof entry==='string'?entry:entry?.artworkId||entry?.id;
const legitHex=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value);
const normal=value=>String(value||'').toLowerCase();
const timeOf=value=>{const parsed=Date.parse(value?.savedAt||value?.createdAt||'');return Number.isFinite(parsed)?parsed:0};

function periodKey(art){
 const tags=[art.periodId,art.style,art.styleId,art.movement,...(art.periodIds||[]),...(art.styleIds||[])].map(normal),matches=key=>tags.some(tag=>tag.includes(key));
 if(matches('surreal'))return'surrealism';if(matches('postimpression')||matches('post-impression'))return'postimpressionism';if(matches('impression'))return'impressionism';if(matches('renaissance'))return'renaissance';if(matches('baroque')||matches('rococo'))return'baroque';if(matches('romanti')||matches('realism'))return'romanticism';if(matches('prehistor')||matches('paleolith'))return'prehistoric';if(matches('ancient')||matches('egypt')||matches('mesopot'))return'ancient';if(matches('classical')||matches('antiquity'))return'classical';if(matches('medieval')||matches('gothic')||matches('byzant'))return'medieval';if(matches('modern')||matches('avant')||matches('cubism'))return'modern';if(matches('contemporary'))return'contemporary';return'mixed';
}

export function favoriteArtworkRecords(favorites=[],catalog=[]){const map=new Map(catalog.map(art=>[art.id,art])),visited=new Set();return favorites.map(asId).filter(id=>{if(typeof id!=='string'||visited.has(id)||!map.has(id))return false;visited.add(id);return true}).map(id=>map.get(id))}
export function shouldUnlockK001(favorites,catalog){return favoriteArtworkRecords(favorites,catalog).length>=K001_REQUIRED_ARTWORKS}

export function getK001Palette(colors=[]){
 const ordered=(Array.isArray(colors)?colors:[]).map((color,index)=>({hex:typeof color==='string'?color:color?.hex,time:typeof color==='object'?timeOf(color):0,order:typeof color==='object'&&Number.isInteger(color?.savedOrder)?color.savedOrder:index+1,index})).filter(color=>legitHex(color.hex)).sort((a,b)=>a.time-b.time||a.order-b.order||a.index-b.index);
 const unique=[],seen=new Set();for(let index=ordered.length-1;index>=0&&unique.length<3;index--){const hex=ordered[index].hex.toUpperCase();if(!seen.has(hex)){seen.add(hex);unique.push(hex)}}
 return unique.length?unique.reverse():K001_NEUTRAL_COLORS.slice();
}

export function getK001Era(favorites,catalog){const records=favoriteArtworkRecords(favorites,catalog);if(!records.length)return'mixed';const counter=new Map();records.forEach((art,index)=>{const key=periodKey(art),previous=counter.get(key)||{count:0,latest:-1};counter.set(key,{count:previous.count+1,latest:index})});return[...counter].sort((a,b)=>b[1].count-a[1].count||b[1].latest-a[1].latest)[0][0]}

export function getK001Level(count=0){const safe=Math.max(0,Math.floor(Number(count)||0));return[...K001_LEVELS].reverse().find(item=>safe>=item.min)||null}
export function getK001School(era){return schoolByEra[era]||null}

export function getK001Exhibit({favorites=[],artworks=[],savedColors=[],revision=0}={}){const favoriteCount=favoriteArtworkRecords(favorites,artworks).length,era=getK001Era(favorites,artworks),school=getK001School(era),profile=profiles[era]||profiles.mixed,stage=getK001Level(favoriteCount)||K001_LEVELS[0],safeRevision=Number.isFinite(revision)?Math.max(0,Math.floor(revision)):0;return{id:'К-001',name:stage.title.toUpperCase(),era,school,level:stage.level,status:stage.status,statusLabel:stage.statusLabel,heading:profile.heading,period:profile.period,observation:profile.observation,conclusion:conclusions[safeRevision%conclusions.length],material:'Мясо, сарказм, художественный вкус',condition:'Удовлетворительное. Местами прекрасное.',attribution:'Предположительно Катя',value:'Не подлежит оценке',protection:stage.level===5?'НАЦИОНАЛЬНОЕ ДОСТОЯНИЕ. ВЫВОЗУ НЕ ПОДЛЕЖИТ.':`УРОВЕНЬ ${stage.level} · ${stage.statusLabel.toUpperCase()}`,palette:getK001Palette(savedColors),favoriteCount}}
