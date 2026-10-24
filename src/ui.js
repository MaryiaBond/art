import {ArtVector} from './vector-art.js';
import {ArtIcon} from './icons.js';

const HEX=/^#[0-9A-Fa-f]{6}$/;
const normalizedColors=colors=>(Array.isArray(colors)?colors:[]).map(color=>typeof color==='string'?color:color?.hex).filter(color=>HEX.test(color||'')).slice(-3).map(color=>color.toUpperCase());

export function arrowStrokeColors(colors){
 const palette=normalizedColors(colors);
 return [palette[0]||'#777B77',palette[1]||'#929692',palette[2]||'#A8ABA7'];
}

export const ArtArrowIcon={
 name:'ArtArrowIcon',inheritAttrs:false,props:{colors:{type:Array,default:()=>[]},direction:{type:String,default:'right',validator:value=>['left','right'].includes(value)}},
 setup(props,{attrs}){
  const {h}=window.Vue;
  return()=>h(ArtVector,{...attrs,name:'ui/three-stroke-arrow',colors:arrowStrokeColors(props.colors),decorative:true,class:['art-arrow-icon',`is-${props.direction}`,attrs.class]});
 }
};

const isSaved=(savedColors,artworkId,index)=>(savedColors||[]).some(color=>color.id===`${artworkId}:${index}`);

export const ArtworkPaletteSwatches={
 name:'ArtworkPaletteSwatches',
 props:{artwork:{type:Object,required:true},savedColors:{type:Array,default:()=>[]},compact:{type:Boolean,default:false},label:{type:Boolean,default:true}},
 emits:['toggle-color','delete-color'],
 setup(props,{emit}){
  const {h,ref,computed,onMounted,onBeforeUnmount}=window.Vue,root=ref(null),editId=ref(null),editing=ref(false),userColors=computed(()=>props.savedColors.filter(color=>color.artworkId===props.artwork.id&&color.source==='user-picked'));let timer=null,start=null;
  const cancel=()=>{clearTimeout(timer);timer=null;start=null};
  const press=(color,event)=>{if(event.pointerType==='mouse'&&event.button!==0)return;cancel();start={x:event.clientX,y:event.clientY};timer=setTimeout(()=>{editId.value=color.id;timer=null},500)};
  const move=event=>{if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>10)cancel()};
  const outside=event=>{if(!root.value?.contains(event.target)){editId.value=null;editing.value=false;cancel()}};
  onMounted(()=>document.addEventListener('pointerdown',outside));onBeforeUnmount(()=>{cancel();document.removeEventListener('pointerdown',outside)});
  return()=>h('div',{class:['artwork-palette-swatches',{'is-compact':props.compact}]},[
   props.label?h('span',{class:'artwork-palette-label'},'Палитра произведения'):null,
   h('div',{ref:root,class:'artwork-palette-colors'},[
    ...(props.artwork.palette||[]).map((hex,index)=>{const saved=isSaved(props.savedColors,props.artwork.id,index);return h('button',{type:'button',class:['artwork-palette-swatch',{'is-saved':saved}],style:{'--swatch':hex},title:saved?'Цвет сохранён':'Сохранить цвет','aria-label':`${saved?'Убрать сохранённый цвет':'Сохранить цвет'} ${hex}`,'aria-pressed':String(saved),onClick:()=>emit('toggle-color',props.artwork,index)},[h('span',{'aria-hidden':'true'},saved?'✓':'')])}),
    ...userColors.value.map(color=>h('span',{class:['user-color-wrap',{'is-editing':editing.value||editId.value===color.id}]},[h('button',{type:'button',class:'artwork-palette-swatch user-picked-swatch',style:{'--swatch':color.hex},title:`Мой оттенок ${color.hex}`,'aria-label':`Мой оттенок ${color.hex}. Удерживайте или откройте контекстное меню для удаления.`,onPointerdown:event=>press(color,event),onPointermove:move,onPointerup:cancel,onPointercancel:cancel,onContextmenu:event=>{event.preventDefault();editId.value=color.id}},[h(ArtIcon,{name:'self',class:'user-color-mark','aria-hidden':'true'})]),editing.value||editId.value===color.id?h('button',{type:'button',class:'user-color-delete','aria-label':`Удалить мой оттенок ${color.hex}`,onClick:()=>{emit('delete-color',color);editId.value=null}},'×'):null])),
    userColors.value.length?h('button',{type:'button',class:'user-colors-edit','aria-label':editing.value?'Закрыть редактирование моих оттенков':'Редактировать мои оттенки',title:'Редактировать мои оттенки',onClick:()=>editing.value=!editing.value},[h(ArtIcon,{name:'notes','aria-hidden':'true'})]):null
   ])
  ]);
 }
};

