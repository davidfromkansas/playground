import type { Settings } from "./types";
export const storageKey = "playground:cellular-automota:v1";
export const defaults: Settings = {
  speed: 3,
  cellSize: 44,
  density: 28,
  reseed: true,
};
export const controls = [
  { key: "speed", label: "Generations / sec", min: 1, max: 10 },
  { key: "cellSize", label: "Plot size", min: 30, max: 80 },
  { key: "density", label: "Seed density %", min: 10, max: 50 },
] as const;
export function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") return false;
  const v = value as Settings;
  return (
    typeof v.reseed === "boolean" &&
    controls.every((c) => {
      const n = v[c.key];
      return Number.isInteger(n) && n >= c.min && n <= c.max;
    })
  );
}
/** Scene palette. WebGL materials need literal colors, so they live here. */
export const scene = {
  grass: [0x5f9e3a, 0x6aab41, 0x568f34, 0x74b548],
  blade: [0x7fc24f, 0x8fd05a, 0x6db343],
  soil: 0x6b4a2b,
  wilt: 0x8a6a3c,
  light: {
    light: {
      sky: 0xdfefff,
      ground: 0x4a6b2a,
      sun: 0xfff2d6,
      sunI: 2.4,
      hemiI: 1.25,
    },
    dark: {
      sky: 0x8fa6d8,
      ground: 0x223018,
      sun: 0xc9d6ff,
      sunI: 1.5,
      hemiI: 0.75,
    },
  },
} as const;
