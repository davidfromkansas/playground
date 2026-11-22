import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createScene } from "./scene";
import { stage } from "./profile";
import type { Settings } from "./types";
const stops = [
  ["Swell", 0.24],
  ["Curl", 0.53],
  ["Plunge", 0.66],
  ["Wash", 0.83],
] as const;
export function Viewer({ s, resetId }: { s: Settings; resetId: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    chart = useRef<HTMLCanvasElement>(null),
    initial = useRef(s),
    scene = useRef<ReturnType<typeof createScene> | null>(null);
  const [phase, setPhase] = useState(0.53),
    [playing, setPlaying] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const el = canvas.current!;
    const lost = (e: Event) => {
      e.preventDefault();
      setError("Graphics context lost. Reload to restart the scene.");
    };
    el.addEventListener("webglcontextlost", lost);
    try {
      scene.current = createScene(
        el,
        chart.current!,
        initial.current,
        setPhase,
      );
      const play = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      scene.current.play(play);
      setPlaying(play);
    } catch (e) {
      console.error(e);
      setError(
        "This scene requires WebGL 2. Enable hardware acceleration and reload.",
      );
    }
    return () => {
      el.removeEventListener("webglcontextlost", lost);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.configure(s);
  }, [s]);
  useEffect(() => {
    if (resetId) {
      scene.current?.setPhase(0.53);
      const play = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      scene.current?.play(play);
      setPlaying(play);
    }
  }, [resetId]);
  function seek(v: number) {
    scene.current?.play(false);
    setPlaying(false);
    scene.current?.setPhase(v);
  }
  return (
    <section>
      <div className="bw-stage" data-thumbnail>
        <canvas
          ref={canvas}
          aria-label="Three-dimensional breaking waves. Drag to orbit or scroll to zoom."
        />
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="bw-timeline">
        <Button
          variant="secondary"
          aria-label={playing ? "Pause waves" : "Play waves"}
          onClick={() => {
            scene.current?.play(!playing);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <input
          aria-label="Wave cycle"
          type="range"
          min="0"
          max="1"
          step=".001"
          value={phase}
          onChange={(e) => seek(e.target.valueAsNumber)}
        />
        <small>{Math.round(phase * 100)}%</small>
      </div>
      <div className="bw-profile">
        <div>
          <h2>Baked cross-section</h2>
          <p>{stage(phase)} · center of the tracked wavefront</p>
          <div className="bw-stops">
            {stops.map(([name, v]) => (
              <button
                key={name}
                aria-pressed={Math.abs(phase - v) < 0.028}
                onClick={() => seek(v)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <canvas
          ref={chart}
          aria-label="Side profile of the authored wave, including the inside of the curling lip."
        />
      </div>
    </section>
  );
}
