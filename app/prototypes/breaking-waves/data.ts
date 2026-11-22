import type { Settings, Coast, CameraView } from "./types";
export const coasts: Coast[] = ["Cove", "Straight", "Point"];
export const views: CameraView[] = ["Shore", "Barrel", "Cutaway", "Overhead"];
export const defaults: Settings = {
  coast: "Cove",
  view: "Cutaway",
  scale: 1,
  peel: -0.67,
  gaps: 0.83,
};
export const sliders = [
  ["scale", "Wave height", 0.55, 1.45],
  ["peel", "Break progression", -1, 1],
  ["gaps", "Crest gaps", 0, 1],
] as const;
export function valid(s: Partial<Settings> | null): s is Settings {
  return (
    !!s &&
    coasts.includes(s.coast as Coast) &&
    views.includes(s.view as CameraView) &&
    sliders.every(
      ([key, , lo, hi]) =>
        typeof s[key] === "number" && s[key]! >= lo && s[key]! <= hi,
    )
  );
}
export const paper =
  "https://advances.realtimerendering.com/s2022/SIGGRAPH2022-Advances-Water-Malan.pdf";
