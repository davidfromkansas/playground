import { Button } from "@/components/ui/button";
import { RotateCcw, Shuffle } from "lucide-react";
import { defaults, experiments } from "./data";
import type { Settings } from "./types";
export function Controls({
  s,
  change,
  reset,
}: {
  s: Settings;
  change: (s: Settings) => void;
  reset: () => void;
}) {
  return (
    <div className="wp-controls">
      <h2>Tank controls</h2>
      <label>
        Experiment
        <select
          value={s.experiment}
          onChange={(e) =>
            change({
              ...s,
              experiment: e.target.value as Settings["experiment"],
            })
          }
        >
          {experiments.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      {(["amplitude", "speed"] as const).map((k) => (
        <label key={k}>
          <span>
            {k === "amplitude" ? "Source amplitude" : "Wave speed"}
            <small>{s[k].toFixed(1)}×</small>
          </span>
          <input
            aria-label={k === "amplitude" ? "Source amplitude" : "Wave speed"}
            type="range"
            min={k === "amplitude" ? 0.3 : 0.4}
            max={1.8}
            step={0.1}
            value={s[k]}
            onChange={(e) => change({ ...s, [k]: Number(e.target.value) })}
          />
        </label>
      ))}
      {(["walls", "particles"] as const).map((k) => (
        <label key={k} className="wp-check">
          <input
            type="checkbox"
            checked={s[k]}
            onChange={(e) => change({ ...s, [k]: e.target.checked })}
          />
          {k === "walls" ? "Reflecting walls" : "Show particles"}
        </label>
      ))}
      <p className="mb-3 text-xs text-muted-foreground">
        Gold particles carry crests. Blue particles carry troughs.
      </p>
      <div className="wp-actions">
        <Button variant="ghost" onClick={reset}>
          <RotateCcw />
          Reset
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            change({
              ...defaults,
              experiment: experiments[Math.floor(Math.random() * 3)],
              amplitude: 0.3 + Math.round(Math.random() * 15) / 10,
              speed: 0.4 + Math.round(Math.random() * 14) / 10,
              particles: Math.random() > 0.5,
            })
          }
        >
          <Shuffle />
          Randomize
        </Button>
      </div>
    </div>
  );
}
