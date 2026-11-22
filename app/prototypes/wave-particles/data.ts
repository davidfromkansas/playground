import type { Settings, Experiment } from "./types";
export const width = 24,
  height = 15,
  radius = 1.12;
export const experiments: Experiment[] = [
  "Ripple tank",
  "Interference",
  "Tow tank",
];
export const instructions: Record<Experiment, string> = {
  "Ripple tank":
    "Tap the water to launch a ripple. Watch the crest return from the walls.",
  Interference:
    "Two sources pulse together. Follow the crests where their fronts cross.",
  "Tow tank":
    "A towed hull pushes water at the bow and draws it down at the stern.",
};
export const defaults: Settings = {
  experiment: "Interference",
  amplitude: 1,
  speed: 1,
  walls: true,
  particles: true,
};
export function valid(s: Partial<Settings> | null): s is Settings {
  return (
    !!s &&
    experiments.includes(s.experiment as Experiment) &&
    typeof s.amplitude === "number" &&
    s.amplitude >= 0.3 &&
    s.amplitude <= 1.8 &&
    typeof s.speed === "number" &&
    s.speed >= 0.4 &&
    s.speed <= 1.8 &&
    typeof s.walls === "boolean" &&
    typeof s.particles === "boolean"
  );
}
