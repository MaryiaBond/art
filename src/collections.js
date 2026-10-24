export const COLLECTION_PAGE_SIZE=24;

export const visibleItems=(items,count)=>items.slice(0,Math.max(COLLECTION_PAGE_SIZE,count||COLLECTION_PAGE_SIZE));
export const nextVisibleCount=(count,total)=>Math.min(total,(count||COLLECTION_PAGE_SIZE)+COLLECTION_PAGE_SIZE);

export function artworkYear(value){
 const text=String(value||''),match=text.match(/\d{3,4}/);
 if(!match)return 0;
 const year=Number(match[0]);
 return /до н\.\s*э\./i.test(text)?-year:year;
}

export function colorFamily(hex){
 const value=String(hex||'').replace('#','');
 if(!/^[0-9a-f]{6}$/i.test(value))return'neutral';
 const [r,g,b]=[0,2,4].map(index=>parseInt(value.slice(index,index+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
 const light=(max+min)/2,saturation=delta===0?0:delta/(1-Math.abs(2*light-1));
 if(saturation<.16||light<.12||light>.9)return'neutral';
 let hue=0;
 if(delta){hue=max===r?60*(((g-b)/delta)%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(hue<0)hue+=360}
 if(hue<18||hue>=345)return'red';
 if(hue<48)return'orange';
 if(hue<72)return'yellow';
 if(hue<165)return'green';
 if(hue<205)return'cyan';
 if(hue<260)return'blue';
 if(hue<300)return'violet';
 if(hue<345)return'pink';
 return'neutral';
}

export const spectrumValue=hex=>{
 const order=['red','orange','yellow','green','cyan','blue','violet','pink','neutral'];
 return order.indexOf(colorFamily(hex));
};
