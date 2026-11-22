import test from "node:test";
import assert from "node:assert/strict";
import { bakeSection, frames, samples, sectionWidth } from "./profile.ts";

const atlas = bakeSection();
function slice(row) {
  const lo = Math.floor(row),
    hi = Math.ceil(row),
    w = row - lo;
  return Array.from({ length: samples }, (_, i) => {
    const k = (lo * samples + i) * 4,
      l = (hi * samples + i) * 4;
    return [
      (i / (samples - 1) - 0.5) * sectionWidth +
        atlas[k] * (1 - w) +
        atlas[l] * w,
      atlas[k + 1] * (1 - w) + atlas[l + 1] * w,
    ];
  });
}
function side(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

test("the atlas returns to rest at the ends of time and space", () => {
  assert.ok(atlas.every(Number.isFinite));
  for (let j = 0; j < frames; j++)
    for (let i = 0; i < samples; i++) {
      if (j !== 0 && j !== frames - 1 && i !== 0 && i !== samples - 1) continue;
      const k = (j * samples + i) * 4;
      assert.ok(Math.abs(atlas[k]) < 1e-6 && Math.abs(atlas[k + 1]) < 1e-6);
    }
});
test("the curling lip turns back without crossing the inner wall", () => {
  const curl = slice(0.53 * (frames - 1));
  assert.ok(curl.some(([x], i) => i > 0 && x < curl[i - 1][0]));
  for (let j = 0; j <= frames - 1; j += 0.5) {
    const curve = slice(j);
    for (let i = 1; i < samples; i++)
      for (let k = i + 2; k < samples; k++) {
        const a = curve[i - 1],
          b = curve[i],
          c = curve[k - 1],
          d = curve[k];
        const crosses =
          side(a, b, c) * side(a, b, d) < 0 &&
          side(c, d, a) * side(c, d, b) < 0;
        if (crosses)
          assert.fail(
            "Profile crossing at atlas row " +
              j +
              ", segments " +
              i +
              " and " +
              k,
          );
      }
  }
});
