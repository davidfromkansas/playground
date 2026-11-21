import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpFromLine,
  Focus,
  Mountain,
  Pause,
  Play,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Controls } from "./controls";
import { startOcean } from "./engine";
import type { Settings, View } from "./types";
export function Viewer({
  settings,
  change,
}: {
  settings: Settings;
  change: (s: Settings) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<ReturnType<typeof startOcean> | null>(null),
    initial = useRef(settings);
  const [view, setView] = useState<View>("Beach"),
    [fps, setFps] = useState<number | null>(null),
    [paused, setPaused] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const el = canvas.current!;
    const lost = (e: Event) => {
      e.preventDefault();
      setError("The graphics context was lost. Reload to restart the water.");
    };
    el.addEventListener("webglcontextlost", lost);
    try {
      engine.current = startOcean(el, initial.current, setFps);
    } catch (e) {
      console.error(e);
      setError(
        "This scene needs WebGL 2. Enable hardware acceleration and reload.",
      );
    }
    return () => {
      el.removeEventListener("webglcontextlost", lost);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current?.configure(settings);
  }, [settings]);
  return (
    <section className="tw-viewer">
      <div className="tw-stage" data-thumbnail>
        <canvas
          ref={canvas}
          aria-label="Animated coastal waters. Drag to orbit and scroll or pinch to zoom."
        />
        {error && <p role="alert">{error}</p>}
        <div className="tw-fps">
          <Activity size={14} />
          {fps ?? "…"} FPS
        </div>
        <button
          className="tw-play"
          aria-label={paused ? "Resume waves" : "Pause waves"}
          onClick={() => {
            engine.current?.pause(!paused);
            setPaused(!paused);
          }}
        >
          {paused ? <Play /> : <Pause />}
        </button>
      </div>
      <div className="tw-viewbar">
        <span className="tw-camera">
          <Focus size={16} />
          Camera
        </span>
        <div className="tw-views">
          {(
            [
              ["Beach", Mountain],
              ["Surface", Waves],
              ["Overhead", ArrowUpFromLine],
            ] as const
          ).map(([v, Icon]) => (
            <button
              key={v}
              aria-label={v + " camera"}
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                engine.current?.view(v);
              }}
            >
              <Icon size={16} />
              <span>{v}</span>
            </button>
          ))}
        </div>
        <div className="tw-mobile">
          <Sheet>
            <SheetTrigger asChild>
              <button aria-label="Open water controls">
                <SlidersHorizontal size={18} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              aria-describedby={undefined}
              className="max-h-[85dvh] overflow-y-auto [&>button]:size-11"
            >
              <SheetTitle className="sr-only">Water settings</SheetTitle>
              <Controls s={settings} change={change} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <p className="tw-hint">
        Drag to orbit <span>·</span> Scroll or pinch to zoom
      </p>
    </section>
  );
}
