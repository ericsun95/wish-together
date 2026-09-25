import type { Point } from './game';
export type MapFrame={unit:number;left:number;top:number};
export function mapFrame(width:number,height:number,zoom:number,focus:Point):MapFrame {
  const unit=Math.min(Math.max(1,width)/14.8,Math.max(1,height)/10.8)*Math.max(1,Math.min(2,zoom));
  const axis=(size:number,world:number,center:number)=>world*unit<=size?(size-world*unit)/2:Math.max(size-world*unit-10,Math.min(10,size/2-center*unit));
  return {unit,left:axis(width,14,focus.x),top:axis(height,10,focus.z)};
}
export function mapPick(frame:MapFrame,width:number,height:number,x:number,y:number):Point|null {
  const p={x:(x*width-frame.left)/frame.unit,z:(y*height-frame.top)/frame.unit};
  return p.x>=.4&&p.x<=13.6&&p.z>=.4&&p.z<=9.6?p:null;
}
