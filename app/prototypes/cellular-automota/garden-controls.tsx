"use client";
import {
  Dices,
  Eraser,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { controls, defaults } from "./data";
import type { Settings, Stats } from "./types";

type Props = {
  settings: Settings;
  change: (s: Settings) => void;
  running: boolean;
  setRunning: (on: boolean) => void;
  stats: Stats;
  step: () => void;
  randomize: () => void;
  clear: () => void;
};

export function GardenControls(p: Props) {
  const { settings, change, running, setRunning, stats } = p;
  const playLabel = running ? "Pause" : "Play";
  const PlayIcon = running ? Pause : Play;
  const fields = (
    <div className="control-fields">
      <p className="font-mono text-sm text-muted-foreground">
        Gen {stats.generation} · {stats.population} plants
      </p>
      {controls.map((c) => (
        <label key={c.key}>
          {c.label}
          <output>{settings[c.key]}</output>
          <input
            type="range"
            min={c.min}
            max={c.max}
            value={settings[c.key]}
            onChange={(e) =>
              change({ ...settings, [c.key]: Number(e.target.value) })
            }
          />
        </label>
      ))}
      <label className="flex! min-h-11 items-center justify-between gap-3">
        Reseed when the garden stalls
        <Switch
          checked={settings.reseed}
          onCheckedChange={(reseed) => change({ ...settings, reseed })}
        />
      </label>
      <div className="actions mt-4 flex flex-wrap">
        <Button aria-label={playLabel} onClick={() => setRunning(!running)}>
          <PlayIcon />
          <span className="hidden sm:inline">{playLabel}</span>
        </Button>
        <Button variant="outline" aria-label="Step" onClick={p.step}>
          <SkipForward />
          <span className="hidden sm:inline">Step</span>
        </Button>
        <Button variant="outline" aria-label="Randomize" onClick={p.randomize}>
          <Dices />
          <span className="hidden sm:inline">Randomize</span>
        </Button>
        <Button variant="outline" aria-label="Clear" onClick={p.clear}>
          <Eraser />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <Button
          variant="outline"
          aria-label="Reset"
          onClick={() => change(defaults)}
        >
          <RotateCcw />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      </div>
    </div>
  );
  return (
    <>
      <aside className="control-panel absolute top-4 right-4 w-80 bg-card/90 backdrop-blur">
        <h2>Cellular Automota</h2>
        {fields}
      </aside>
      <div className="mobile-controls absolute inset-x-4 bottom-4">
        <div className="flex justify-center gap-2">
          <Button aria-label={playLabel} onClick={() => setRunning(!running)}>
            <PlayIcon />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="bg-card/90 backdrop-blur"
                aria-label="Open controls"
              >
                <SlidersHorizontal />
                Controls
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" aria-describedby={undefined}>
              <SheetTitle>Cellular Automota</SheetTitle>
              {fields}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
