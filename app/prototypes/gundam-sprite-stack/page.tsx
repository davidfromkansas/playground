"use client";
import { useEffect, useRef, useState } from "react";
import standing from "./slices.png";
import walking from "./walk.png";
import battle from "./battle.png";
import flight from "./flight.png";
import stunt from "./choreography.png";
import { drawScene } from "./render";
import { duration, labels, sample, type Move, type Selection, type Sheet } from "./sequence";
import "./stage.css";

const sources = {stand:standing, walk:walking, battle, flight, stunt};
const defaults = {angle:47,squash:.75,spacing:1};
type Camera = typeof defaults;
const key="playground:gundam-stack:v1";
const moves=Object.keys(labels) as Move[];
const ranges={angle:[0,360,1],squash:[.4,1,.05],spacing:[0,2,.05]} as const;
export default function GundamStack(){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [sheets,setSheets]=useState<Record<Sheet,HTMLImageElement>>();
  const [error,setError]=useState(false);
  const [mode,setMode]=useState<Selection>("stand");
  const [paused,setPaused]=useState(false);
  const [spin,setSpin]=useState(false);
  const [camera,setCamera]=useState<Camera>(defaults);
  const [controls,setControls]=useState(false);
  const [seconds,setSeconds]=useState(0);
  const elapsed=useRef(0),heading=useRef(defaults.angle);
  useEffect(()=>{
    let alive=true;
    async function load(){
      const result={} as Record<Sheet,HTMLImageElement>;
      await Promise.all((Object.keys(sources) as Sheet[]).map(async k=>{
        const im=new Image();im.src=sources[k].src;await im.decode();result[k]=im;
      }));
      if(alive){setSheets(result);if(!matchMedia("(prefers-reduced-motion: reduce)").matches)setMode("walk");}
    }
    load().catch(()=>{if(alive)setError(true);});
    try{
      const value=JSON.parse(localStorage.getItem(key)||"null");
      if(value&&(Object.keys(ranges) as (keyof Camera)[]).every(k=>Number.isFinite(value[k])&&value[k]>=ranges[k][0]&&value[k]<=ranges[k][1])){
        setCamera(value);heading.current=value.angle;
      }
    }catch{}
    return ()=>{alive=false;};
  },[]);
  function change(next:Camera){
    heading.current=next.angle;setCamera(next);
    try{localStorage.setItem(key,JSON.stringify(next));}catch{}
  }
  function play(next:Selection){elapsed.current=0;setSeconds(0);setPaused(false);setMode(next);
    // A repeated click also repaints a completed demo.
    if(next===mode)setReplay(n=>n+1);
  }
  const [replay,setReplay]=useState(0);
  useEffect(()=>{
    const g=canvas.current?.getContext("2d");if(!g||!sheets)return;
    let id=0,last:number|undefined;
    function paint(now:number){
      const delta=last===undefined?0:(now-last)/1000;last=now;
      if(!paused)elapsed.current+=delta;
      if(spin&&mode!=="demo")heading.current=(heading.current+delta*45)%360;
      const t=Math.min(elapsed.current,duration[mode]);
      const f=sample(mode,t,heading.current);
      drawScene(g!,sheets![f.sheet],f,camera.squash,camera.spacing,t);
      if(mode==="demo")setSeconds(Math.floor(t));
      if(t>=duration[mode]){
        if(mode!=="demo"){elapsed.current=0;setMode("stand");}
        return;
      }
      if(spin||(!paused&&mode!=="stand"))id=requestAnimationFrame(paint);
    }
    id=requestAnimationFrame(paint);return ()=>cancelAnimationFrame(id);
  },[sheets,mode,paused,spin,camera,replay]);
  return <main className="hangar-page">
    <header><h1>Hangar Exit</h1><span>RX-78-2 Gundam</span></header>
    <section className="hangar-stage" data-thumbnail><canvas ref={canvas} width={400} height={224} aria-label="Gundam animation inside hangar 07"/>
      {!sheets&&<div className="hangar-loading">{error?"Sprite sheets failed to load. Reload to retry.":"Loading sprite sheets…"}</div>}</section>
    <div className="hangar-playback">
      <button className="hangar-demo" disabled={!sheets} onClick={()=>play("demo")}>{mode==="demo"?"Replay demo":"Play demo"}</button>
      <span className="hangar-clock">{mode==="demo"?`0:${String(seconds).padStart(2,"0")} / 0:30`:"30 seconds"}</span>
      {mode!=="stand"&&!(mode==="demo"&&seconds===30)&&<button onClick={()=>setPaused(!paused)}>{paused?"Resume":"Pause"}</button>}
    </div>
    <section><h2>Movements</h2><div className="hangar-moves">{moves.map(move=><button key={move} disabled={!sheets} aria-pressed={mode===move} onClick={()=>play(move)}>{labels[move]}</button>)}</div></section>
    <button aria-expanded={controls} onClick={()=>setControls(!controls)}>Camera &amp; stack</button>
    {controls&&<div className="hangar-settings">
      <button onClick={()=>setControls(false)}>Done</button>
      <button disabled={mode==="demo"} onClick={()=>{change({...camera,angle:Math.round(heading.current)%360});setSpin(!spin);}}>{spin?"Stop rotation":"Rotate view"}</button>
      {(Object.keys(ranges) as (keyof Camera)[]).map(k=><label key={k}>{k}<output>{k==="angle"&&(spin||mode==="demo")?"Auto":camera[k]}</output>
        <input type="range" disabled={k==="angle"&&mode==="demo"} min={ranges[k][0]} max={ranges[k][1]} step={ranges[k][2]} value={camera[k]} onChange={e=>{if(k==="angle")setSpin(false);change({...camera,angle:Math.round(heading.current)%360,[k]:Number(e.target.value)});}}/></label>)}
      <button onClick={()=>change(defaults)}>Reset</button><button onClick={()=>change({...camera,angle:Math.floor(Math.random()*360)})}>Randomize</button>
    </div>}
  </main>;
}
