import type { Settings, NumericKey } from "./types";
export const calm: Settings = {
  height: 0.65,
  speed: 0.85,
  steepness: 0.55,
  direction: 26,
  ripple: 0.65,
  clarity: 5.5,
  distortion: 0.45,
  foam: 0.54,
  shallow: "#55cabe",
  deep: "#12536a",
  quality: "Balanced",
};
export const choppy: Settings = {
  ...calm,
  height: 1.55,
  speed: 1.25,
  steepness: 0.86,
  direction: 54,
  ripple: 1.1,
  foam: 0.86,
};
export const ranges: Record<
  NumericKey,
  [string, number, number, number, string]
> = {
  height: ["Wave height", 0, 1.8, 0.01, "×"],
  speed: ["Speed", 0, 2, 0.01, "×"],
  steepness: ["Steepness", 0, 1, 0.01, ""],
  direction: ["Direction", 0, 359, 1, "°"],
  ripple: ["Ripple strength", 0, 1.5, 0.01, "×"],
  clarity: ["Underwater clarity", 1, 12, 0.1, " m"],
  distortion: ["Distortion", 0, 1, 0.01, ""],
  foam: ["Foam amount", 0, 1, 0.01, ""],
};
export function isSettings(value: Partial<Settings> | null): value is Settings {
  return (
    !!value &&
    Object.entries(ranges).every(([k, [, min, max]]) => {
      const n = value[k as NumericKey];
      return typeof n === "number" && n >= min && n <= max;
    }) &&
    [value.shallow, value.deep].every(
      (c) => typeof c === "string" && /^#[a-f0-9]{6}$/i.test(c),
    ) &&
    ["Low", "Balanced", "High"].includes(value.quality || "")
  );
}
export function randomSettings(): Settings {
  const next = { ...calm };
  for (const k of Object.keys(ranges) as NumericKey[]) {
    const [, min, max, step] = ranges[k];
    next[k] = Number(
      (min + Math.round((Math.random() * (max - min)) / step) * step).toFixed(
        2,
      ),
    );
  }
  return next;
}
