const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export const rgbToHex=(red,green,blue)=>`#${[red,green,blue].map(value=>clamp(Math.round(value),0,255).toString(16).padStart(2,'0')).join('')}`.toUpperCase();

export function mapPointerToImage({clientX,clientY,rect,naturalWidth,naturalHeight}){
 if(!rect||rect.width<=0||rect.height<=0||naturalWidth<=0||naturalHeight<=0)return null;
 const x=(clientX-rect.left)/rect.width,y=(clientY-rect.top)/rect.height;
 if(x<0||x>1||y<0||y>1)return null;
 return{x:clamp(Math.floor(x*naturalWidth),0,naturalWidth-1),y:clamp(Math.floor(y*naturalHeight),0,naturalHeight-1),relativeX:x,relativeY:y};
}

const distance=(left,right)=>Math.hypot(left.clientX-right.clientX,left.clientY-right.clientY);
const sameOrigin=value=>{try{return new URL(value,location.href).origin===location.origin}catch{return false}};
const proxyUrl=value=>`/.netlify/functions/image-proxy?url=${encodeURIComponent(new URL(value,location.href).href)}`;

export const ArtworkViewer={
 name:'ArtworkViewer',
 props:{artwork:{type:Object,required:true}},
 emits:['close','save-color','image-error'],
 setup(props,{emit}){
  const {ref,computed,watch,onMounted,onBeforeUnmount,nextTick}=window.Vue;
  const dialog=ref(null),stage=ref(null),displayImage=ref(null),magnifier=ref(null),scale=ref(1),panX=ref(0),panY=ref(0),picker=ref(false),pixelReady=ref(false),pixelError=ref(''),sample=ref(null),sampleMethod=ref(''),pointers=new Map();
  let samplerImage=null,startPan=null,pinch=null,previousOverflow='',lastFocused=null,proxyObjectUrl='';
  const source=computed(()=>props.artwork.imageSource||props.artwork.imageUrl||props.artwork.image);
  const displaySource=ref(source.value);
  const imageStyle=computed(()=>({transform:`translate3d(${panX.value}px,${panY.value}px,0) scale(${scale.value})`}));
  const stageClass=computed(()=>({'is-picker':picker.value,'is-zoomed':scale.value>1}));
  const magnifierStyle=computed(()=>sample.value?{left:`${clamp(sample.value.stageX+18,8,Math.max(8,(stage.value?.clientWidth||96)-94))}px`,top:`${clamp(sample.value.stageY-92,8,Math.max(8,(stage.value?.clientHeight||96)-94))}px`}:{});

  function setScale(value,origin=null){const next=clamp(value,1,8);if(origin&&stage.value&&scale.value!==next){const rect=stage.value.getBoundingClientRect(),cx=origin.clientX-rect.left-rect.width/2,cy=origin.clientY-rect.top-rect.height/2,ratio=next/scale.value;panX.value=(panX.value-cx)*ratio+cx;panY.value=(panY.value-cy)*ratio+cy}scale.value=next;if(next===1){panX.value=0;panY.value=0}}
  const zoomIn=()=>setScale(scale.value*1.35);
  const zoomOut=()=>setScale(scale.value/1.35);
  function resetView(){scale.value=1;panX.value=0;panY.value=0}
  function close(){emit('close')}
  function keydown(event){if(event.key==='Escape'){event.preventDefault();close()}else if(event.key==='+'||event.key==='=')zoomIn();else if(event.key==='-')zoomOut()}
  function wheel(event){event.preventDefault();setScale(scale.value*(event.deltaY<0?1.16:0.86),event)}

  async function loadSampler(source,{proxied=false}={}){
   return new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>{image.src='';reject(Error('image-timeout'))},proxied?10000:8000),done=callback=>value=>{clearTimeout(timer);callback(value)};if(!sameOrigin(source))image.crossOrigin='anonymous';image.decoding='async';image.onload=done(()=>{try{const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,1,1);context.getImageData(0,0,1,1);samplerImage=image;sampleMethod.value=proxied?'proxy':'direct-cors';pixelReady.value=true;pixelError.value='';resolve()}catch(error){reject(error)}});image.onerror=done(()=>reject(Error('image-load')));image.src=source});
  }
  async function prepareSampler(){pixelReady.value=false;pixelError.value='';samplerImage=null;try{await loadSampler(source.value)}catch{try{const response=await fetch(proxyUrl(source.value),{cache:'no-store'});if(!response.ok)throw Error('proxy');const blob=await response.blob();proxyObjectUrl&&URL.revokeObjectURL(proxyObjectUrl);proxyObjectUrl=URL.createObjectURL(blob);await loadSampler(proxyObjectUrl,{proxied:true})}catch{pixelError.value='Источник изображения не разрешает безопасно считывать пиксели. Можно продолжить просмотр без пипетки.'}}}
  function togglePicker(){picker.value=!picker.value;sample.value=null;if(picker.value&&!pixelReady.value&&!pixelError.value)prepareSampler()}
  function drawMagnifier(point){const canvas=magnifier.value;if(!canvas||!samplerImage)return;const context=canvas.getContext('2d'),size=18,half=Math.floor(size/2),sx=clamp(point.x-half,0,Math.max(0,samplerImage.naturalWidth-size)),sy=clamp(point.y-half,0,Math.max(0,samplerImage.naturalHeight-size));context.clearRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=false;context.drawImage(samplerImage,sx,sy,Math.min(size,samplerImage.naturalWidth),Math.min(size,samplerImage.naturalHeight),0,0,canvas.width,canvas.height);context.strokeStyle='#fff';context.lineWidth=2;context.strokeRect(canvas.width/2-5,canvas.height/2-5,10,10);context.strokeStyle='#242624';context.lineWidth=1;context.strokeRect(canvas.width/2-6,canvas.height/2-6,12,12)}
  function readPixel(event){if(!picker.value||!pixelReady.value||!samplerImage||!displayImage.value)return;const point=mapPointerToImage({clientX:event.clientX,clientY:event.clientY,rect:displayImage.value.getBoundingClientRect(),naturalWidth:samplerImage.naturalWidth,naturalHeight:samplerImage.naturalHeight});if(!point)return;try{const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(samplerImage,point.x,point.y,1,1,0,0,1,1);const [red,green,blue]=context.getImageData(0,0,1,1).data,stageRect=stage.value.getBoundingClientRect();sample.value={...point,hex:rgbToHex(red,green,blue),stageX:event.clientX-stageRect.left,stageY:event.clientY-stageRect.top};nextTick(()=>drawMagnifier(point))}catch{pixelReady.value=false;pixelError.value='Не удалось прочитать пиксель этого изображения.'}}
  function pointerDown(event){stage.value?.setPointerCapture?.(event.pointerId);pointers.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});if(picker.value){readPixel(event);return}if(pointers.size===1)startPan={clientX:event.clientX,clientY:event.clientY,panX:panX.value,panY:panY.value};else if(pointers.size===2){const pair=[...pointers.values()];pinch={distance:distance(pair[0],pair[1]),scale:scale.value}}}
  function pointerMove(event){if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});if(picker.value){readPixel(event);return}if(pointers.size===2&&pinch){const pair=[...pointers.values()];setScale(pinch.scale*distance(pair[0],pair[1])/Math.max(1,pinch.distance));return}if(scale.value>1&&startPan){panX.value=startPan.panX+event.clientX-startPan.clientX;panY.value=startPan.panY+event.clientY-startPan.clientY}}
  function pointerEnd(event){pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;if(!pointers.size)startPan=null}
  function save(){if(!sample.value)return;emit('save-color',{hex:sample.value.hex,x:sample.value.relativeX,y:sample.value.relativeY,method:sampleMethod.value});sample.value=null}
  function displayError(event){emit('image-error',event)}

  watch(source,value=>{displaySource.value=value;pixelReady.value=false;pixelError.value='';samplerImage=null});
  onMounted(()=>{lastFocused=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';window.addEventListener('keydown',keydown);nextTick(()=>dialog.value?.focus())});
  onBeforeUnmount(()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',keydown);proxyObjectUrl&&URL.revokeObjectURL(proxyObjectUrl);lastFocused?.isConnected&&lastFocused.focus()});
  return{dialog,stage,displayImage,magnifier,scale,picker,pixelReady,pixelError,sample,sampleMethod,displaySource,imageStyle,stageClass,magnifierStyle,zoomIn,zoomOut,resetView,close,wheel,togglePicker,pointerDown,pointerMove,pointerEnd,displayError,save};
 },
 template:`<div class="artwork-viewer-backdrop" @click.self="close"><section ref="dialog" class="artwork-viewer" role="dialog" aria-modal="true" :aria-label="'Полноэкранный просмотр: '+artwork.title" tabindex="-1"><header><div><strong>{{artwork.title}}</strong><span>{{artwork.artist}}</span></div><button type="button" class="viewer-close" aria-label="Закрыть полноэкранный просмотр" @click="close">×</button></header><div ref="stage" class="viewer-stage" :class="stageClass" @wheel="wheel" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd" @pointercancel="pointerEnd"><img ref="displayImage" :src="displaySource" crossorigin="anonymous" :alt="artwork.title" draggable="false" :style="imageStyle" @error="displayError"><div v-if="picker&&sample" class="pixel-magnifier" :style="magnifierStyle"><canvas ref="magnifier" width="72" height="72" aria-hidden="true"></canvas><code>{{sample.hex}}</code></div></div><footer><div class="viewer-tools"><button type="button" @click="zoomOut" :disabled="scale<=1" aria-label="Уменьшить">−</button><button type="button" @click="resetView" aria-label="Сбросить масштаб">{{Math.round(scale*100)}}%</button><button type="button" @click="zoomIn" :disabled="scale>=8" aria-label="Увеличить">+</button></div><button type="button" class="viewer-picker" :class="{active:picker}" :aria-pressed="String(picker)" @click="togglePicker">Пипетка</button><div class="viewer-selection" aria-live="polite"><template v-if="picker&&pixelError"><span>{{pixelError}}</span></template><template v-else-if="picker&&sample"><i :style="{background:sample.hex}"></i><code>{{sample.hex}}</code><button type="button" @click="save">Сохранить оттенок</button></template><template v-else-if="picker"><span>{{pixelReady?'Коснись изображения, чтобы выбрать цвет':'Подготавливаем изображение…'}}</span></template><span v-else>Колесо или жест двумя пальцами · перетаскивание после увеличения</span></div></footer></section></div>`
};

// Display images must stay readable even when their museum does not allow CORS.
// Only the separate sampler created by loadSampler requests anonymous CORS.
ArtworkViewer.template=ArtworkViewer.template.replace(' crossorigin="anonymous"','');
