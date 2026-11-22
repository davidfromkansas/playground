// Painted at the canvas's logical pixel resolution. Coordinates describe a 400 × 224 camera.
export function hangar(g: CanvasRenderingContext2D, door: number, pan: number, scar: boolean) {
  function box(x:number,y:number,w:number,h:number,color:string) {
    g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
  }
  function poly(color:string, points:number[][]) {
    g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
  }
  box(0,0,400,224,"#142232");
  const bay=209+pan, opening=7+117*door;
  const gradient=g.createLinearGradient(0,12,0,145);
  gradient.addColorStop(0,"#495e7f");gradient.addColorStop(.62,"#bd8985");gradient.addColorStop(1,"#f3c68f");
  g.fillStyle=gradient;g.fillRect(bay-68,17,136,130);
  for(let i=0;i<13;i++) {
    const x=bay-68+i*11, height=12+((i*37)%29);
    box(x,139-height,10,height,"#52586b");box(x+2,141-height,2,3,"#e5b99a");
  }
  for(const s of [-1,1]){
    const x=s<0?bay-73:bay+opening/2;
    const w=73-opening/2;
    box(x,13,w,135,"#263b4c");
    for(let i=0;i<5;i++){box(x,22+i*25,w,2,"#142737");box(x,24+i*25,w,1,"#365064");}
    box(s<0?x+w-4:x,16,4,131,"#6b7880");
  }
  for(const [x,w] of [[0,bay-73],[bay+73,400-bay-73]]){
    box(x,0,w,146,"#1a2b3a");
    for(let n=0;n<w;n+=31){
      box(x+n,8,2,135,"#101d2a");box(x+n+3,9,1,134,"#314651");
      for(let j=0;j<3;j++)box(x+n+7,37+j*45,Math.min(19,w-n),2,"#233a49");
    }
    for(let i=0;i<4;i++){box(x+8,71+i*4,Math.min(w-9,33),2,"#111f2a");}
  }
  // Overhead truss, recessed lamps and the two door jambs.
  box(0,0,400,13,"#0e1c28");
  for(let x=-24;x<430;x+=43)poly("#2b404d",[[x,1],[x+5,1],[x+23,13],[x+17,13]]);
  for(let x=30;x<400;x+=81){box(x,12,30,4,"#0f1e2b");box(x+3,14,24,2,"#a2c6c3");}
  for(const x of [bay-78,bay+69]){
    box(x,15,9,134,"#101e2b");box(x+2,20,2,119,"#4b6170");
    for(let i=0;i<3;i++)box(x+4,61+i*5,3,2,"#e1a154");
  }
  const floor=g.createLinearGradient(0,144,0,224);
  floor.addColorStop(0,"#334651");floor.addColorStop(1,"#1a2a38");
  g.fillStyle=floor;g.fillRect(0,145,400,79);
  poly("#52606a",[[bay-opening/2,145],[bay+opening/2,145],[bay+opening/2-48,224],[bay-opening/2-106,224]]);
  for(const y of [150,161,183,215])box(0,y,400,1,"#293c47");
  for(let x=-300;x<720;x+=71)poly("#283b48",[[bay+(x-bay)*.29,145],[bay+(x-bay)*.29+1,145],[x+2,224],[x,224]]);
  for(let x=-20;x<420;x+=21)poly("#b8915a",[[x,151],[x+10,151],[x+6,154],[x-4,154]]);
  box(10,99,43,27,"#172735");box(12,100,39,1,"#52616a");
  g.font="bold 18px monospace";g.fillStyle="#718188";g.fillText("07",18,120);
  if(scar){box(51,71,12,2,"#ab674c");box(56,70,4,1,"#e2ab73");}
}
