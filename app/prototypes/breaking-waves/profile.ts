import type { Point } from "./types";
export const samples = 192,
  frames = 96,
  sectionWidth = 8;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
// Each index follows the same material point. The lip doubles back around
// the open cavity; ordering the points by horizontal position would erase it.
const flatX = [
  -4, -3, -2, -1.1, -0.6, -0.32, -0.1, 0.1, 0.35, 0.65, 1.1, 1.8, 2.8, 4,
];
const flat: Point[] = flatX.map((x) => [x, 0]);
const swell: Point[] = flatX.map((x) => [
  x,
  0.96 * Math.exp(-((x + 0.45) ** 2) / 1.95) -
    0.13 * Math.exp(-((x - 1.4) ** 2) / 0.8),
]);
const barrel: Point[] = [
  [-4, 0],
  [-3, 0.13],
  [-2, 0.52],
  [-0.9, 1.46],
  [0.1, 2.27],
  [0.86, 2.56],
  [1.54, 2.44],
  [1.87, 2.0],
  [1.83, 1.55],
  [1.53, 1.93],
  [0.94, 1.94],
  [0.55, 1.29],
  [0.94, 0.18],
  [4, 0],
];
const plunge: Point[] = [
  [-4, 0],
  [-3, 0.1],
  [-2, 0.4],
  [-0.7, 1.05],
  [0.42, 1.88],
  [1.34, 2.06],
  [1.91, 1.64],
  [2.12, 0.86],
  [2.03, 0.21],
  [1.63, 0.81],
  [1.25, 1.14],
  [0.88, 0.91],
  [1.27, 0.06],
  [4, 0],
];
const wash: Point[] = flatX.map((x) => [
  x,
  0.38 * Math.exp(-((x - 1.34) ** 2) / 1.6),
]);
const keys: [number, Point[]][] = [
  [0, flat],
  [0.26, swell],
  [0.53, barrel],
  [0.66, plunge],
  [0.8, wash],
  [1, flat],
];
function cubic(a: number, b: number, c: number, d: number, t: number) {
  return (
    b +
    0.5 *
      t *
      (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))
  );
}
function sampleCurve(curve: Point[], u: number): Point {
  const f = clamp(u) * (curve.length - 1),
    i = Math.min(curve.length - 2, Math.floor(f)),
    t = f - i;
  return [0, 1].map((k) =>
    cubic(
      curve[Math.max(0, i - 1)][k],
      curve[i][k],
      curve[i + 1][k],
      curve[Math.min(curve.length - 1, i + 2)][k],
      t,
    ),
  ) as Point;
}
export function bakeSection() {
  const data = new Float32Array(samples * frames * 4);
  for (let j = 0; j < frames; j++) {
    const age = j / (frames - 1);
    let end = 1;
    while (keys[end][0] < age) end++;
    const [start, from] = keys[end - 1],
      [finish, to] = keys[end],
      blend = smooth((age - start) / (finish - start));
    const curve: Point[] = from.map(([x, y], i) => [
      x + (to[i][0] - x) * blend,
      // Lift the lip while it turns over or retracts. Straight keyframe
      // interpolation cuts through the inner wall during these transitions.
      y +
        (to[i][1] - y) * blend +
        (end === 2 || end === 4
          ? 5 * blend * (1 - blend) * Math.exp(-((i - 7) ** 2) / 3)
          : 0),
    ]);
    let arc = 0,
      previous: Point | undefined;
    for (let i = 0; i < samples; i++) {
      const u = i / (samples - 1),
        base = sampleCurve(flat, u),
        p = sampleCurve(curve, u);
      // Material is densely sampled at the crest in the authored curve. The rest
      // water mesh has uniform spacing. Fade that redistribution at both endpoints.
      const envelope = smooth(age / 0.12) * smooth((1 - age) / 0.15);
      const rest = (u - 0.5) * sectionWidth,
        k = 4 * (j * samples + i);
      const x = p[0] + (rest - base[0]) * (1 - envelope);
      if (previous) arc += Math.hypot(x - previous[0], p[1] - previous[1]);
      data[k] = x - rest;
      data[k + 1] = p[1] * smooth(u / 0.055) * smooth((1 - u) / 0.075);
      data[k + 2] =
        smooth((age - 0.3) / 0.2) *
        smooth((0.99 - age) / 0.18) *
        Math.exp(
          -Math.pow((u - 0.55) / (0.11 + 0.22 * smooth((age - 0.55) / 0.2)), 2),
        );
      data[k + 3] = arc;
      previous = [x, p[1]];
    }
  }
  return data;
}
export function stage(age: number) {
  return age < 0.25
    ? "Swell"
    : age < 0.44
      ? "Steepening"
      : age < 0.61
        ? "Curl"
        : age < 0.76
          ? "Plunge"
          : "Wash";
}
