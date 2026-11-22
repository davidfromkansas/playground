import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, StepForward, CircleDot } from "lucide-react";
import { height, width, instructions } from "./data";
import { Tank } from "./simulation";
import { createRenderer } from "./render";
import type { Settings } from "./types";
export function TankView({ s, revision }: { s: Settings; revision: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    profile = useRef<HTMLCanvasElement>(null),
    model = useRef<Tank | null>(null);
  const settings = useRef(s),
    dirty = useRef(true),
    stop = useRef(false);
  const [paused, setPaused] = useState(false),
    [count, setCount] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    settings.current = s;
    dirty.current = true;
  }, [s]);
  useEffect(() => {
    const el = canvas.current!;
    const tank = new Tank();
    model.current = tank;
    let draw: ReturnType<typeof createRenderer>;
    try {
      draw = createRenderer(el, profile.current!);
    } catch {
      setError("This browser could not start the water canvas.");
      return;
    }
    tank.reset(settings.current);
    let frame = 0,
      last = 0,
      lastCount = 0,
      acc = 0,
      visible = true;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
    });
    observer.observe(el);
    const resize = new ResizeObserver(() => {
      dirty.current = true;
    });
    resize.observe(el);
    const theme = new MutationObserver(() => {
      dirty.current = true;
    });
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (!visible || document.hidden) {
        last = 0;
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (!stop.current) acc += dt;
      let advanced = false;
      while (acc >= 1 / 40) {
        tank.step(1 / 40, settings.current, false);
        acc -= 1 / 40;
        advanced = true;
      }
      if (advanced || dirty.current) {
        tank.reconstruct(settings.current.walls);
        const style = getComputedStyle(el);
        draw(
          tank,
          settings.current,
          style.getPropertyValue("--muted-foreground"),
          style.getPropertyValue("--mesh"),
        );
        dirty.current = false;
      }
      if (now - lastCount > 320) {
        setCount(tank.packets.length);
        lastCount = now;
      }
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      theme.disconnect();
      model.current = null;
    };
  }, []);
  useEffect(() => {
    model.current?.reset(settings.current);
    dirty.current = true;
  }, [s.experiment, s.walls, revision]);
  function pulse(x: number, y: number) {
    model.current?.ripple(x, y, s.amplitude);
    dirty.current = true;
  }
  return (
    <section>
      <div className="wp-stage" data-thumbnail>
        <canvas
          ref={canvas}
          aria-label="Wave tank. Tap a location to release a pulse."
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            pulse(
              ((e.clientX - r.left) / r.width) * width,
              ((e.clientY - r.top) / r.height) * height,
            );
          }}
        />
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="wp-transport">
        <Button
          variant="secondary"
          aria-label={paused ? "Resume" : "Pause"}
          onClick={() => {
            stop.current = !paused;
            setPaused(!paused);
          }}
        >
          {paused ? <Play /> : <Pause />}
          <span>{paused ? "Resume" : "Pause"}</span>
        </Button>
        <Button
          variant="ghost"
          disabled={!paused}
          aria-label="Step one frame"
          onClick={() => {
            model.current?.step(1 / 40, s, false);
            dirty.current = true;
          }}
        >
          <StepForward />
          <span>Step</span>
        </Button>
        <Button
          variant="ghost"
          aria-label="Add pulse"
          onClick={() => pulse(12, 7.5)}
        >
          <CircleDot />
          <span>Add pulse</span>
        </Button>
        <output>{count.toLocaleString()} particles</output>
      </div>
      <p className="wp-description">{instructions[s.experiment]}</p>
      <div className="wp-profile">
        <div>
          <strong>Surface profile</strong>
          <small>Transect at 8 m · dot marks the float</small>
        </div>
        <canvas
          ref={profile}
          aria-label="Water elevation along the dotted line and the float's vertical position"
        />
      </div>
    </section>
  );
}
