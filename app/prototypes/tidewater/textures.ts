import * as T from "three";

// Periodic value noise keeps every mip level seamless.
function hash(x: number, y: number, seed: number) {
  let n = Math.imul(x + seed * 1217, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function noise(x: number, y: number, period = 256, seed = 0) {
  const i = Math.floor(x),
    j = Math.floor(y),
    sx = x - i,
    sy = y - j;
  const u = sx * sx * (3 - 2 * sx),
    v = sy * sy * (3 - 2 * sy);
  const h = (a: number, b: number) =>
    hash(
      ((a % period) + period) % period,
      ((b % period) + period) % period,
      seed,
    );
  return (
    (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) +
    (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v
  );
}
export function surfaceTexture(seed: number) {
  const size = 256,
    bytes = new Uint8Array(size * size * 4);
  const relief = (u: number, v: number) =>
    0.54 * noise(8 * u, 8 * v, 8, seed) +
    0.3 * noise(16 * u, 16 * v, 16, seed) +
    0.16 * noise(32 * u, 32 * v, 32, seed);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const u = i / size,
        v = j / size,
        h = relief(u, v),
        k = 4 * (j * size + i);
      bytes[k] = T.MathUtils.clamp(
        128 + 3600 * (h - relief(u + 1 / size, v)),
        0,
        255,
      );
      bytes[k + 1] = T.MathUtils.clamp(
        128 + 3600 * (h - relief(u, v + 1 / size)),
        0,
        255,
      );
      bytes[k + 2] = h * 255;
      // A ridge mask traces the edges of foam cells; alpha stores coverage.
      bytes[k + 3] =
        255 * (1 - T.MathUtils.smoothstep(Math.abs(h - 0.52), 0.012, 0.11));
    }
  const t = new T.DataTexture(bytes, size, size);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
