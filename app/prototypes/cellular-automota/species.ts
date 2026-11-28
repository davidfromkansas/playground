import type { Species, Voxel } from "./types";

/** Tiny builder for plant models in plant-local voxel units. */
function build(
  make: (put: (x: number, y: number, z: number, c: number) => void) => void,
) {
  const cells = new Map<string, Voxel>();
  make((x, y, z, c) => {
    if (Math.abs(x) > 2 || Math.abs(z) > 2 || y < 0) return;
    cells.set(x + "," + y + "," + z, [x, y, z, c]);
  });
  return [...cells.values()].sort((a, b) => a[1] - b[1]);
}
const ring = (r2: number, fn: (x: number, z: number) => void) => {
  for (let x = -2; x <= 2; x++)
    for (let z = -2; z <= 2; z++) if (x * x + z * z <= r2) fn(x, z);
};
/** Stable pseudo-random pick so models look organic but never change. */
const pick = (x: number, y: number, z: number, list: number[]) =>
  list[
    Math.abs((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) % list.length
  ];

const STEM = 0x3f8f2f;
const LEAF = 0x55a83c;
/** A green stem with two leaves, shared by most flowers. */
function stem(
  put: (x: number, y: number, z: number, c: number) => void,
  h: number,
) {
  for (let y = 0; y < h; y++) put(0, y, 0, STEM);
  put(1, 1, 0, LEAF);
  put(2, 2, 0, LEAF);
  put(-1, 2, 1, LEAF);
  put(-1, 3, 2, LEAF);
}

export const species: Species[] = [
  {
    name: "Sunflower",
    voxels: build((put) => {
      stem(put, 5);
      for (let x = -2; x <= 2; x++)
        for (let z = -2; z <= 2; z++) {
          const edge = Math.max(Math.abs(x), Math.abs(z)) === 2;
          if (edge && Math.abs(x) === 2 && Math.abs(z) === 2) continue;
          put(
            x,
            5,
            z,
            edge ? pick(x, 5, z, [0xffc61a, 0xffd93b, 0xf5b400]) : 0x6b4220,
          );
        }
      put(0, 6, 0, 0x4a2c14);
      put(1, 6, 0, 0x5a3818);
      put(0, 6, 1, 0x5a3818);
    }),
  },
  {
    name: "Tulip",
    voxels: build((put) => {
      stem(put, 4);
      ring(2, (x, z) => put(x, 4, z, 0xd81b7a));
      ring(
        2,
        (x, z) => (x || z) && put(x, 5, z, pick(x, 5, z, [0xff3d9a, 0xf0288a])),
      );
      put(0, 5, 0, 0xffe066);
      for (const [x, z] of [
        [-1, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
      ])
        put(x, 6, z, 0xff6fb5);
    }),
  },
  {
    name: "Rose",
    voxels: build((put) => {
      stem(put, 4);
      ring(5, (x, z) => put(x, 4, z, pick(x, 4, z, [0xc8102e, 0xb00b26])));
      ring(2, (x, z) => put(x, 5, z, pick(x, 5, z, [0xe0193a, 0xd41436])));
      put(0, 6, 0, 0xff3355);
      put(1, 6, 0, 0xe0193a);
      put(0, 5, 0, 0x8a0a1f);
      for (const [x, z] of [
        [2, 1],
        [-2, -1],
        [1, -2],
        [-1, 2],
      ])
        put(x, 5, z, 0xff4d6a);
    }),
  },
  {
    name: "Forget-me-not",
    voxels: build((put) => {
      const heads: [number, number, number][] = [
        [-1, -1, 3],
        [1, 0, 4],
        [-1, 1, 2],
        [1, -2, 2],
      ];
      for (const [x, z, h] of heads) {
        for (let y = 0; y < h; y++) put(x, y, z, STEM);
        put(x, h, z, 0xffe14d);
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          put(
            x + dx,
            h,
            z + dz,
            pick(x + dx, h, z + dz, [0x4aa8ff, 0x6bbaff, 0x3b8fea]),
          );
      }
    }),
  },
  {
    name: "Lavender",
    voxels: build((put) => {
      ring(1, (x, z) => put(x, 0, z, 0x6f9a5a));
      const stalks: [number, number, number][] = [
        [-1, 0, 3],
        [1, -1, 4],
        [0, 1, 2],
        [1, 1, 3],
        [-1, -2, 2],
        [0, -1, 4],
      ];
      for (const [x, z, h] of stalks) {
        for (let y = 1; y < h; y++) put(x, y, z, 0x5f8a4a);
        for (let y = h; y < h + 3; y++)
          put(x, y, z, pick(x, y, z, [0x9b5de5, 0xb57cf0, 0x8447d6]));
      }
    }),
  },
  {
    name: "Daisy",
    voxels: build((put) => {
      stem(put, 4);
      for (const [x, z] of [
        [0, 2],
        [0, -2],
        [2, 0],
        [-2, 0],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [2, 1],
        [-2, -1],
        [1, -2],
        [-1, 2],
      ])
        put(x, 4, z, pick(x, 4, z, [0xffffff, 0xf4f1ea]));
      for (const [x, z] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
        [0, 0],
      ])
        put(x, 4, z, 0xffc21a);
      put(0, 5, 0, 0xf5a300);
    }),
  },
  {
    name: "Poppy",
    voxels: build((put) => {
      stem(put, 4);
      ring(5, (x, z) =>
        put(x, 4, z, pick(x, 4, z, [0xff4a1c, 0xf23a10, 0xff6a2e])),
      );
      for (const [x, z] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
        [2, 1],
        [-2, -1],
        [1, 2],
        [-1, -2],
      ])
        put(x, 5, z, 0xff5a24);
      put(0, 5, 0, 0x1d1a24);
      put(0, 4, 0, 0x2b2733);
      put(1, 5, 0, 0x2b2733);
    }),
  },
  {
    name: "Lily",
    voxels: build((put) => {
      stem(put, 4);
      for (const [x, z] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]) {
        put(x, 5, z, 0xffb3d9);
        put(x / 2, 4, z / 2, 0xff8cc6);
      }
      for (const [x, z] of [
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ])
        put(x, 4, z, 0xfff0f7);
      put(0, 4, 0, 0xe0457b);
      put(0, 5, 0, 0xffd23f);
      put(1, 6, 0, 0xff9f1c);
      put(-1, 6, 0, 0xff9f1c);
    }),
  },
  {
    name: "Hydrangea",
    voxels: build((put) => {
      stem(put, 3);
      const blues = [0x7b8cff, 0x9aa6ff, 0x6a7bf0, 0xb3a0ff];
      ring(5, (x, z) => put(x, 3, z, pick(x, 3, z, blues)));
      ring(8, (x, z) => put(x, 4, z, pick(x, 4, z, blues)));
      ring(2, (x, z) => put(x, 5, z, pick(x, 5, z, blues)));
    }),
  },
  {
    name: "Marigold",
    voxels: build((put) => {
      stem(put, 4);
      const golds = [0xff9800, 0xffb300, 0xf57c00, 0xffc107];
      ring(4, (x, z) => put(x, 4, z, pick(x, 4, z, golds)));
      ring(2, (x, z) => put(x, 5, z, pick(x, 5, z, golds)));
      put(0, 6, 0, 0xffd54f);
    }),
  },
];
export const maxVoxels = Math.max(...species.map((s) => s.voxels.length));
