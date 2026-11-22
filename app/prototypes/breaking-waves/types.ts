export type Coast = "Cove" | "Straight" | "Point";
export type CameraView = "Shore" | "Barrel" | "Overhead" | "Cutaway";
export type Settings = {
  coast: Coast;
  view: CameraView;
  scale: number;
  peel: number;
  gaps: number;
};
export type Point = [number, number];
