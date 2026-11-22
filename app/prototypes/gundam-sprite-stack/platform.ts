type Point = readonly [number, number, number?];
type DeckPoint = readonly [number,number];

// Orthographic camera at 45° azimuth and 35.264° elevation. All three projected axes have equal length.
export function projectDeck([x,y,z=0]: Point): [number,number] {
  return [200+(x-y)*Math.sqrt(3)/2,140+(x+y)*.5-z];
}
const rim: DeckPoint[]=[[-94,-31],[-44,-81],[67,-81],[94,-54],[94,31],[44,81],[-67,81],[-94,54]];
const opponent=[28,59] as const;
export function hostileOrigin(w:number,h:number) {return [opponent[0]*w/400,opponent[1]*h/224];}
export function spacePlatform(g:CanvasRenderingContext2D,scar:boolean) {
  const sky=g.createLinearGradient(0,0,400,224);
  sky.addColorStop(0,"#111930");sky.addColorStop(.6,"#090e22");sky.addColorStop(1,"#18182b");
  g.fillStyle=sky;g.fillRect(0,0,400,224);
  let seed=1782;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<147;i++){
    const x=Math.floor(random()*400),y=Math.floor(random()*224);
    g.fillStyle=i%9===0?"#c6d9ef":i%4===0?"#7787a4":"#444961";g.fillRect(x,y,1,1);
    if(i%41===0){g.fillRect(x-1,y,3,1);g.fillRect(x,y-1,1,3);}
  }
  // A banded, partially lit planet above the far rim.
  g.save();g.beginPath();g.arc(336,36,18,0,2*Math.PI);g.clip();
  const globe=g.createRadialGradient(325,25,1,341,40,25);
  globe.addColorStop(0,"#d5b1a0");globe.addColorStop(.40,"#bc8b8a");globe.addColorStop(.68,"#765d78");globe.addColorStop(1,"#25223b");
  g.fillStyle=globe;g.fillRect(317,17,38,38);
  for(const y of [26,29,37,39,43]){g.strokeStyle="rgba(72,53,79,.28)";g.lineWidth=y===39?2:1;g.beginPath();g.moveTo(316,y-3);g.quadraticCurveTo(337,y+6,355,y-1);g.stroke();}
  g.restore();
  function face(points:Point[],color:string){
    g.fillStyle=color;g.beginPath();
    points.forEach((p,i)=>{const [x,y]=projectDeck(p);if(i)g.lineTo(x,y);else g.moveTo(x,y);});
    g.closePath();g.fill();
  }
  function line(a:Point,b:Point,color:string,width=1){
    const [x,y]=projectDeck(a),[xx,yy]=projectDeck(b);
    g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();
  }
  function edge(a:DeckPoint,b:DeckPoint,t:number,z:number):Point{return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,z];}
  // Recessed underbody and ribbed vertical walls, rendered before the top plate.
  for(const depth of [-19,-13]){
    const inset=depth===-19?.90:1;
    const band=rim.map(([x,y])=>[x*inset,y*inset] as DeckPoint);
    band.forEach((a,i)=>{
      const b=band[(i+1)%band.length];
      if((b[1]-a[1])-(b[0]-a[0])<=0)return;
      const top=depth===-19?-10:0;
      face([edge(a,b,0,top),edge(a,b,1,top),edge(a,b,1,depth),edge(a,b,0,depth)],i<4?"#28384a":"#354454");
      line(edge(a,b,0,depth+1),edge(a,b,1,depth+1),"#101c2b",2);
      const count=Math.max(1,Math.floor(Math.hypot(b[0]-a[0],b[1]-a[1])/12));
      for(let j=0;j<count;j++){
        const l=(j+.12)/count,r=(j+.85)/count;
        face([edge(a,b,l,top-2),edge(a,b,r,top-2),edge(a,b,r,depth+3),edge(a,b,l,depth+3)],"#1c2938");
        if(depth===-13 && j%3===0)line(edge(a,b,l,top-5),edge(a,b,r,top-5),"#80cbd3",1.7);
      }
    });
  }
  face(rim,"#637480");
  g.save();g.clip();
  for(let x=-96;x<96;x+=16)for(let y=-96;y<84;y+=16){
    face([[x,y],[x+16,y],[x+16,y+16],[x,y+16]],["#5a6d79","#606f7b","#586976","#5f717e"][Math.floor(random()*4)]);
    line([x,y],[x+16,y],"#4b5d6b",.65);line([x,y],[x,y+16],"#485b69",.65);
    if(random()<.28){line([x+2,y+2],[x+6,y+2],"#84919a",.7);}
  }
  // Dashed guide rails run along the deck and give the landing skid a visible distance scale.
  for(const side of [-1,1])for(let i=-85;i<83;i+=15){
    line([i,side*40],[i+9,side*40],"#b6b5a5",1.5);
  }
  if(scar)line([-39,15],[-29,20],"#323d49",2);
  g.restore();
  rim.forEach((a,i)=>{
    const b=rim[(i+1)%rim.length];line(a,b,"#a9b6bd",1.4);
    const p=[a[0]*.94,a[1]*.94] as DeckPoint,q=[b[0]*.94,b[1]*.94] as DeckPoint;
    line(p,q,"#394a59",2);
    for(const t of [.16,.74])line(edge(p,q,t,0),edge(p,q,t+.07,0),"#e5b16b",2);
  });
  // A distant red contact gives the incoming shots a consistent origin.
  g.fillStyle="#525368";g.fillRect(20,58,15,2);g.fillRect(24,56,7,4);
  g.fillStyle="#ff9280";g.fillRect(opponent[0]-1,opponent[1]-1,3,2);
}
