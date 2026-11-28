"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { GardenScene } from "./garden-scene";
import type { Settings, Stats } from "./types";

type Props = {
  settings: Settings;
  running: boolean;
  onStats: (s: Stats) => void;
  onReady: (scene: GardenScene | null) => void;
};

export function GardenView({ settings, running, onStats, onReady }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<GardenScene | null>(null);
  const stats = useRef(onStats);
  const { resolvedTheme } = useTheme();
  stats.current = onStats;

  useEffect(() => {
    const el = canvas.current!;
    let garden: GardenScene;
    try {
      garden = new GardenScene(el, settings, {
        onStats: (s) => stats.current(s),
      });
    } catch {
      return; // WebGL unavailable: the fallback message stays visible.
    }
    scene.current = garden;
    onReady(garden);
    const fit = () => garden.resize(el.clientWidth, el.clientHeight);
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    fit();
    return () => {
      observer.disconnect();
      garden.dispose();
      scene.current = null;
      onReady(null);
    };
    // The scene is created once; later changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => scene.current?.setSettings(settings), [settings]);
  useEffect(() => scene.current?.setRunning(running), [running]);
  useEffect(
    () => scene.current?.setTheme(resolvedTheme !== "light"),
    [resolvedTheme],
  );

  // Tap or drag to plant; starting on a plant removes plants instead.
  const mode = useRef<boolean | null>(null);
  function paint(e: React.PointerEvent) {
    const garden = scene.current;
    if (!garden || mode.current === null) return;
    garden.paint(garden.cellAt(e.clientX, e.clientY), mode.current);
  }

  return (
    <div className="absolute inset-0">
      <p className="absolute inset-0 grid place-items-center p-6 text-center text-muted-foreground">
        This garden needs WebGL, which this browser has turned off.
      </p>
      <canvas
        ref={canvas}
        aria-label="A Game of Life garden. Tap a square to plant or remove a plant."
        role="img"
        className="absolute inset-0 size-full touch-none"
        onPointerDown={(e) => {
          const garden = scene.current;
          if (!garden) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          mode.current = !garden.isAlive(garden.cellAt(e.clientX, e.clientY));
          paint(e);
        }}
        onPointerMove={paint}
        onPointerUp={() => (mode.current = null)}
        onPointerCancel={() => (mode.current = null)}
      />
    </div>
  );
}
