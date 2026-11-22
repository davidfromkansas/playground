import { height, radius, width } from "./data";
import type { Packet, Sample, Settings } from "./types";
const tau = Math.PI * 2,
  limit = 5000;
export const columns = 217,
  rows = 136,
  spacing = width / (columns - 1);
const kernelSize = 2048;
const cosine = Float32Array.from(
  { length: kernelSize + 1 },
  (_, i) => (1 + Math.cos((Math.PI * i) / kernelSize)) / 2,
);
const sine = Float32Array.from({ length: 2 * kernelSize + 1 }, (_, i) =>
  Math.sin(Math.PI * (i / kernelSize - 1)),
);
export function fold(p: number, size: number) {
  const u = ((p % (2 * size)) + 2 * size) % (2 * size);
  return { p: u > size ? 2 * size - u : u, sign: u > size ? -1 : 1 };
}
// Work in an unfolded rectangular tank, then mirror each ray into the tank.
// This also places split children correctly when their rays span a corner.
export function locate(p: Packet, walls: boolean): Sample {
  let dx = Math.cos(p.angle),
    dy = Math.sin(p.angle);
  let x = p.ox + p.distance * dx,
    y = p.oy + p.distance * dy;
  if (walls) {
    const fx = fold(x, width),
      fy = fold(y, height);
    x = fx.p;
    y = fy.p;
    dx *= fx.sign;
    dy *= fy.sign;
  }
  return { x, y, dx, dy, a: p.a };
}
export class Tank {
  packets: Packet[] = [];
  samples: Sample[] = [];
  time = 0;
  emitterTime = 0;
  z = new Float32Array(columns * rows);
  wx = new Float32Array(columns * rows);
  wy = new Float32Array(columns * rows);
  boat = { x: 12, y: 7.5, angle: 0 };
  float = { x: 15, y: 8, z: 0, velocity: 0 };
  emit(
    x: number,
    y: number,
    a: number,
    angle = 0,
    spread = tau,
    count = 8,
    distance = 0,
  ) {
    if (this.packets.length + count > limit) return;
    for (let i = 0; i < count; i++)
      this.packets.push({
        ox: x,
        oy: y,
        angle: angle + spread * ((i + 0.5) / count - 0.5),
        spread: spread / count,
        distance,
        a: a / count,
        age: 0,
      });
  }
  ripple(x: number, y: number, strength: number) {
    if (this.packets.length + 16 > limit) return;
    this.emit(x, y, strength * 3.8, 0, tau, 8, radius * 0.72);
    // A following trough makes cancellation visible where two packets meet.
    this.emit(x, y, -strength * 2.8);
  }
  reset(s: Settings) {
    this.packets = [];
    this.time = 0;
    this.emitterTime = 0;
    this.float.z = 0;
    this.float.velocity = 0;
    this.boat = { x: 12 + 6.2, y: 7.5, angle: Math.PI / 2 };
    this.z.fill(0);
    this.wx.fill(0);
    this.wy.fill(0);
    // Seed a live experiment rather than an empty tank.
    for (let i = 0; i < 112; i++) this.step(1 / 45, s, false);
    this.reconstruct(s.walls);
  }
  step(dt: number, s: Settings, build = true) {
    this.time += dt;
    this.emitterTime -= dt;
    const t = this.time,
      angle = t * 0.31;
    this.boat = {
      x: 12 + 6.2 * Math.cos(angle),
      y: 7.5 + 3.4 * Math.sin(angle),
      angle: Math.atan2(3.4 * Math.cos(angle), -6.2 * Math.sin(angle)),
    };
    if (this.emitterTime <= 0) {
      if (s.experiment === "Tow tank") {
        const b = this.boat,
          dx = Math.cos(b.angle),
          dy = Math.sin(b.angle);
        const interval = 0.24;
        const speed =
          0.31 * Math.hypot(6.2 * Math.sin(angle), 3.4 * Math.cos(angle));
        // Two equal wetted end faces displace equal and opposite volumes (Eq. 12).
        const volume = 0.86 * speed * interval;
        // Integral of the radial cosine kernel over its support disk.
        const integral = radius * radius * (Math.PI / 2 - 2 / Math.PI);
        const a = (volume / integral) * s.amplitude;
        this.emit(b.x + dx * 0.78, b.y + dy * 0.78, a, b.angle, Math.PI, 4);
        this.emit(
          b.x - dx * 0.72,
          b.y - dy * 0.72,
          -a,
          b.angle + Math.PI,
          Math.PI,
          4,
        );
        this.emitterTime += interval;
      } else {
        this.ripple(
          s.experiment === "Interference" ? 8.5 : 10.2,
          7.5,
          s.amplitude,
        );
        if (s.experiment === "Interference")
          this.ripple(15.5, 7.5, s.amplitude);
        this.emitterTime += s.experiment === "Interference" ? 2.1 : 3.6;
      }
    }
    const next: Packet[] = [];
    let budget = limit - this.packets.length;
    const decay = Math.exp(-dt * 0.21);
    for (const p of this.packets) {
      p.age += dt;
      p.a *= decay;
      p.distance += dt * 2.25 * s.speed;
      if (p.age > 15 || Math.abs(p.a) < 0.0009) continue;
      if (!s.walls) {
        const pos = locate(p, false);
        if (
          pos.x < -radius ||
          pos.x > width + radius ||
          pos.y < -radius ||
          pos.y > height + radius
        )
          continue;
      }
      if (p.distance * p.spread > radius * 0.5 && budget >= 2) {
        if (Math.abs(p.a) <= 0.0027) continue;
        budget -= 2;
        for (const offset of [-1, 0, 1])
          next.push({
            ...p,
            angle: p.angle + (offset * p.spread) / 3,
            spread: p.spread / 3,
            a: p.a / 3,
          });
      } else next.push(p);
    }
    this.packets = next;
    if (build) this.reconstruct(s.walls);
    // A vertically constrained float with a fixed waterplane area (Eq. 13).
    const f = this.float;
    const water =
      this.z[Math.round(f.y / spacing) * columns + Math.round(f.x / spacing)];
    const acceleration = 19 * (water - f.z) - 3.6 * f.velocity;
    f.velocity += acceleration * dt;
    f.z += f.velocity * dt;
  }
  reconstruct(walls: boolean) {
    this.z.fill(0);
    this.wx.fill(0);
    this.wy.fill(0);
    this.samples = this.packets.map((p) => locate(p, walls));
    for (const { x, y, dx, dy, a } of this.samples) {
      const left = Math.max(0, Math.ceil((x - radius) / spacing)),
        right = Math.min(columns - 1, Math.floor((x + radius) / spacing));
      const top = Math.max(0, Math.ceil((y - radius) / spacing)),
        bottom = Math.min(rows - 1, Math.floor((y + radius) / spacing));
      for (let j = top; j <= bottom; j++) {
        const v = j * spacing - y;
        for (let i = left; i <= right; i++) {
          const u = i * spacing - x,
            dist2 = u * u + v * v;
          if (dist2 >= radius * radius) continue;
          const h =
            a * cosine[Math.round((Math.sqrt(dist2) / radius) * kernelSize)];
          const lateral =
            -h *
            sine[Math.round(((u * dx + v * dy) / radius + 1) * kernelSize)];
          const index = j * columns + i;
          this.z[index] += h;
          this.wx[index] += lateral * dx;
          this.wy[index] += lateral * dy;
        }
      }
    }
  }
}
