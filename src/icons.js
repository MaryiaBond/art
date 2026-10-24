// Inline SVG icons avoid WebKit's inconsistent styling of external SVG reference trees.
// Each painted part remains addressable through --icon-* custom properties.
export const ICON_DEFINITIONS = {
  time: [
    ['path','ink',{d:'M32 7V57'}],['circle','a',{cx:32,cy:14,r:6.5}],
    ['path','edge',{d:'M13 24L49 21L52 34L16 37Z'}],['path','b',{d:'M17 27L35 25.5L36 34L18 35Z'}],
    ['path','ink',{d:'M20 48L49 44'}],['circle','c',{cx:47,cy:45,r:5.5}]
  ],
  practice: [
    ['path','ink',{d:'M10 26V13H23M41 13H53V26M53 42V53H41M23 53H10V42'}],
    ['path','edge',{d:'M17 34C24 23 40 22 49 34C39 45 27 46 17 34Z'}],
    ['circle','a',{cx:33,cy:34,r:8}],['circle','b',{cx:33,cy:34,r:2.7}],['path','ink',{d:'M43 12L49 7'}]
  ],
  self: [
    ['path','ink',{d:'M11 45V13H46'}],['path','ink',{d:'M53 22V55H24'}],
    ['path','edge',{d:'M28 12C17 13 17 29 22 38L16 48L47 50L42 38C50 28 46 13 35 12Z'}],
    ['path','a',{d:'M31 13C18 14 19 32 25 39L21 49L32 50Z'}],['circle','b',{cx:38,cy:27,r:3}],
    ['path','ink',{d:'M35 39L43 37'}],['path','c',{d:'M43 11L53 15L48 23Z'}]
  ],
  artworks: [
    ['path','ink',{d:'M10 20L51 14L55 49L15 56Z'}],['path','edge',{d:'M15 15H45V47H15Z'}],
    ['path','a',{d:'M18 41L30 29L37 34L45 25V47H18Z'}],['circle','b',{cx:34,cy:24,r:4.4}],
    ['path','ink',{d:'M19 51L46 51'}]
  ],
  artists: [
    ['path','ink',{d:'M12 52C13 43 21 42 25 39M40 40C49 41 53 45 53 53'}],
    ['path','edge',{d:'M32 10C20 10 18 22 21 32C23 40 29 44 33 44C42 44 47 32 46 24C45 15 41 10 32 10Z'}],
    ['path','a',{d:'M23 12C17 21 19 34 25 40L32 44V11Z'}],['path','ink',{d:'M35 27L40 25M34 34L40 35'}],
    ['path','b',{d:'M43 8L52 15L47 23L39 16Z'}],['circle','c',{cx:16,cy:15,r:4.5}]
  ],
  epochs: [
    ['path','ink',{d:'M11 54H55'}],['path','edge',{d:'M14 46H51V54H14Z'}],
    ['path','a',{d:'M20 33H47V46H20Z'}],['path','edge',{d:'M25 19H44V33H25Z'}],
    ['path','b',{d:'M32 8L46 19H18Z'}],['path','ink',{d:'M14 46L20 33M47 33L51 46'}],
    ['circle','c',{cx:50,cy:12,r:5.5}]
  ],
  favorites: [
    ['path','ink',{d:'M32 53C22 44 12 37 12 26C12 18 17 13 24 13C28 13 31 15 33 19C35 15 40 11 46 13C54 15 56 22 53 30C50 38 42 45 32 53Z'}],
    ['path','a',{d:'M15 25C15 17 21 14 27 17L31 23L25 34L16 34Z'}],
    ['path','b',{d:'M35 20C40 13 50 14 52 23L48 35L33 41Z'}],['path','c',{d:'M23 42L32 51L39 44L33 37Z'}]
  ],
  palette: [
    ['path','ink',{d:'M17 49L43 17M17 49L51 36M17 49L18 10'}],['path','a',{d:'M14 9L23 11L23 38L14 43Z'}],
    ['path','b',{d:'M44 13L53 21L34 43L25 36Z'}],['path','c',{d:'M49 31L55 42L29 53L25 43Z'}],
    ['circle','edge',{cx:17,cy:49,r:5.5}]
  ],
  compare: [
    ['path','edge',{d:'M10 12H36V48H10Z'}],['path','a',{d:'M13 37L22 27L33 36V45H13Z'}],
    ['circle','b',{cx:27,cy:21,r:4}],['path','edge',{d:'M30 19H54V54H30Z'}],
    ['path','c',{d:'M33 48L41 36L51 42V51H33Z'}],['path','ink',{d:'M19 56L57 10'}]
  ],
  notes: [
    ['path','edge',{d:'M15 10H42L52 20V54H15Z'}],['path','ink',{d:'M42 10V20H52'}],
    ['path','a',{d:'M22 28L36 24L32 35L45 31'}],['path','ink',{d:'M23 43L44 43M23 48H36'}],
    ['circle','b',{cx:47,cy:48,r:6}]
  ],
  joy: [
    ['path','ink',{d:'M29 9L35 17L45 13L45 24L56 29L48 36L52 47L40 46L32 56L25 46L12 48L16 36L8 28L20 24L19 13Z'}],
    ['path','a',{d:'M29 9L35 17L45 13L45 24L34 28L22 22Z'}],['path','b',{d:'M48 36L52 47L40 46L32 56L26 45L35 35Z'}],
    ['circle','c',{cx:27,cy:29,r:4.2}],['path','ink',{d:'M37 28L42 27M25 39Q33 45 40 36'}]
  ],
  melancholy: [
    ['path','ink',{d:'M14 15C23 10 41 10 51 20L47 44C38 54 22 53 15 43Z'}],
    ['path','a',{d:'M14 15C20 10 31 11 36 13L27 48C20 47 17 44 15 43Z'}],
    ['path','ink',{d:'M32 25L36 23M43 26L47 28M33 40Q40 35 45 41'}],
    ['path','b',{d:'M46 29C42 38 49 38 48 45C55 43 57 36 46 29Z'}],['path','c',{d:'M11 52L20 45L23 55Z'}]
  ],
  curiosity: [
    ['path','ink',{d:'M10 32C20 16 42 16 53 32C42 48 20 48 10 32Z'}],
    ['path','a',{d:'M20 21C30 16 45 20 53 32L39 32L32 23Z'}],['circle','edge',{cx:32,cy:32,r:11}],
    ['circle','b',{cx:35,cy:29,r:5}],['path','c',{d:'M12 12L20 9L23 17L14 20Z'}],
    ['path','ink',{d:'M45 9L48 15M52 13L54 18'}]
  ],
  calm: [
    ['path','ink',{d:'M9 29C17 23 24 23 32 29S47 35 55 29M9 39C17 33 24 33 32 39S47 45 55 39'}],
    ['path','a',{d:'M11 22Q32 1 53 22Z'}],['path','b',{d:'M14 45Q32 53 50 45L44 55H21Z'}],
    ['circle','c',{cx:32,cy:19,r:6}]
  ]
};

