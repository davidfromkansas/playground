import { Button } from "@/components/ui/button";
import { RotateCcw, Shuffle } from "lucide-react";
import { coasts, defaults, sliders, views } from "./data";
import type { Settings } from "./types";
export function Controls({
  s,
  change,
  reset,
}: {
  s: Settings;
  change: (next: Settings) => void;
  reset: () => void;
}) {
  return (
    <div className="bw-controls">
      <h2>Wave controls</h2>
      <label>
        Wavefront shape
        <select
          aria-label="Wavefront shape"
          value={s.coast}
          onChange={(e) =>
            change({ ...s, coast: e.target.value as Settings["coast"] })
          }
        >
          {coasts.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Camera
        <select
          aria-label="Camera"
          value={s.view}
          onChange={(e) =>
            change({ ...s, view: e.target.value as Settings["view"] })
          }
        >
          {views.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {sliders.map(([k, label, min, max]) => (
        <label key={k}>
          <span>
            {label}
            <small aria-hidden="true">
              {s[k].toFixed(2)}
              {k === "scale" ? "×" : ""}
            </small>
          </span>
          <input
            aria-label={label}
            type="range"
            min={min}
            max={max}
            step={0.01}
            value={s[k]}
            onChange={(e) => change({ ...s, [k]: e.target.valueAsNumber })}
          />
        </label>
      ))}
      <div className="bw-actions">
        <Button variant="ghost" onClick={reset}>
          <RotateCcw />
          Reset
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            change({
              ...defaults,
              view: s.view,
              coast: coasts[Math.floor(Math.random() * 3)],
              scale: 0.65 + Math.random() * 0.7,
              peel: Math.random() * 2 - 1,
              gaps: Math.random(),
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