export const ArtworkQuickPaletteTrigger={
 name:'ArtworkQuickPaletteTrigger',
 props:{artwork:{type:Object,required:true},savedColors:{type:Array,default:()=>[]},open:{type:Boolean,default:false}},
 emits:['toggle','toggle-color','delete-color'],
 setup(props,{emit}){
  const {h}=window.Vue;
  return()=>(props.artwork.palette?.length||props.savedColors.some(color=>color.artworkId===props.artwork.id&&color.source==='user-picked'))?h('div',{class:['artwork-quick-palette',{'is-open':props.open}]},[
   h('button',{type:'button',class:'artwork-quick-trigger','aria-label':`Палитра произведения: ${props.artwork.title}`,'aria-expanded':String(props.open),onClick:event=>{event.stopPropagation();emit('toggle',props.artwork.id,event.currentTarget)}},[
    h(ArtVector,{name:'ui/artist-palette',colors:props.artwork.palette,decorative:true})
   ]),
   props.open?h('div',{class:'artwork-palette-popover',role:'group','aria-label':`Цвета произведения «${props.artwork.title}»`,onClick:event=>event.stopPropagation()},[
    h(ArtworkPaletteSwatches,{artwork:props.artwork,savedColors:props.savedColors,compact:true,label:false,onToggleColor:(artwork,index)=>emit('toggle-color',artwork,index),onDeleteColor:color=>emit('delete-color',color)})
   ]):null
  ]):null;
 }
};

export const CollectionToolbar={
 name:'CollectionToolbar',
 props:{filters:{type:Array,default:()=>[]},sortValue:{type:String,default:''},sortOptions:{type:Array,default:()=>[]},resultCount:{type:Number,default:0},filterEnabled:{type:Boolean,default:true}},
 emits:['update-filter','update-sort','reset'],
 setup(props,{emit}){
  const {h,ref}=window.Vue,open=ref(false);
  const activeCount=()=>props.filters.filter(filter=>filter.value!=='all').length;
  return()=>h('div',{class:'collection-toolbar'},[
   h('div',{class:'collection-toolbar-row'},[
    props.filterEnabled&&props.filters.length?h('button',{type:'button',class:['collection-tool-button',{'is-active':activeCount()>0}],'aria-expanded':String(open.value),onClick:()=>open.value=true},[
     h(ArtIcon,{name:'compare',class:'app-icon','aria-hidden':'true'}),h('span',null,'Фильтры'),activeCount()?h('b',null,String(activeCount())):null
    ]):null,
    props.sortOptions.length?h('label',{class:'collection-sort'},[h('span',null,'Сортировка'),h('select',{value:props.sortValue,'aria-label':'Сортировка',onChange:event=>emit('update-sort',event.target.value)},props.sortOptions.map(option=>h('option',{value:option.value},option.label))) ]):null
   ]),
   h('div',{class:'collection-result-count'},`Найдено: ${props.resultCount}`),
   open.value?h('div',{class:'collection-sheet-backdrop',onClick:event=>{if(event.target===event.currentTarget)open.value=false}},[
    h('section',{class:'collection-sheet',role:'dialog','aria-modal':'true','aria-label':'Фильтры коллекции'},[
     h('header',null,[h('strong',null,'Фильтры'),h('button',{type:'button','aria-label':'Закрыть фильтры',onClick:()=>open.value=false},'×')]),
     ...props.filters.map(filter=>h('label',{class:'collection-filter'},[h('span',null,filter.label),h('select',{value:filter.value,onChange:event=>emit('update-filter',{id:filter.id,value:event.target.value})},filter.options.map(option=>h('option',{value:option.value},option.label)))])),
     h('div',{class:'collection-sheet-actions'},[h('button',{type:'button',class:'text-btn',disabled:!activeCount(),onClick:()=>emit('reset')},'Сбросить'),h('button',{type:'button',class:'action-btn',onClick:()=>open.value=false},'Показать')])
    ])
   ]):null
  ]);
 }
};

