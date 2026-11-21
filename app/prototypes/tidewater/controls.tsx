import { useState } from "react";
import { RotateCcw, Shuffle, Waves, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calm, choppy, ranges, randomSettings } from "./data";
import type { NumericKey, Quality, Settings } from "./types";

export function Controls({
  s,
  change,
}: {
  s: Settings;
  change: (s: Settings) => void;
}) {
  const [tab, setTab] = useState("Waves");
  const keys: NumericKey[] =
    tab === "Waves"
      ? ["height", "speed", "steepness", "direction", "ripple"]
      : ["clarity", "distortion", "foam"];
  return (
    <div className="tw-controls">
      <h2>Water controls</h2>
      <div className="tw-presets">
        {(
          [
            ["Calm", calm, Waves],
            ["Choppy", choppy, Wind],
          ] as const
        ).map(([name, values, Icon]) => (
          <button
            key={name}
            aria-pressed={Object.keys(values).every(
              (k) =>
                k === "quality" ||
                s[k as keyof Settings] === values[k as keyof Settings],
            )}
            onClick={() => change({ ...values, quality: s.quality })}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}
      </div>
      <div className="tw-tabs">
        {["Waves", "Optics"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="tw-fields">
        {keys.map((k) => {
          const [label, min, max, step, unit] = ranges[k];
          return (
            <label key={k}>
              <span>
                {label}
                <span className="tw-value" aria-hidden="true">
                  {s[k].toFixed(step === 1 ? 0 : step === 0.1 ? 1 : 2)}
                  {unit}
                </span>
              </span>
              <input
                type="range"
                aria-label={label}
                min={min}
                max={max}
                step={step}
                value={s[k]}
                onChange={(e) => change({ ...s, [k]: Number(e.target.value) })}
              />
            </label>
          );
        })}
        {tab === "Optics" &&
          (["shallow", "deep"] as const).map((k) => (
            <label className="tw-color" key={k}>
              {k === "shallow" ? "Shallow water" : "Deep water"}
              <input
                type="color"
                value={s[k]}
                onChange={(e) => change({ ...s, [k]: e.target.value })}
              />
            </label>
          ))}
      </div>
      <label className="tw-quality">
        Reflection quality
        <select
          value={s.quality}
          onChange={(e) => change({ ...s, quality: e.target.value as Quality })}
        >
          {["Low", "Balanced", "High"].map((q) => (
            <option key={q}>{q}</option>
          ))}
        </select>
      </label>
      <div className="tw-actions">
        <Button variant="ghost" onClick={() => change(calm)}>
          <RotateCcw />
          Reset
        </Button>
        <Button variant="ghost" onClick={() => change(randomSettings())}>
          <Shuffle />
          Randomize
        </Button>
      </div>
    </div>
  );
}
