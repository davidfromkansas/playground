import walk from "./walk-rects.json";
import battle from "./battle-poses.json";
import flight from "./flight-poses.json";
import stunt from "./choreography.json";

export const labels = {
  stand: "Stand", look: "Head tracking", walk: "Walk", guard: "Defend", impact: "Shield impact",
  fly: "Fly", boost: "Lateral boost", twist: "Airborne twist & fire", attack: "Attack", skid: "Landing skid",
};
export type Move = keyof typeof labels;
export type Selection = Move | "demo";
export type Sheet = "stand" | "walk" | "battle" | "flight" | "stunt";
export const duration: Record<Selection, number> = {
  demo: 30, stand: Infinity, walk: Infinity, attack: 1.4, guard: 1.8,
  fly: 2.3, look: 2.7, impact: 2.3, boost: 2.5, twist: 2.6, skid: 2.7,
};
export type Frame = {
  move: Move; sheet: Sheet; slices?: number[][]; x: number; lift: number; shadow: number;
  heading: number; beam: number; hit: number; muzzle?: number[][];
  skid: number; flash: number; blackout: number; eyes: number; scar: boolean; miss: number;
};
export function ease(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t*t*(3-2*t);
}
function ramp(t: number, a: number, b: number) { return ease((t-a)/(b-a)); }
function at(ids: number[], u: number) {
  return ids[Math.min(ids.length-1, Math.max(0, Math.floor(u*ids.length)))];
}

export function sample(selection: Selection, time: number, angle: number): Frame {
  const demo = selection === "demo";
  let move: Move = demo ? "stand" : selection;
  let phase = demo ? 0 : Math.min(1, time/duration[selection]);
  let x=0, lift=0, heading=angle, miss=0, flash=0, eyes=0;
  const t=time;
  if (demo) {
    // The camera stays fixed. The suit turns to walk along the deck, then banks and returns fire.
    heading=33-83*ramp(t,3.5,4.3)+83*ramp(t,7.45,8.04)+114*ramp(t,10.5,15.8)-122*ramp(t,16.4,19.55)+8*ramp(t,23,27);
    x=-50+27*ramp(t,4,7.65)-8*ramp(t,8.9,9.35)+78*ramp(t,14.15,17.4)+13*ramp(t,17,22)+22*ramp(t,22,26.7);
    if(t<.65){move="stand";}
    else if(t<4){move="look";phase=ramp(t,.8,3.8);eyes=ramp(t,.60,.9)*(1-ramp(t,1.1,1.5));}
    else if(t<8){move="walk";phase=Math.min(t-4,3.55)/1.44;miss=ramp(t,7.32,7.55)*(1-ramp(t,7.62,7.76));}
    else if(t<9.05){move="guard";phase=.34*ramp(t,8,8.8);}
    else if(t<10.9){move="impact";phase=(t-9.05)/1.85;}
    else if(t<12){move="attack";phase=(t-10.9)/1.1;}
    else if(t<14.15){move="fly";phase=.34*ramp(t,12,14.15);}
    else if(t<17){move="boost";phase=(t-14.15)/2.85;lift=29;miss=ramp(t,15.55,15.72)*(1-ramp(t,15.76,15.94));}
    else if(t<22){move="twist";phase=(t-17)/5;lift=29;}
    else if(t<27){move="skid";phase=(t-22)/5;}
    else {move="look";phase=.75*ramp(t,27,28.4);flash=ramp(t,28.81,28.88)*(1-ramp(t,28.88,29.02));}
  } else if(move==="walk") phase=t/1.44;

  const frame: Frame = {move,sheet:"stand",x,lift,shadow:lift,heading,
    beam:0,hit:0,skid:0,miss,flash,eyes,blackout:demo?ramp(t,29.36,29.96):0,scar:demo&&t>7.54};
  if(move==="stand") return frame;
  if(move==="walk"){frame.sheet="walk";frame.slices=walk[Math.floor((phase%1)*walk.length)];return frame;}
  if(move==="guard"||move==="attack"){
    frame.sheet="battle";frame.slices=battle.rects[at(battle[move],phase)];return frame;
  }
  if(move==="fly"){
    const id=at(flight.fly,phase);frame.sheet="flight";frame.slices=flight.rects[id];frame.shadow=flight.altitude[id];return frame;
  }
  let progress=phase;
  switch(move){
    case "look":
      progress=demo?phase:ramp(phase,0,.54)*(1-ramp(phase,.70,1)); break;
    case "impact":
      progress=phase<.13 ? ramp(phase,0,.13)*.20 : .20+.8*ramp(phase,.32,1);
      frame.hit=ramp(phase,0,.028)*(1-ramp(phase,.04,.20));
      if(!demo)frame.x=-8*ramp(phase,0,.13);break;
    case "boost":
      frame.lift=demo?29:29*ramp(phase,0,.23);
      if(!demo)frame.x=-37+74*ramp(phase,.12,.87);
      break;
    case "twist":
      frame.lift=29;
      progress=phase<.52 ? .4*ramp(phase,0,.48) : .4+.6*ramp(phase,.52,1);
      frame.beam=ramp(phase,.51,.535)*(1-ramp(phase,.545,.62));
      break;
    case "skid":
      frame.lift=29*(1-ramp(phase,0,.39));
      if(!demo)frame.x=-30+57*ramp(phase,.04,.90);
      frame.skid=ramp(phase,.30,.41)*(1-ramp(phase,.57,.85));break;
  }
  const id=at(stunt.moves[move],progress);
  frame.sheet="stunt";frame.slices=stunt.rects[id];frame.shadow=frame.lift;
  frame.muzzle=stunt.muzzles[id];
  return frame;
}
