"use client";
import { useEffect, useRef, useState } from "react";
import { defaults, isSettings, storageKey } from "./data";
import { GardenView } from "./garden-view";
import { GardenControls } from "./garden-controls";
import type { GardenScene } from "./garden-scene";
import type { Settings, Stats } from "./types";
export default function CellularAutomota() {
  const [settings, setSettings] = useState(defaults);
  const [running, setRunning] = useState(true);
  const [stats, setStats] = useState<Stats>({ generation: 0, population: 0 });
  const garden = useRef<GardenScene | null>(null);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (isSettings(stored)) setSettings(stored);
    } catch {
      /* Defaults also work with restricted storage. */
    }
  }, []);
  function change(next: Settings) {
    setSettings(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Settings remain in memory. */
    }
  }
  return (
    <main
      data-thumbnail
      className="fixed inset-0 z-40 overflow-hidden bg-background"
    >
      <GardenView
        settings={settings}
        running={running}
        onStats={setStats}
        onReady={(g) => (garden.current = g)}
      />
      <GardenControls
        settings={settings}
        change={change}
        running={running}
        setRunning={setRunning}
        stats={stats}
        step={() => garden.current?.step()}
        randomize={() => garden.current?.randomize()}
        clear={() => garden.current?.clear()}
      />
    </main>
  );
}