export const ICON_NAMES = Object.freeze(Object.keys(ICON_DEFINITIONS));

const neutralIconStyle=()=>({'--icon-ink':'currentColor','--icon-paper':'transparent','--icon-c1':'currentColor','--icon-c2':'currentColor','--icon-c3':'currentColor'});
const savedTime=value=>{const parsed=Date.parse(value?.savedAt||value?.createdAt||'');return Number.isFinite(parsed)?parsed:0};
const colorHash=value=>{let hash=2166136261;for(const char of value){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0};

export function recentUniqueColors(entries,limit=3){
 const ordered=(Array.isArray(entries)?entries:[]).filter(entry=>entry&&/^#[0-9A-Fa-f]{6}$/.test(entry.hex||'')).map((entry,index)=>({...entry,__index:index})).sort((left,right)=>savedTime(left)-savedTime(right)||(Number(left.savedOrder)||0)-(Number(right.savedOrder)||0)||left.__index-right.__index);
 const unique=[],seen=new Set();
 for(let index=ordered.length-1;index>=0&&unique.length<limit;index--){const entry=ordered[index],hex=entry.hex.toUpperCase();if(!seen.has(hex)){seen.add(hex);unique.push({...entry,hex})}}
 return unique.reverse().map(({__index,...entry})=>entry);
}

export const INTERFACE_COLOR_FALLBACKS=Object.freeze(['#898989','#ADADAD','#777777']);

export function activeInterfaceColors(entries,settings={}){
 const automatic=recentUniqueColors(entries,3).map(item=>item.hex),manual=Array.isArray(settings.manualInterfacePalette)?settings.manualInterfacePalette:[];
 const source=settings.interfaceColorMode==='manual'?manual:automatic;
 return INTERFACE_COLOR_FALLBACKS.map((fallback,index)=>/^#[0-9A-Fa-f]{6}$/.test(source[index]||'')?source[index].toUpperCase():fallback);
}

export function iconPaletteStyle(colors,key='icon'){
 const palette=(Array.isArray(colors)?colors:[]).map(color=>typeof color==='string'?color:color?.hex).filter(hex=>/^#[0-9A-Fa-f]{6}$/.test(hex||'')).map(hex=>hex.toUpperCase());
 if(!palette.length)return neutralIconStyle();
 const offset=colorHash(`${key}:${palette.join(':')}`)%palette.length,pick=index=>palette[(offset+index)%palette.length];
 return {'--icon-ink':'#565A56','--icon-paper':'var(--bg)','--icon-c1':pick(0),'--icon-c2':pick(1),'--icon-c3':pick(2)};
}

const paint = {
  ink: {fill:'none',stroke:'var(--icon-ink, currentColor)','stroke-width':2.6},
  edge: {fill:'var(--icon-paper, transparent)',stroke:'var(--icon-ink, currentColor)','stroke-width':2.45},
  a: {fill:'var(--icon-c1, currentColor)',stroke:'var(--icon-ink, currentColor)','stroke-width':2.45},
  b: {fill:'var(--icon-c2, currentColor)',stroke:'var(--icon-ink, currentColor)','stroke-width':2.45},
  c: {fill:'var(--icon-c3, currentColor)',stroke:'var(--icon-ink, currentColor)','stroke-width':2.45}
};

export const ArtIcon = {
  name:'ArtIcon',
  inheritAttrs:false,
  props:{name:{type:String,required:true}},
  setup(props,{attrs}){
    const {h}=window.Vue;
    return ()=>h('svg',{
      ...attrs,
      class:['art-icon',attrs.class],
      xmlns:'http://www.w3.org/2000/svg',
      viewBox:'0 0 64 64',
      width:'64',
      height:'64',
      preserveAspectRatio:'xMidYMid meet',
      focusable:'false'
    },(ICON_DEFINITIONS[props.name]||[]).map(([tag,part,geometry],index)=>h(tag,{
      ...paint[part],
      ...geometry,
      key:index,
      'stroke-linecap':'round',
      'stroke-linejoin':'round'
    })));
  }
};
