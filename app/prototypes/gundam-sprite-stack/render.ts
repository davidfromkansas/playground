import { hostileOrigin, projectDeck, spacePlatform } from "./platform";
import type { Frame } from "./sequence";

export function drawScene(g:CanvasRenderingContext2D, image:HTMLImageElement, f:Frame, squash:number, spacing:number, seconds:number) {
  const h=Math.max(224,Math.ceil(56+166*spacing)), w=Math.round(h*400/224);
  if(g.canvas.width!==w||g.canvas.height!==h){g.canvas.width=w;g.canvas.height=h;}
  g.resetTransform();g.imageSmoothingEnabled=false;
  g.save();g.scale(w/400,h/224);spacePlatform(g,f.scar);g.restore();
  const deck=projectDeck([f.x*.72,-f.x*.44,0]);
  const cx=Math.round(deck[0]*w/400), floor=Math.round(deck[1]*h/224);
  const scale=.81, cy=floor-Math.round(f.lift*spacing*scale);
  const a=f.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const source=hostileOrigin(w,h);
  function project(p:number[]) {return [Math.round(cx+scale*(c*p[0]-s*p[1])),Math.round(cy+scale*(squash*(s*p[0]+c*p[1])-spacing*p[2]))];}
  function line(from:number[],to:number[],color:string,width:number) {
    g.beginPath();g.strokeStyle=color;g.lineWidth=width;g.moveTo(from[0],from[1]);g.lineTo(to[0],to[1]);g.stroke();
  }
  const r=(29-f.shadow*.22)*scale;g.fillStyle="rgba(9,21,31,.46)";g.beginPath();g.ellipse(cx,floor,r,r*squash*.44,0,0,Math.PI*2);g.fill();
  if(f.skid)for(let i=0;i<14;i++){
    const k=(seconds*3+i*.31)%1;
    g.fillStyle=i%3?"#b4a48b":"#f4c074";g.fillRect(Math.round(cx-16-k*45*f.skid),Math.round(floor+4-Math.sin(k*Math.PI)*10),2,1);
  }
  if(f.miss){
    const target=projectDeck([-34,17,0]);
    const end=seconds<10?[target[0]*w/400,target[1]*h/224]:[w*.76,h*.63];
    line(source,end,"#ff785f",2*f.miss+1);
  }
  function plane(z:number){g.setTransform(c*scale,squash*s*scale,-s*scale,squash*c*scale,cx,cy-Math.round(z*spacing*scale));}
  if(f.slices){
    for(const [x,y,sw,sh,ox,oy,z] of f.slices){plane(z);g.drawImage(image,x,y,sw,sh,ox,oy,sw,sh);}
  }else{
    const sw=image.naturalWidth/126, sh=image.naturalHeight;
    for(let z=0;z<126;z++){plane(z);g.drawImage(image,z*sw,0,sw,sh,-sw/2,-sh/2,sw,sh);}
  }
  g.resetTransform();
  if(f.muzzle){
    const [tip,grip,shield,eyes]=f.muzzle.map(project);
    if(f.beam){
      const dx=tip[0]-grip[0],dy=tip[1]-grip[1],end=[tip[0]+dx*16*f.beam,tip[1]+dy*16*f.beam];
      line(tip,end,"#fc69a8",4);line(tip,end,"#fff5df",1.5);
    }
    if(f.hit){
      line(source,shield,"#ff8665",3*f.hit);
      for(let i=0;i<12;i++){
        const t=i*2.399,rad=(10+(i%4)*4)*f.hit;
        line(shield,[shield[0]+Math.cos(t)*rad,shield[1]+Math.sin(t)*rad],"#ffdd94",1+i%2);
      }
    }
    if(f.eyes>.1){g.fillStyle="#fff8b7";g.fillRect(eyes[0]-3,eyes[1],6,1);}
  }
  if(f.flash){g.fillStyle="rgba(255,220,155,"+(.42*f.flash)+")";g.fillRect(0,0,w,h);}
  if(f.blackout){g.fillStyle="rgba(3,7,11,"+f.blackout+")";g.fillRect(0,0,w,h);}
}
