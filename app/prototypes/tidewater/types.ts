export type Quality = "Low" | "Balanced" | "High";
export type View = "Beach" | "Surface" | "Overhead";
export type Settings = {
  height: number;
  speed: number;
  steepness: number;
  direction: number;
  ripple: number;
  clarity: number;
  distortion: number;
  foam: number;
  shallow: string;
  deep: string;
  quality: Quality;
};
export type NumericKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never;
}[keyof Settings];
