import * as T from "three";
import type { Coast, Point } from "./types";
// Shape curves are the two time boundaries; guide curves are the two ends.
// Subtract the bilinear patch so that all four authored edges interpolate exactly.
function bend(coast: Coast, s: number) {
  return coast === "Cove"
    ? 3.6 * Math.sin(Math.PI * s)
    : coast === "Point"
      ? 3.6 * Math.sin(2 * Math.PI * s + 0.3)
      : 0;
}
export function patch(coast: Coast, s: number, t: number): Point {
  const shape = (v: number): Point => [
    (s - 0.5) * 48,
    (v - 0.47) * 36 + bend(coast, s) * (0.3 + 0.7 * v),
  ];
  const guide = (side: number): Point => [
    (side - 0.5) * 48 +
      (coast === "Straight" ? 0 : 1.9) *
        Math.sin(Math.PI * t) *
        (side === 0 ? 1 : -0.64),
    (t - 0.47) * 36 + bend(coast, side) * (0.3 + 0.7 * t),
  ];
  const a = shape(0),
    b = shape(1),
    l = guide(0),
    r = guide(1);
  const corners: Point = [
    (s - 0.5) * 48,
    (t - 0.47) * 36 +
      ((1 - s) * bend(coast, 0) + s * bend(coast, 1)) * (0.3 + 0.7 * t),
  ];
  return [
    a[0] * (1 - t) + b[0] * t + l[0] * (1 - s) + r[0] * s - corners[0],
    a[1] * (1 - t) + b[1] * t + l[1] * (1 - s) + r[1] * s - corners[1],
  ];
}
export function coastMesh(coast: Coast) {
  const g = new T.PlaneGeometry(1, 1, 144, 344),
    p = g.attributes.position,
    uv = g.attributes.uv;
  const axis = new Float32Array(p.count * 2),
    domain = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i),
      v = 1 - uv.getY(i);
    // Extend the outer rows and columns to the horizon, reserving most of the
    // triangles for the authored surf zone.
    const s = (u - 0.1) / 0.8,
      t = (v - 0.11) / 0.84;
    const cs = T.MathUtils.clamp(s, 0, 1),
      ct = T.MathUtils.clamp(t, 0, 1);
    const [x, z] = patch(coast, cs, ct),
      a = patch(coast, Math.max(0, cs - 0.002), ct),
      b = patch(coast, Math.min(1, cs + 0.002), ct);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    axis[i * 2] = -(b[1] - a[1]) / len;
    axis[i * 2 + 1] = (b[0] - a[0]) / len;
    p.setXYZ(i, x + (s - cs) * 900, 0, z + (t - ct) * (t < 0 ? 1100 : 180));
    domain[i * 2] = s;
    domain[i * 2 + 1] = t;
  }
  g.setAttribute("axis", new T.BufferAttribute(axis, 2));
  g.setAttribute("domain", new T.BufferAttribute(domain, 2));
  g.computeBoundingSphere();
  return g;
}
