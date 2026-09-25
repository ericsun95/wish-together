import { petImage } from '../pet-catalog';
import { BED, COINS, COUNTER, DOCK, GATE, ISLAND, PLATE, ROOM, SNACK, SWITCH, WALLS, gateOpen, isDocked, phase, type Game, type Point } from './game';
import type { Party } from './party';
import type { View } from './scene';
import { mapFrame, mapPick } from './map-camera';

/** Painterly top-down kitchen. Every solid footprint follows the game collision map. */
export function createMap(canvas: HTMLCanvasElement, zh: boolean, party: Party): View {
  const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Canvas unavailable');
  const c = ctx;
  let width=1,height=1,frame=mapFrame(1,1,1,BED),disposed=false;
  const images={cat:new Image(),dog:new Image()};
  for(const species of ['cat','dog'] as const) images[species].src=petImage(species,party[species].appearance);
  const palette={ink:'#314f49',sage:'#7d9d8c',cream:'#fff6df',wood:'#caa27b',gold:'#d89b36'};
  function box(x:number,y:number,w:number,h:number,fill:string,r=.1,stroke?:string){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.lineWidth=.035;c.strokeStyle=stroke;c.stroke();}}
  function oval(x:number,y:number,rx:number,ry:number,fill:string){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function line(points:number[][],color:string,lineWidth=.04){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=lineWidth;c.stroke();}
  function label(text:string,p:Point,color=palette.ink,bg='#fffaf0ed',size=11){
    c.save();c.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    c.font=`600 ${size}px system-ui`;const tw=c.measureText(text).width;
    const px=Math.max(tw/2+8,Math.min(width-tw/2-8,frame.left+p.x*frame.unit)),py=frame.top+p.z*frame.unit;
    if(py<0||py>height){c.restore();return;}
    c.fillStyle=bg;c.beginPath();c.roundRect(px-tw/2-7,py-10,tw+14,21,7);c.fill();c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(text,px,py+1);c.restore();
  }
  function paw(x:number,y:number,color:string){oval(x,y+.05,.095,.07,color);for(const [dx,dy]of[[-.12,-.06],[-.04,-.13],[.05,-.13],[.13,-.04]])oval(x+dx,y+dy,.037,.048,color);}
  function scenery(s:Game){
    box(-.13,-.13,14.26,10.26,'#a48163',.25);
    box(0,0,14,10,'#eedec2',.15);
    for(let z=0;z<10;z++)for(let x=0;x<14;x++)box(x+.015,z+.015,.97,.97,(x+z)%2?'#f4e6ce':'#e9d8b9',.025);
    // Pantry has its own wooden floor, separated by the actual half-walls.
    box(10.55,.4,3.05,6.9,'#dec4a0',.02);
    for(let z=.5;z<7.3;z+=.42)line([[10.58,z],[13.55,z]],'#cbae873e',.018);
    // Window and warm sun patch stay decorative, outside the walking corridor.
    c.save();c.globalAlpha=.3;c.fillStyle='#fffde1';c.beginPath();c.moveTo(3.2,.4);c.lineTo(5,.4);c.lineTo(7,3.5);c.lineTo(4.3,3.5);c.fill();c.restore();
    box(.2,.12,13.6,.22,'#bf9f7d',.04);box(.18,.12,.2,9.55,'#cab391',.04);box(13.6,.2,.18,9.5,'#cab391',.04);
    box(3.15,.04,2.6,.27,'#fff9e9',.04);box(3.25,.075,2.4,.17,'#b5d5d2',.01);line([[4.45,.05],[4.45,.3]],'#fff9e9',.065);
    const r=COUNTER;
    box(r.x+.07,r.z+.13,r.w,r.h,'#5a554535',.12);
    box(r.x,r.z,r.w,r.h,'#648777',.12);
    for(let x=r.x+.15;x<r.x+r.w-.2;x+=1.18){box(x,r.z+.1,1.03,1.39,'#83a08b',.08,'#5d8271');line([[x+.38,r.z+1.27],[x+.66,r.z+1.27]],'#e5c487',.06);}
    box(r.x-.03,r.z-.04,r.w+.06,.95,'#f8eed7',.12,'#e1cbae');
    box(1.05,.73,1.12,.65,'#526866',.14);box(1.17,.82,.88,.46,'#a6c1b8',.1);line([[1.67,.68],[1.67,.98],[1.47,.98]],'#bd945b',.07);
    box(5.02,.65,1.22,.66,'#394f4b',.08);for(const x of[5.34,5.92]){oval(x,.98,.2,.22,'#687772');oval(x,.98,.12,.13,'#394f4b');}
    box(2.55,.82,.67,.35,'#d8b38b',.06);line([[2.67,.95],[2.99,.95]],'#f6e6c2',.025);
    box(8.76,.525,1.18,1.45,'#61868d',.1,'#476970');box(8.87,.65,.96,.9,'#a6c4bd',.08);line([[8.92,1.67],[9.76,1.67]],'#355c62',.035);line([[9.57,.85],[9.57,1.15]],'#f8ebc8',.07);
    box(ISLAND.x+.07,ISLAND.z+.14,ISLAND.w,ISLAND.h,'#4e51472a',.12);box(ISLAND.x,ISLAND.z,ISLAND.w,ISLAND.h,'#6f9583',.12);box(ISLAND.x-.02,ISLAND.z-.01,ISLAND.w+.04,ISLAND.h-.24,'#e2bb90',.12,'#c19b72');
    oval(6.3,4.7,.37,.27,'#fff3d4');oval(6.3,4.7,.24,.17,'#bc8061');oval(6.21,4.67,.075,.06,'#eeb36b');oval(6.38,4.75,.09,.06,'#94b283');
    for(const wall of WALLS){box(wall.x+.04,wall.z+.08,wall.w,wall.h,'#65584430',.02);box(wall.x,wall.z,wall.w,wall.h,'#8aaf9b',.025);}
    // Readable open/closed gate and its matching pressure plate.
    if(!gateOpen(s)){box(GATE.x-.02,GATE.z,GATE.w+.04,GATE.h,'#d7a65c',.025);for(let z=GATE.z+.12;z<GATE.z+GATE.h;z+=.25)line([[GATE.x-.12,z],[GATE.x+.3,z]],'#98743f',.045);}
    else{line([[10.35,5.2],[10.35,6.9]],'#6bb497',.065);}
    oval(PLATE.x,PLATE.z,.64,.52,'#b4864244');oval(PLATE.x,PLATE.z,.57,.46,gateOpen(s)?'#6caa89':'#ddb574');paw(PLATE.x,PLATE.z,gateOpen(s)?'#fff7df':'#a67638');
    c.setLineDash([.11,.08]);c.strokeStyle=isDocked(s)?'#7caa87':'#c28b3a';c.lineWidth=.045;c.beginPath();c.ellipse(DOCK.x,DOCK.z,.55,.4,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
    oval(BED.x,BED.z,1.24,.91,'#547e6840');oval(BED.x,BED.z,1.16,.84,'#98b6a0');oval(BED.x,BED.z,.94,.63,'#f3dfb9');oval(BED.x-.48,BED.z-.18,.27,.22,'#fff1d0');
    for(const [x,z] of[[.9,9.35],[2.7,9.2]])paw(x,z,'#b8966c70');
    // Stool wheels and seat are distinct from the destination outline.
    for(const dx of[-.29,.29])for(const dz of[-.23,.23])oval(s.stool.x+dx,s.stool.z+dz,.08,.075,'#4d5b50');oval(s.stool.x,s.stool.z,.43,.35,'#b56f50');oval(s.stool.x,s.stool.z-.04,.37,.29,'#e8ab80');
    box(SWITCH.x-.24,SWITCH.z-.2,.48,.4,'#42564e',.06);oval(SWITCH.x,SWITCH.z,.15,.14,s.powered?'#82c398':'#e8b647');
    if(!s.snack){box(SNACK.x-.32,SNACK.z-.36,.64,.68,'#cb8e5f',.12);box(SNACK.x-.35,SNACK.z-.42,.7,.17,'#f3d6a6',.05);box(SNACK.x-.21,SNACK.z-.13,.42,.27,'#fff0cb',.05);paw(SNACK.x,SNACK.z+.02,'#ad7550');}
    COINS.forEach((p,i)=>{if(!s.coins[i]){oval(p.x,p.z,.21,.21,'#ce973c');oval(p.x,p.z-.02,.17,.17,'#f4d27c');paw(p.x,p.z,'#a37133');}});
  }
  return {
    resize(w,h){width=Math.max(1,w);height=Math.max(1,h);const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);},
    render(s,_dt,reduced,trail=[],zoom=1){
      if(disposed)return;frame=mapFrame(width,height,zoom,s.pets[s.active]);
      c.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);c.clearRect(0,0,width,height);
      const bg=c.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#e4e8d7');bg.addColorStop(1,'#cad8c9');c.fillStyle=bg;c.fillRect(0,0,width,height);
      c.translate(frame.left,frame.top);c.scale(frame.unit,frame.unit);scenery(s);
      if(s.powered){const p=s.robot;c.fillStyle=s.alert>40?'#df79554a':'#eac15c45';c.beginPath();c.moveTo(p.x,p.z);c.arc(p.x,p.z,2.7,Math.PI/2-p.heading-.87,Math.PI/2-p.heading+.87);c.closePath();c.fill();}
      oval(s.robot.x,s.robot.z+.06,.4,.35,'#334d4930');oval(s.robot.x,s.robot.z,.37,.34,'#3e5657');oval(s.robot.x,s.robot.z-.025,.3,.27,'#7b9691');oval(s.robot.x,s.robot.z,.09,.09,s.powered?'#e7ba63':'#c3d8c1');line([[s.robot.x+Math.sin(s.robot.heading)*.23,s.robot.z+Math.cos(s.robot.heading)*.23],[s.robot.x+Math.sin(s.robot.heading)*.33,s.robot.z+Math.cos(s.robot.heading)*.33]],'#fff4d5',.09);
      if(trail.length){c.setLineDash([.1,.13]);line([[s.pets[s.active].x,s.pets[s.active].z],...trail.map(p=>[p.x,p.z])],'#376f638f',.06);c.setLineDash([]);const end=trail[trail.length-1];oval(end.x,end.z,.19,.19,'#3b7d6c');oval(end.x,end.z,.08,.08,'#fff9e4');}
      const step=phase(s),goal=step===0?(s.grab?DOCK:s.stool):step===1?(s.pets.cat.y>0?SWITCH:DOCK):step===2?PLATE:step===3?SNACK:BED;
      if(!s.won){c.strokeStyle='#d28b2c';c.lineWidth=.045;c.beginPath();c.arc(goal.x,goal.z,.72+(reduced?0:Math.sin(s.elapsed*3)*.05),0,Math.PI*2);c.stroke();}
      const ordered=([...(['cat','dog'] as const)]).sort((a,b)=>s.pets[a].z-s.pets[b].z);
      for(const species of ordered){const p=s.pets[species],img=images[species];oval(p.x,p.z+.07,.42,.16,'#3c534332');if(s.active===species){c.strokeStyle='#326b5b';c.lineWidth=.06;c.beginPath();c.ellipse(p.x,p.z,.5,.25,0,0,Math.PI*2);c.stroke();}
        const h=1.18,w=img.naturalWidth?Math.min(1.5,h*img.naturalWidth/img.naturalHeight):h;
        if(img.complete&&img.naturalWidth)c.drawImage(img,p.x-w/2,p.z-h+.12,w,h);else paw(p.x,p.z,'#4c7968');
        if(species==='cat'&&s.snack){box(p.x+.25,p.z-.3,.23,.27,'#c68a56',.04);}
      }
      label(zh?'厨房操作台':'KITCHEN', {x:4.5,z:.4},'#5d7869','#f4eddaee',10);
      label(zh?'储藏间':'PANTRY',{x:12.1,z:.75},'#8c7051','#f9eed7ee',10);
      label(zh?'小窝':'HOME',{x:BED.x,z:9.35},'#557b62','#fff5e0ee',10);
      if(!s.won){const names=zh?[s.grab?'推到这里':'移动小凳子',s.pets.cat.y>0?'按下电源':'从凳子爬上去','狗狗守住门垫','取回零食','带伙伴回家']: [s.grab?'Park here':'Move the stool',s.pets.cat.y>0?'Power on':'Climb from here','Dog holds the pad','Fetch treats','Both pets go home'];label(`${step+1} · ${names[step]}`,{x:goal.x,z:goal.z+.85},'#916326','#fff4d6f2',11);}
      for(const species of ordered){const p=s.pets[species];label(party[species].name,{x:p.x,z:p.z+.36},species===s.active?'#fff8e6':'#426654',species===s.active?'#3b715fed':'#fff8e6ed',10);}
    },
    pick(x,y){return mapPick(frame,width,height,x,y);},
    dispose(){disposed=true;for(const img of Object.values(images))img.src='';},
  };
}
