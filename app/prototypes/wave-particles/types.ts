export type Experiment = "Ripple tank" | "Interference" | "Tow tank";
export type Settings = {
  experiment: Experiment;
  amplitude: number;
  speed: number;
  walls: boolean;
  particles: boolean;
};
export type Packet = {
  ox: number;
  oy: number;
  angle: number;
  spread: number;
  distance: number;
  a: number;
  age: number;
};
export type Sample = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  a: number;
};
