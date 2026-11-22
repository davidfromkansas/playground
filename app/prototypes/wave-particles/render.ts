import { width, height } from "./data";
import { columns, rows, spacing, Tank } from "./simulation";
import type { Settings } from "./types";

// Colors below describe light, water and the instruments in the rendered scene.
export function createRenderer(
  canvas: HTMLCanvasElement,
  profile: HTMLCanvasElement,
) {
  const ctx = canvas.getContext("2d"),
    plot = profile.getContext("2d");
  const raster = document.createElement("canvas");
  raster.width = columns;
  raster.height = rows;
  const rc = raster.getContext("2d");
  if (!ctx || !rc || !plot) throw Error("Canvas 2D is required.");
  const img = rc.createImageData(columns, rows),
    rgb = img.data;
  const heights = new Float32Array(columns * rows);
  function size(el: HTMLCanvasElement) {
    const dpr = Math.min(devicePixelRatio, 1.75);
    const w = Math.max(1, Math.round(el.clientWidth * dpr)),
      h = Math.max(1, Math.round(el.clientHeight * dpr));
    if (el.width !== w || el.height !== h) {
      el.width = w;
      el.height = h;
    }
  }
  return function draw(tank: Tank, s: Settings, ink: string, accent: string) {
    size(canvas);
    size(profile);
    const z = tank.z;
    // Invert the horizontal displacement approximately at each displayed cell.
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < columns; i++) {
        const k = j * columns + i,
          x = Math.max(0, Math.min(columns - 1.001, i - tank.wx[k] / spacing)),
          y = Math.max(0, Math.min(rows - 1.001, j - tank.wy[k] / spacing));
        const l = Math.floor(y) * columns + Math.floor(x),
          u = x % 1,
          v = y % 1;
        heights[k] =
          (z[l] * (1 - u) + z[l + 1] * u) * (1 - v) +
          (z[l + columns] * (1 - u) + z[l + columns + 1] * u) * v;
      }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < columns; i++) {
        const k = j * columns + i;
        const nx =
          (heights[j * columns + Math.min(i + 1, columns - 1)] -
            heights[j * columns + Math.max(0, i - 1)]) /
          (2 * spacing);
        const ny =
          (heights[Math.min(j + 1, rows - 1) * columns + i] -
            heights[Math.max(j - 1, 0) * columns + i]) /
          (2 * spacing);
        const light = Math.tanh(3.4 * (nx * 0.72 + ny * 0.9));
        const cx = i * spacing + nx * 0.65,
          cy = j * spacing + ny * 0.65;
        const line = Math.min(
          Math.abs(cx / 1.5 - Math.round(cx / 1.5)),
          Math.abs(cy / 1.5 - Math.round(cy / 1.5)),
        );
        const tile = Math.max(0, 1 - line * 22);
        const depth = 0.48 + 0.33 * (i / columns) - (0.23 * j) / rows;
        const glint = Math.max(0, light) ** 3,
          shade = light * 69 + heights[k] * 18;
        const n = k * 4;
        rgb[n] = 17 + 25 * depth + shade + 113 * glint - tile * 4;
        rgb[n + 1] = 78 + 59 * depth + shade + 68 * glint - tile * 10;
        rgb[n + 2] = 84 + 48 * depth + shade + 49 * glint - tile * 8;
        rgb[n + 3] = 255;
      }
    rc!.putImageData(img, 0, 0);
    const c = ctx!;
    const w = canvas.width,
      h = canvas.height;
    c.drawImage(raster, 0, 0, w, h);
    c.save();
    c.scale(w / width, h / height);
    if (s.particles) {
      for (const p of tank.samples) {
        c.fillStyle =
          p.a > 0 ? "rgba(255,225,154,.78)" : "rgba(148,220,255,.76)";
        c.fillRect(p.x - 0.039, p.y - 0.039, 0.078, 0.078);
      }
    }
    // Mark the transect measured by the profile.
    c.strokeStyle = "rgba(230,255,245,.35)";
    c.lineWidth = 0.025;
    c.setLineDash([0.18, 0.19]);
    c.beginPath();
    c.moveTo(0, tank.float.y);
    c.lineTo(width, tank.float.y);
    c.stroke();
    c.setLineDash([]);
    if (s.experiment === "Tow tank") {
      const b = tank.boat;
      c.save();
      c.translate(b.x, b.y);
      c.rotate(b.angle);
      c.fillStyle = "rgba(2,35,40,.5)";
      c.beginPath();
      c.ellipse(0.05, 0.14, 1.13, 0.52, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgb(229,218,184)";
      c.beginPath();
      c.moveTo(1.06, 0);
      c.quadraticCurveTo(0.47, -0.51, -0.86, -0.36);
      c.lineTo(-0.87, 0.36);
      c.quadraticCurveTo(0.4, 0.51, 1.06, 0);
      c.fill();
      c.fillStyle = "rgb(156,81,51)";
      c.fillRect(-0.62, -0.25, 1, 0.5);
      c.fillStyle = "rgb(47,66,66)";
      c.fillRect(0.03, -0.23, 0.22, 0.46);
      c.restore();
    }
    const f = tank.float;
    c.save();
    c.translate(f.x, f.y);
    c.fillStyle = "rgba(4,39,44,.45)";
    c.beginPath();
    c.ellipse(0.1, 0.12, 0.3, 0.21, 0, 0, Math.PI * 2);
    c.fill();
    c.translate(0, -f.z * 0.35);
    c.fillStyle = "rgb(246,174,83)";
    c.beginPath();
    c.arc(0, 0, 0.23, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgb(255,235,191)";
    c.beginPath();
    c.arc(-0.05, -0.05, 0.09, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.strokeStyle = "rgba(239,248,237,.62)";
    c.lineWidth = 0.025;
    for (let x = 0; x <= width; x += 0.5) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, x % 2 === 0 ? 0.25 : 0.11);
      c.stroke();
    }
    for (let y = 0; y <= height; y += 0.5) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(y % 2 === 0 ? 0.25 : 0.11, y);
      c.stroke();
    }
    c.restore();
    const g = plot!,
      pw = profile.width,
      ph = profile.height;
    g.clearRect(0, 0, pw, ph);
    g.strokeStyle = ink;
    g.globalAlpha = 0.3;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, ph / 2);
    g.lineTo(pw, ph / 2);
    g.stroke();
    g.globalAlpha = 1;
    g.strokeStyle = accent;
    g.lineWidth = 2;
    g.beginPath();
    const row = Math.round(f.y / spacing) * columns;
    let peak = Math.max(0.62, Math.abs(f.z));
    for (let i = 0; i < columns; i++)
      peak = Math.max(peak, Math.abs(heights[row + i]));
    const plotScale = (ph * 0.43) / peak;
    for (let i = 0; i < columns; i++) {
      const x = (i * pw) / (columns - 1),
        y = ph * 0.5 - heights[row + i] * plotScale;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = "rgb(245,174,83)";
    g.beginPath();
    g.arc((f.x / width) * pw, ph * 0.5 - f.z * plotScale, 3.4, 0, Math.PI * 2);
    g.fill();
  };
}
