import walkFrames from "./walk-rects.json";

/** The atlas runs left to right from soles to antenna tips. */
export function drawStack(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, degrees: number, squash: number, spacing: number, walkFrame?: number) {
  const count = 126, width = sheet.naturalWidth / count, height = sheet.naturalHeight;
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians), sin = Math.sin(radians);
  // Pull the camera back in whole logical pixels for the exploded view.
  const size = Math.max(180, Math.ceil(60 + (count - 1) * spacing));
  if (ctx.canvas.width !== size) ctx.canvas.width = ctx.canvas.height = size;
  ctx.resetTransform();
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  const center = Math.floor(size / 2), floor = Math.round(center + (count - 1) * spacing / 2);
  if (walkFrame !== undefined) {
    for (const [sx, sy, w, h, dx, dy, z] of walkFrames[walkFrame % walkFrames.length]) {
      ctx.setTransform(cos, squash*sin, -sin, squash*cos, center, floor - Math.round(z*spacing));
      ctx.drawImage(sheet, sx, sy, w, h, dx, dy, w, h);
    }
    ctx.resetTransform();
    return;
  }
  for (let z = 0; z < count; z++) {
    ctx.setTransform(cos, squash*sin, -sin, squash*cos, center, floor - Math.round(z*spacing));
    ctx.drawImage(sheet, z*width, 0, width, height, -width/2, -height/2, width, height);
  }
  ctx.resetTransform();
}
