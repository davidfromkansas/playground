"use client";
import { useEffect, useRef, useState } from "react";
import walk from "./walk.png";
import slices from "./slices.png";
import { drawStack } from "./render";

const defaults = { angle: 47, squash: 0.75, spacing: 1 };
const key = "playground:gundam-stack:v1";
export default function GundamStack() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [sheet, setSheet] = useState<HTMLImageElement>();
  const [error, setError] = useState(false);
  const [walkSheet, setWalkSheet] = useState<HTMLImageElement>();
  const [gait, setGait] = useState<"walk" | "freeze" | "stand">("stand");
  const elapsed = useRef(0);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState(defaults);
  const [panel, setPanel] = useState(false);
  const angle = useRef(defaults.angle);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setSheet(img);
    img.onerror = () => setError(true);
    img.src = slices.src;
    const animation = new Image();
    animation.onload = () => setWalkSheet(animation);
    animation.onerror = () => setError(true);
    animation.src = walk.src;
    setGait(matchMedia("(prefers-reduced-motion: reduce)").matches ? "stand" : "walk");
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved && saved.angle >= 0 && saved.angle <= 360 && saved.squash >= .4 && saved.squash <= 1 && saved.spacing >= 0 && saved.spacing <= 2 && Object.keys(defaults).every(k => Number.isFinite(saved[k]))) {
        setSettings(saved); angle.current = saved.angle;
      }
    } catch { /* Use defaults. */ }
    return () => { img.onload = null; img.onerror = null; animation.onload = null; animation.onerror = null; };
  }, []);
  function change(next: typeof defaults) {
    angle.current = next.angle; setSettings(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* In-memory state remains usable. */ }
  }
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !sheet) return;
    let frame = 0, previous = 0;
    function paint(time: number) {
      if (running && previous) angle.current = (angle.current + Math.min(80, time - previous) * .045) % 360;
      if (gait === "walk" && previous) elapsed.current = (elapsed.current + Math.min(80, time - previous)) % 1440;
      previous = time;
      const walking = gait !== "stand" && walkSheet;
      drawStack(ctx!, walking || sheet!, angle.current, settings.squash, settings.spacing,
        walking ? Math.floor(elapsed.current / 60) : undefined);
      if (running || gait === "walk") frame = requestAnimationFrame(paint);
    }
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [sheet, walkSheet, gait, running, settings]);
  const button = "min-h-11 rounded-lg border border-border bg-card px-4";
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
    <h1 className="text-3xl font-bold">RX-78-2 Gundam</h1>
    <div className="sm:flex sm:items-center sm:gap-6">
      <div data-thumbnail className="min-w-0 flex-1 overflow-hidden rounded-xl bg-muted"><canvas ref={canvas} width={180} height={180} aria-label="Animated pixel-art Gundam with shield and rifle" className="w-full [image-rendering:pixelated]" />{error && <p>Sprite sheet failed to load. Reload to retry.</p>}</div>
      <button className={button+" mt-3 sm:hidden"} onClick={() => setPanel(true)}>Adjust stack</button>
      <div className={(panel ? "fixed inset-x-0 bottom-0 z-50 rounded-t-xl border bg-background p-5 " : "hidden ")+"space-y-3 sm:static sm:block sm:w-48 sm:border-0"}>
        <div className="flex flex-wrap gap-2" aria-label="Gundam movement">
          <button className={button} onClick={() => setGait(gait === "walk" ? "freeze" : "walk")}>{gait === "walk" ? "Pause walk" : "Walk"}</button>
          <button className={button} onClick={() => { setGait("stand"); elapsed.current = 0; }}>Stand</button>
        </div>
        <button className={button} onClick={() => { change({...settings,angle:Math.round(angle.current)%360});setRunning(!running); }}>{running ? "Stop rotation" : "Rotate view"}</button>
        {(["angle","squash","spacing"] as const).map(k => <label key={k} className="block capitalize">{k} <output>{k==="angle" && running ? "Auto" : settings[k]}</output><input className="block h-11 w-full" type="range" min={k==="squash"?.4:0} max={k==="angle"?360:k==="spacing"?2:1} step={k==="angle"?1:.05} value={settings[k]} onChange={e => { if(k==="angle") setRunning(false); change({...settings,angle:Math.round(angle.current)%360,[k]:Number(e.target.value)}); }}/></label>)}
        <button className={button} onClick={() => change(defaults)}>Reset</button>{" "}<button className={button} onClick={() => change({...settings,angle:Math.floor(Math.random()*360)})}>Randomize</button>
        <button className={button+" sm:hidden"} onClick={() => setPanel(false)}>Done</button>
      </div>
    </div>
  </main>;
}
