import {VECTOR_DEFINITIONS} from './vector-art.generated.js';

const HEX=/^#[0-9A-Fa-f]{6}$/;
export const VECTOR_NEUTRALS=Object.freeze(['#898989','#ADADAD','#777777']);

export function vectorPalette(colors=[]){
 const palette=(Array.isArray(colors)?colors:[]).map(color=>typeof color==='string'?color:color?.hex).filter(color=>HEX.test(color||'')).slice(-3).map(color=>color.toUpperCase());
 return [palette[0]||VECTOR_NEUTRALS[0],palette[1]||VECTOR_NEUTRALS[1],palette[2]||VECTOR_NEUTRALS[2]];
}

export function vectorPaletteStyle(colors=[]){const palette=vectorPalette(colors);return{'--art-c1':palette[0],'--art-c2':palette[1],'--art-c3':palette[2]}}

export const ArtVector={
 name:'ArtVector',inheritAttrs:false,
 props:{name:{type:String,required:true},colors:{type:Array,default:()=>[]},decorative:{type:Boolean,default:false}},
 setup(props,{attrs}){
  const {h}=window.Vue;
  return()=>{
   const definition=VECTOR_DEFINITIONS[props.name];if(!definition)return null;
   return h('svg',{...attrs,class:['art-vector',attrs.class],style:[vectorPaletteStyle(props.colors),attrs.style],xmlns:'http://www.w3.org/2000/svg',viewBox:definition.viewBox,width:'240',height:'240',preserveAspectRatio:'xMidYMid meet',focusable:'false','data-art-vector':props.name,role:props.decorative?undefined:'img','aria-hidden':props.decorative?'true':undefined,'aria-label':props.decorative?undefined:definition.label},definition.children.map(([tag,attributes],index)=>h(tag,{...attributes,key:index})));
  };
 }
};

export const VECTOR_NAMES=Object.freeze(Object.keys(VECTOR_DEFINITIONS));
