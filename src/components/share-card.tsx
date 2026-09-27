'use client';
import { useEffect, useState } from 'react';
import { LifeModal } from './life-ui';
import { supabase } from '@/lib/supabase';
import { downloadBlob } from '@/lib/space-export';
export type ShareContent={title:string;note?:string;date?:string;address?:string;photoPath?:string};
export function ShareCard({content,zh,onClose}:{content:ShareContent;zh:boolean;onClose:()=>void}) {
  const [image,setImage]=useState(''),[blob,setBlob]=useState<Blob|null>(null),[includePlace,setIncludePlace]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true,url='';setBlob(null);setImage('');setError('');async function draw(){
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=content.photoPath?1350:1080;const ctx=canvas.getContext('2d');if(!ctx)throw Error();
    ctx.fillStyle='#f8f4ee';ctx.fillRect(0,0,1080,canvas.height);ctx.fillStyle='#e8dfd3';ctx.fillRect(48,48,984,canvas.height-96);ctx.fillStyle='#fffdf9';ctx.fillRect(51,51,978,canvas.height-102);
    ctx.fillStyle='#846d58';ctx.font='22px sans-serif';ctx.fillText('WISH TOGETHER  /  LITTLE MOMENTS',100,120);
    if(!content.photoPath){ctx.strokeStyle='#e9ded0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(960,900,175,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(960,900,145,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#b89376';ctx.font='38px serif';ctx.fillText('♡',100,245);}
    let y=content.photoPath?240:365;
    if(content.photoPath){const result=await supabase?.storage.from('couple-memories').download(content.photoPath);if(!result?.data||result.error)throw Error('photo');const picture=await createImageBitmap(result.data);const scale=Math.min(880/picture.width,610/picture.height);const w=picture.width*scale,h=picture.height*scale;ctx.drawImage(picture,(1080-w)/2,165+(610-h)/2,w,h);picture.close();y=840;}
    const lines=(text:string,size:number,max:number)=>{ctx.font=`${size}px sans-serif`;const rows:string[]=[];let line='';for(const ch of text){if(ch==='\n'||ctx.measureText(line+ch).width>880){rows.push(line);line=ch==='\n'?'':ch;}else line+=ch;}rows.push(line);rows.slice(0,max).forEach((row,i)=>{let value=row;if(i===max-1&&rows.length>max){while(ctx.measureText(value+'…').width>880)value=value.slice(0,-1);value+='…';}ctx.fillText(value,100,y);y+=size*1.5;});};
    ctx.fillStyle='#372f2a';lines(content.title,content.photoPath?42:60,content.photoPath?2:3);y+=22;
    ctx.fillStyle='#776a60';if(content.note)lines(content.note,30,content.photoPath?3:5);
    ctx.font='24px sans-serif';ctx.fillStyle='#887562';ctx.fillText((content.date||'')+(includePlace&&content.address?`  ·  ${content.address.slice(0,32)}`:''),100,canvas.height-140);
    const b=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error()),'image/png'));url=URL.createObjectURL(b);if(active){setBlob(b);setImage(url);}else URL.revokeObjectURL(url);
  }void draw().catch(()=>{if(active)setError(zh?'卡片生成失败，请检查网络后重试。':'Could not create the card. Check your connection and retry.');});return()=>{active=false;if(url)URL.revokeObjectURL(url);};},[content,includePlace,zh]);
  async function share(){if(!blob)return;const file=new File([blob],'wish-together.png',{type:'image/png'});try{if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:content.title});else downloadBlob(blob,'wish-together.png');}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError(zh?'分享未完成，可以保存图片后分享。':'Sharing did not finish. Save the image to share it.');}}
  return <LifeModal title={zh?'分享卡片':'Share card'} onClose={onClose}><p className="life-muted">{zh?'先预览，再保存或分享；只包含卡片上看到的内容。':'Preview before saving or sharing. Only the visible card is included.'}</p>{content.address&&<label className="check-label"><input type="checkbox" checked={includePlace} onChange={e=>setIncludePlace(e.target.checked)}/>{zh?'卡片上显示地点':'Include the place'}</label>}{image?<img className="share-preview" src={image} alt={zh?'分享卡片预览':'Share card preview'}/>:!error&&<p role="status">{zh?'正在生成预览…':'Creating preview…'}</p>}{error&&<p role="alert">{error}</p>}<div className="utility-actions"><button className="primary" disabled={!blob} onClick={()=>blob&&downloadBlob(blob,'wish-together.png')}>{zh?'保存图片':'Save image'}</button><button className="secondary" disabled={!blob} onClick={()=>void share()}>{zh?'分享':'Share'}</button></div></LifeModal>;
}
