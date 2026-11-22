import * as T from "three";
import { patch } from "./coast";
import { samples, frames } from "./profile";
import type { Settings } from "./types";

// A solid section must follow the ordered curve. Projecting each point onto a
// plane below it independently would fill the air pocket under the lip.
export function sectionCap(data: Float32Array, s: Settings, travel: number) {
  const points: T.Vector2[] = [],
    vertices: number[] = [];
  const smooth = T.MathUtils.smoothstep;
  function vertex(t: number, id = -1, u = 0) {
    const ct = T.MathUtils.clamp(t, 0, 1),
      [x, z] = patch(s.coast, 0.5, ct);
    const a = patch(s.coast, 0.498, ct),
      b = patch(s.coast, 0.502, ct),
      len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let dx = 0,
      y = 0;
    if (id >= 0) {
      const age = (travel + id / 3) % 1,
        local = T.MathUtils.clamp(
          age + 0.035 * Math.sin(id) * Math.sin(Math.PI * age),
          0,
          1,
        );
      const f = local * (frames - 1),
        j = Math.floor(f),
        l = Math.min(frames - 1, j + 1),
        i = Math.round(u * (samples - 1));
      const k = (j * samples + i) * 4,
        k2 = (l * samples + i) * 4;
      const gap = Math.exp(
        -(((0.5 - 0.68 - 0.12 * Math.sin(id * 3)) / 0.085) ** 2),
      );
      const strength =
        smooth(age, 0, 0.12) * smooth(1 - age, 0, 0.13) * (1 - s.gaps * gap);
      dx = T.MathUtils.lerp(data[k], data[k2], f - j) * strength;
      y =
        T.MathUtils.lerp(data[k + 1], data[k2 + 1], f - j) * strength * s.scale;
    }
    const px = x - (dx * (b[1] - a[1])) / len,
      pz = z + (t - ct) * (t < 0 ? 1100 : 180) + (dx * (b[0] - a[0])) / len;
    y +=
      0.055 * Math.sin(px * 0.69 + pz * 0.93 - travel * Math.PI * 6) +
      0.026 * Math.sin(pz * 1.81 - px * 0.39 - travel * Math.PI * 10);
    points.push(new T.Vector2(pz, y));
    vertices.push(px - 0.012, y, pz);
  }
  vertex(-0.13);
  vertex(0);
  const fronts = [0, 1, 2]
    .map((id) => ({ id, age: (travel + id / 3) % 1 }))
    .sort((a, b) => a.age - b.age);
  for (const { id, age } of fronts) {
    for (let i = 0; i < samples; i += 2) {
      const u = i / (samples - 1),
        t = age + ((u - 0.5) * 8) / 36;
      if (t > 0 && t < 1) vertex(t, id, u);
    }
  }
  vertex(1);
  vertex(1.08);
  const last = vertices.length - 3;
  for (const n of [last, 0]) {
    points.push(new T.Vector2(vertices[n + 2], -20));
    vertices.push(vertices[n], -20, vertices[n + 2]);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.setIndex(T.ShapeUtils.triangulateShape(points, []).flat());
  return g;
}
